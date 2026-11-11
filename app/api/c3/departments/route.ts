import {NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {isC3SameOrigin} from "@/lib/c3/invitations";

export async function GET(req:Request){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return NextResponse.json({error:"No autorizado."},{status:403});
 const campaignId=new URL(req.url).searchParams.get("campaignId")||"";
 if(!/^[0-9a-f-]{36}$/i.test(campaignId))return NextResponse.json({error:"Campaña inválida."},{status:400});
 const db=createAdminClient();
 const {data,error}=await db.from("c3_departments").select("id,name").eq("campaign_id",campaignId).order("name");
 if(error)return NextResponse.json({error:"No se pudieron cargar los departamentos."},{status:500});
 return NextResponse.json({departments:data||[]},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:Request){
 if(!isC3SameOrigin(req))return NextResponse.json({error:"Origen no permitido."},{status:403});
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return NextResponse.json({error:"No autorizado."},{status:403});
 let data:{campaignId?:string;name?:string};
 try{data=await req.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400})}
 const campaignId=data.campaignId||"",name=String(data.name||"").replace(/\s+/g," ").trim();
 if(!/^[0-9a-f-]{36}$/i.test(campaignId)||name.length<2||name.length>80)
 return NextResponse.json({error:"Indica una campaña y un nombre de departamento (2–80 caracteres)."}, {status:400});
 const db=createAdminClient();
 const {data:campaign}=await db.from("c3_campaigns").select("id,status").eq("id",campaignId).maybeSingle();
 if(!campaign||!["draft","open"].includes(campaign.status))
 return NextResponse.json({error:"La campaña no permite nuevos departamentos."},{status:409});
 const {count}=await db.from("c3_departments").select("id",{count:"exact",head:true}).eq("campaign_id",campaignId);
 if((count||0)>=80)return NextResponse.json({error:"Límite de 80 departamentos por campaña."},{status:409});
 const {data:department,error}=await db.from("c3_departments").insert({campaign_id:campaignId,name}).select("id,name").single();
 if(error)return NextResponse.json({error:error.code==="23505"?"Ese departamento ya existe.":"No se pudo guardar el departamento."},{status:409});
 return NextResponse.json({department},{headers:{"Cache-Control":"private, no-store"}});
}
