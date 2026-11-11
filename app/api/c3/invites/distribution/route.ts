import {NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {isC3SameOrigin} from "@/lib/c3/invitations";

export async function POST(req:Request){
 if(!isC3SameOrigin(req))return NextResponse.json({error:"Origen no permitido."},{status:403});
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return NextResponse.json({error:"No autorizado."},{status:403});
 let data:{campaignId?:string;inviteId?:string;shared?:boolean};
 try{data=await req.json()}catch{return NextResponse.json({error:"Solicitud inválida."},{status:400})}
 if(!data.campaignId||!data.inviteId||
 !/^[0-9a-f-]{36}$/i.test(data.campaignId)||!/^[0-9a-f-]{36}$/i.test(data.inviteId)||
 typeof data.shared!=="boolean")return NextResponse.json({error:"Datos inválidos."},{status:400});
 const db=createAdminClient();
 const {data:changed,error}=await db.rpc("c3_set_invite_shared",{
  p_campaign_id:data.campaignId,p_invite_id:data.inviteId,p_shared:data.shared
 });
 if(error||!changed)return NextResponse.json({error:"No fue posible actualizar el seguimiento."},{status:409});
 return NextResponse.json({ok:true,shared:data.shared},{headers:{"Cache-Control":"private, no-store"}});
}
