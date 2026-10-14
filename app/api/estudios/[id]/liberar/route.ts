import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
type Params={params:Promise<{id:string}>};
export async function POST(req:NextRequest,{params}:Params){
 const user=await getCurrentAppUser();
 if(user?.role!=="super_admin")return NextResponse.json({error:"Solo superadministrador."},{status:403});
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))return NextResponse.json({error:"Expediente inválido."},{status:400});
 let body:{action?:string};try{body=await req.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400})}
 if(!["release","revoke","review"].includes(body.action||""))return NextResponse.json({error:"Acción inválida."},{status:400});
 const db=createAdminClient();
 const {error}=await db.rpc("ese_set_delivery_state",{p_case_id:id,p_actor_id:user.userId,p_action:body.action});
 if(error)return NextResponse.json({error:error.message},{status:409});
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
