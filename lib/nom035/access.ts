import {getCurrentAppUser,type CurrentAppUser} from "@/lib/app-auth";

/**
 * Only active FactoRH admins or authenticated client accounts belonging
 * to the specific organization may view/edit that organization's NOM-035 center.
 * Always validate again server-side even if the UI hides controls.
 */
export async function requireNom035User():Promise<CurrentAppUser>{
 const user=await getCurrentAppUser();
 if(!user||!(user.role==="super_admin"||
  user.role==="client"&&Boolean(user.organizationId)))
  throw Error("No tienes permiso para administrar NOM-035.");
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
export const NOM035_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function nom035ValidDate(value:string):string|null{
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("Fecha inválida.");
 const d=new Date(value+"T12:00:00.000Z");
 if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error("Fecha inválida.");
 return value;
}
