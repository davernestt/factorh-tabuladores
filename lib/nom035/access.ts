import {getCurrentAppUser,type CurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";

/** Privileged evaluation access is checked on the server for every organization. */
export async function hasNom035Subscription(user:CurrentAppUser):Promise<boolean>{
 if(user.role==="super_admin")return true;
 if(user.role!=="client"||user.clientAccessLevel!=="administrator"||!user.organizationId)return false;
 const db=createAdminClient();
 const today=new Date().toISOString().slice(0,10);
 const {data,error}=await db.from("organization_module_subscriptions")
  .select("status,starts_on,ends_on")
  .eq("organization_id",user.organizationId)
  .eq("module_key","nom035").maybeSingle();
 if(error||!data||!["active","trial"].includes(data.status))return false;
 if(data.starts_on&&data.starts_on>today)return false;
 if(data.ends_on&&data.ends_on<today)return false;
 return true;
}
export async function requireNom035User():Promise<CurrentAppUser>{
 const user=await getCurrentAppUser();
 if(!user||!await hasNom035Subscription(user))
  throw Error("Tu organización no tiene un piloto NOM-035 vigente o autorizado.");
 return user;
}
export function canNom035Organization(user:CurrentAppUser,organizationId:string){
 return user.role==="super_admin"||
   user.role==="client"&&user.organizationId===organizationId;
}
export function requireNom035Organization(user:CurrentAppUser,organizationId:string){
 if(!canNom035Organization(user,organizationId))
  throw Error("El centro no pertenece a la organización de tu cuenta.");
}
export const NOM035_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function nom035ValidDate(value:string):string|null{
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("Fecha inválida.");
 const d=new Date(value+"T12:00:00.000Z");
 if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error("Fecha inválida.");
 return value;
}
