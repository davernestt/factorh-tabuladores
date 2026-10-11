"use server";
import { revalidatePath } from "next/cache";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validEmail=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export async function updateC3NotificationSettings(formData:FormData){
  const user=await getCurrentAppUser();
  if(!user||user.role!=="super_admin")throw Error("Solo un administrador puede configurar envíos C3.");
  const organizationId=String(formData.get("organization_id")||"");
  if(!uuid.test(organizationId))throw Error("Empresa inválida.");
  const db=createAdminClient();
  const {data:org,error:orgError}=await db.from("organizations").select("id").eq("id",organizationId).eq("active",true).maybeSingle();
  if(orgError||!org)throw Error("Empresa no disponible.");
  const emails=String(formData.get("recipient_emails")||"").split(/[\n,;]+/)
    .map(x=>x.trim().toLowerCase()).filter(Boolean);
  const distinct=[...new Set(emails)];
  const deadlineEnabled=formData.get("deadline_enabled")==="on";
  const weeklyEnabled=formData.get("weekly_enabled")==="on";
  const weekday=Number(formData.get("weekly_weekday")||5);
  if(distinct.length>3 || distinct.some(e=>!validEmail.test(e)||e.length>254)){
    throw Error("Indica hasta tres direcciones de correo válidas.");
  }
  if((deadlineEnabled||weeklyEnabled)&&distinct.length===0)throw Error("Configura al menos un destinatario antes de activar avisos.");
  if(!Number.isInteger(weekday)||weekday<1||weekday>5)throw Error("Día semanal inválido.");
  const {error}=await db.from("c3_notification_settings").upsert({
    organization_id:organizationId,recipient_emails:distinct,
    deadline_enabled:deadlineEnabled,weekly_enabled:weeklyEnabled,
    weekly_weekday:weekday
  },{onConflict:"organization_id"});
  if(error)throw Error("No se pudo guardar la configuración: "+error.message);
  revalidatePath("/protected/c3/notificaciones");
}
