import {getCurrentAppUser,type CurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {hasStaffPermission} from "@/lib/staff-permissions";

export async function has360Access(user:CurrentAppUser|null):Promise<boolean>{
 if(!user)return false;
 if(user.role==="super_admin"||await hasStaffPermission(user,"feedback360","view"))return true;
 if(user.role!=="client"||user.clientAccessLevel!=="administrator"||!user.organizationId)return false;
 const db=createAdminClient();
 const {data,error}=await db.from("organization_module_subscriptions")
  .select("status,starts_on,ends_on").eq("organization_id",user.organizationId)
  .eq("module_key","feedback360").maybeSingle();
 if(error||!data||!["trial","active"].includes(data.status))return false;
 const today=new Date().toISOString().slice(0,10);
 return (!data.starts_on||data.starts_on<=today)&&(!data.ends_on||data.ends_on>=today);
}
export async function authorized360User():Promise<CurrentAppUser|null>{
 const user=await getCurrentAppUser();
 return await has360Access(user)?user:null;
}
export function can360Organization(user:CurrentAppUser,orgId:string):boolean{
 return user.role!=="client"||(user.organizationId===orgId);
}
export async function trial360Limit(user:CurrentAppUser):Promise<number|null>{
 if(user.role!=="client")return null;
 if(!user.organizationId)return 0;
 const db=createAdminClient();
 const {data}=await db.from("organization_module_subscriptions")
  .select("status").eq("organization_id",user.organizationId)
  .eq("module_key","feedback360").maybeSingle();
 return data?.status==="trial"?1:null;
}
