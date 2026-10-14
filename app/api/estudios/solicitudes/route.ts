import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";

const allowed=new Set(["express","esencial","integral","ejecutivo","referencias_laborales","investigacion_laboral"]);
type Payload={
 service_key?:unknown;organization_id?:unknown;
 full_name?:unknown;phone?:unknown;curp?:unknown;home_address?:unknown;
 position_name?:unknown;person_relationship?:unknown;privacy_acknowledged?:unknown;
};
function field(v:unknown,max:number){return typeof v==="string"?v.trim().slice(0,max+1):""}

export async function POST(req:NextRequest){
 const user=await getCurrentAppUser();
 if(!user||!["client","super_admin"].includes(user.role))
  return NextResponse.json({error:"No tienes permiso para solicitar estudios."},{status:403});
 const origin=req.headers.get("origin");
 if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:"Origen no permitido."},{status:403});
 const len=Number(req.headers.get("content-length")||0);
 if(len>12000)return NextResponse.json({error:"Solicitud demasiado extensa."},{status:413});

 let body:Payload;
 try{body=await req.json()}catch{return NextResponse.json({error:"Datos inválidos."},{status:400})}
 const service=field(body.service_key,50);
 const fullName=field(body.full_name,180).replace(/\s+/g," ");
 const phone=field(body.phone,25).replace(/[\s\-().]/g,"");
 const curp=field(body.curp,18).toUpperCase();
 const address=field(body.home_address,500);
 const position=field(body.position_name,180);
 const relationship=field(body.person_relationship,20);
 const orgId=user.role==="super_admin"?field(body.organization_id,36):user.organizationId||"";

 if(!allowed.has(service))return NextResponse.json({error:"Selecciona un servicio válido."},{status:400});
 if(fullName.length<5||fullName.length>180||!/^[\p{L}\p{M}. '\-]+$/u.test(fullName))
  return NextResponse.json({error:"Escribe el nombre completo de la persona."},{status:400});
 if(!/^\+?\d{10,15}$/.test(phone))return NextResponse.json({error:"Captura un teléfono válido de 10 a 15 dígitos."},{status:400});
 if(!/^[A-Z&Ñ]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp))
  return NextResponse.json({error:"Revisa la CURP: debe contener 18 caracteres y respetar su formato."},{status:400});
 if(address.length<12||address.length>500)return NextResponse.json({error:"Escribe el domicilio completo."},{status:400});
 if(position.length<2||position.length>180)return NextResponse.json({error:"Indica el puesto de ingreso o actual."},{status:400});
 if(!["candidate","employee"].includes(relationship))return NextResponse.json({error:"Selecciona si es candidato o empleado actual."},{status:400});
 if(body.privacy_acknowledged!==true)
  return NextResponse.json({error:"Debes confirmar que la persona recibió el aviso de privacidad y autorizó el tratamiento y la transmisión aplicables."},{status:400});
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId))
  return NextResponse.json({error:"Selecciona una empresa válida."},{status:400});

 // La captura nominativa queda deshabilitada hasta publicar el aviso/consentimiento,
 // capacitar a los clientes y verificar aislamientos entre organizaciones.
 if(process.env.FACTORH_ESE_PERSONAL_REQUESTS_ENABLED!=="true")
  return NextResponse.json({error:"Captura de datos personales todavía en preparación. Usa la vista de demostración; FactoRH habilitará solicitudes reales tras validar privacidad y permisos."},{status:503});

 const db=createAdminClient();
 const {data:org}=await db.from("organizations").select("id,active").eq("id",orgId).maybeSingle();
 if(!org?.active)return NextResponse.json({error:"La empresa no está activa."},{status:403});

 const {data:request,error:requestError}=await db.from("ese_service_requests")
   .insert({organization_id:orgId,service_key:service,quantity:1,requested_by:user.userId})
   .select("id").single();
 if(requestError||!request)return NextResponse.json({error:"No fue posible registrar la solicitud."},{status:500});
 const {error:subjectError}=await db.from("ese_request_subjects").insert({
   request_id:request.id,full_name:fullName,phone,curp,home_address:address,
   position_name:position,person_relationship:relationship,
   privacy_acknowledged:true,submitted_by:user.userId
 });
 if(subjectError){
   await db.from("ese_service_requests").delete().eq("id",request.id);
   return NextResponse.json({error:"No fue posible registrar el expediente. Inténtalo nuevamente."},{status:500});
 }
 return NextResponse.json({ok:true,id:request.id},{status:201,headers:{"Cache-Control":"private, no-store"}});
}
