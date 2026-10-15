import {NextRequest,NextResponse} from "next/server";
import {authorized360User,can360Organization} from "@/lib/feedback360-access";
import {createAdminClient} from "@/lib/supabase/admin";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:NextRequest){
 const user=await authorized360User();
 if(!user)return NextResponse.json({error:"No tienes acceso al 360°."},{status:403});
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:"Origen no autorizado."},{status:403});
 if(Number(request.headers.get("content-length")||0)>4500)return NextResponse.json({error:"Solicitud demasiado extensa."},{status:413});
 let body:Record<string,unknown>;
 try{body=await request.json()}catch{return NextResponse.json({error:"Datos inválidos."},{status:400})}
 const text=(name:string,max:number)=>typeof body[name]==="string"?String(body[name]).trim().slice(0,max+1):"";
 const org=user.role==="client"?user.organizationId||"":text("organization_id",40);
 const first=text("first_name",100),last=text("last_name",100),email=text("email",254).toLowerCase(),job=text("job_title",160);
 const departmentId=text("department_id",40);
 if(!uuid.test(org)||!can360Organization(user,org))return NextResponse.json({error:"Empresa no autorizada."},{status:403});
 if(first.length<2||first.length>100||last.length>100||job.length>160)return NextResponse.json({error:"Revisa nombre y puesto."},{status:400});
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:"Correo inválido."},{status:400});
 const db=createAdminClient();
 const {data:company}=await db.from("organizations").select("id").eq("id",org).eq("active",true).maybeSingle();
 if(!company)return NextResponse.json({error:"Empresa no activa."},{status:403});
 if(!uuid.test(departmentId))return NextResponse.json({error:"Selecciona un departamento para la persona."},{status:400});
 const {data:department}=await db.from("organization_departments").select("id,name").eq("id",departmentId).eq("organization_id",org).eq("active",true).maybeSingle();
 if(!department)return NextResponse.json({error:"El departamento no pertenece a esta empresa."},{status:400});
 const {data,error}=await db.from("people").insert({
  organization_id:org,first_name:first,last_name:last||null,email:email||null,job_title:job||null,department_id:department.id,area:department.name,active:true
 }).select("id,organization_id,first_name,last_name,email,job_title,department_id,area").single();
 if(error||!data)return NextResponse.json({error:"No se pudo crear a la persona."},{status:500});
 return NextResponse.json({ok:true,person:data},{status:201,headers:{"Cache-Control":"no-store"}});
}
