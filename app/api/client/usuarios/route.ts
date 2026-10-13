import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getCurrentAppUser} from "@/lib/app-auth";

export async function POST(request:NextRequest){
 const actor=await getCurrentAppUser();
 if(!actor||actor.role!=="client"||!actor.organizationId)return NextResponse.json({error:"No autorizado."},{status:403});
 const db=createAdminClient();
 const {data:access,error:accessError}=await db.from("app_users").select("client_access_level")
   .eq("user_id",actor.userId).eq("organization_id",actor.organizationId).eq("active",true).single();
 if(accessError||access?.client_access_level!=="administrator")return NextResponse.json({error:"Sólo el administrador de empresa puede gestionar colaboradores."},{status:403});
 let body:{email?:string;display_name?:string};
 try{body=await request.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400})}
 const email=String(body.email||"").trim().toLowerCase(),name=String(body.display_name||"").trim();
 if(!name||name.length>120||!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"Captura nombre y correo válidos."},{status:400});
 const {data:existing}=await db.from("app_users").select("user_id").eq("email",email).maybeSingle();
 if(existing)return NextResponse.json({error:"Ya existe una cuenta con ese correo."},{status:409});
 const {data:link,error:linkError}=await db.auth.admin.generateLink({type:"invite",email});
 if(linkError||!link.user||!link.properties?.hashed_token)return NextResponse.json({error:"No se pudo crear la invitación."},{status:400});
 const {error:insertError}=await db.from("app_users").insert({user_id:link.user.id,email,display_name:name,role:"client",client_access_level:"collaborator",organization_id:actor.organizationId,active:true});
 if(insertError){await db.auth.admin.deleteUser(link.user.id);return NextResponse.json({error:"No se pudo registrar la cuenta."},{status:500})}
 const url=`${request.nextUrl.origin}/auth/confirm?token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=invite&next=${encodeURIComponent("/auth/update-password")}`;
 return NextResponse.json({ok:true,email,invite_url:url},{headers:{"Cache-Control":"no-store"}});
}

export async function PATCH(request:NextRequest){
 const actor=await getCurrentAppUser();
 if(!actor||actor.role!=="client"||!actor.organizationId)return NextResponse.json({error:"No autorizado."},{status:403});
 const db=createAdminClient();
 const {data:access}=await db.from("app_users").select("client_access_level").eq("user_id",actor.userId).eq("organization_id",actor.organizationId).eq("active",true).single();
 if(access?.client_access_level!=="administrator")return NextResponse.json({error:"No autorizado."},{status:403});
 let body:{user_id?:string;active?:boolean};
 try{body=await request.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400})}
 if(typeof body.active!=="boolean"||!body.user_id||body.user_id===actor.userId)return NextResponse.json({error:"Operación inválida."},{status:400});
 const {data,error}=await db.from("app_users").update({active:body.active,updated_at:new Date().toISOString()})
  .eq("user_id",body.user_id).eq("organization_id",actor.organizationId).eq("role","client").eq("client_access_level","collaborator").select("user_id").maybeSingle();
 if(error||!data)return NextResponse.json({error:"No fue posible actualizar al colaborador."},{status:400});
 return NextResponse.json({ok:true});
}
