import "server-only";
import type {CurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";

/** Access check shared by client navigation and ESE pages.
 * Internal FactoRH users use explicit staff grants instead.
 */
export async function hasClientEseSubscription(user:CurrentAppUser|null):Promise<boolean>{
 if(!user||user.role!=="client"||!user.organizationId)return false;
 const db=createAdminClient();
 const today=new Date().toISOString().slice(0,10);
 const {data,error}=await db.from("organization_module_subscriptions")
   .select("status,starts_on,ends_on")
   .eq("organization_id",user.organizationId)
   .eq("module_key","studies")
   .in("status",["active","trial"]);
 if(error)return false;
 return (data||[]).some(s=>
   (!s.starts_on||s.starts_on<=today)&&(!s.ends_on||s.ends_on>=today));
}
