import {createAdminClient} from "@/lib/supabase/admin";

/**
 * Verifica los requisitos mínimos para habilitar un piloto real.
 * La verificación se repite en el servidor para impedir activaciones
 * desde solicitudes modificadas o formularios desactualizados.
 */
export async function requireNom035PilotReadiness(organizationId:string){
 const db=createAdminClient();
 const [clients,centers]=await Promise.all([
  db.from("app_users").select("id",{count:"exact",head:true})
   .eq("organization_id",organizationId).eq("role","client").eq("active",true),
  db.from("nom035_work_centers").select("id",{count:"exact",head:true})
   .eq("organization_id",organizationId).eq("active",true)
 ]);
 if(clients.error||centers.error)
  throw Error("No se pudieron comprobar los requisitos del piloto.");
 if(!clients.count)
  throw Error("Antes de habilitar NOM-035, crea un usuario cliente activo para la empresa.");
 if(!centers.count)
  throw Error("Antes de habilitar NOM-035, registra al menos un centro de trabajo activo.");
}
