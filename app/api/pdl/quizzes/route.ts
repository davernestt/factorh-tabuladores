import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { getCurrentAppUser } from "@/lib/app-auth";
import { hasStaffPermission } from "@/lib/staff-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorize(operation:"view"|"operate") {
  const user=await getCurrentAppUser();
  if(!user || (user.role!=="super_admin" && !await hasStaffPermission(user,"pdl",operation))) return null;
  if(user.role==="client")return null;
  return user;
}
const bad=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function GET(){
  const user=await authorize("view");if(!user)return bad("Sin autorización",403);
  const db=createAdminClient();
  const [catalog,invites,companies]=await Promise.all([
    db.from("pdl_quiz_catalog").select("quiz_id,version,title,difficulty,passing_score,max_attempts,published").order("title"),
    db.from("pdl_quiz_invites").select("id,organization_id,quiz_id,participant_name,participant_email,active,created_at,expires_at,max_attempts").order("created_at",{ascending:false}).limit(150),
    db.from("organizations").select("id,name").eq("active",true).order("name")
  ]);
  if(catalog.error||invites.error||companies.error)return bad("No fue posible consultar los quizzes",500);
  const ids=(invites.data??[]).map(x=>x.id);
  const attempts=ids.length?await db.from("pdl_quiz_attempts").select("invite_id,attempt_number,result,submitted_at").in("invite_id",ids):{data:[],error:null};
  if(attempts.error)return bad("No fue posible consultar resultados",500);
  const results=(attempts.data??[]).map(x=>({invite_id:x.invite_id,attempt_number:x.attempt_number,score:typeof x.result?.score==="number"?x.result.score:null,passed:x.result?.passed===true,submitted_at:x.submitted_at}));
  return NextResponse.json({quizzes:catalog.data??[],invites:invites.data??[],organizations:companies.data??[],results},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:NextRequest){
  const user=await authorize("operate");if(!user)return bad("Sin autorización",403);
  const raw=await request.json().catch(()=>null);
  if(!raw||typeof raw!=="object")return bad("Datos inválidos");
  const organization_id=String(raw.organization_id??"").trim();
  const quiz_id=String(raw.quiz_id??"").trim();
  const participant_name=String(raw.participant_name??"").trim();
  const participant_email=String(raw.participant_email??"").trim().toLowerCase()||null;
  if(!/^[0-9a-f-]{36}$/i.test(organization_id)||!["cultura","comunicacion","conversaciones","emociones"].includes(quiz_id)||participant_name.length<2||participant_name.length>150)return bad("Revisa empresa, quiz y nombre");
  if(participant_email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant_email)||participant_email.length>254))return bad("Correo inválido");
  const db=createAdminClient();
  const [org,quiz]=await Promise.all([
    db.from("organizations").select("id").eq("id",organization_id).eq("active",true).maybeSingle(),
    db.from("pdl_quiz_catalog").select("version,published,max_attempts").eq("quiz_id",quiz_id).eq("version",1).maybeSingle()
  ]);
  if(org.error||quiz.error)return bad("No se pudo validar la invitación",500);
  if(!org.data)return bad("Empresa no disponible");
  if(!quiz.data?.published)return bad("Publica y valida el cuestionario antes de enviar invitaciones");
  const token=randomBytes(32).toString("hex");
  const token_hash=createHash("sha256").update(token).digest("hex");
  const {error}=await db.from("pdl_quiz_invites").insert({
    organization_id,quiz_id,quiz_version:quiz.data.version,participant_name,
    participant_email,token_hash,max_attempts:Math.min(2,quiz.data.max_attempts),
    created_by:user.userId,active:true
  });
  if(error)return bad("No fue posible crear la invitación",500);
  // Always issue invitations using the stable operational branch alias, never
  // a per-commit Preview deployment URL. A future domain can override this
  // through PDL_PUBLIC_ORIGIN after validating redirects for existing links.
  const canonicalOrigin=process.env.PDL_PUBLIC_ORIGIN||"https://factorh-evaluaciones-git-nom035-v1-davidcarrillorh-5996.vercel.app";
  return NextResponse.json({url:`${canonicalOrigin}/pdl/quiz/${token}`},{status:201,headers:{"Cache-Control":"no-store"}});
}
