import { c3CollectAlerts, c3SortAlerts, c3AlertCounts, type C3AlertCampaign, type C3AlertTask } from "@/lib/c3/action-alerts";

export type NotificationSettings={
  organization_id:string;
  recipient_emails:string[];
  deadline_enabled:boolean;
  weekly_enabled:boolean;
  weekly_weekday:number;
};

export function c3CurrentDateInMexico(){
  const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Mexico_City",day:"2-digit",month:"2-digit",year:"numeric"})
    .formatToParts(new Date());
  const v=(x:string)=>p.find(z=>z.type===x)?.value||"";
  return v("year")+"-"+v("month")+"-"+v("day");
}
export function c3IsScheduledWeekday(today:string,weekday:number){
  // ISO weekday: Monday=1 ... Sunday=7
  const d=new Date(today+"T12:00:00Z").getUTCDay();
  return (d===0?7:d)===weekday;
}
export function c3DueSummary(
  orgId:string,campaigns:C3AlertCampaign[],tasks:C3AlertTask[],today:string,
  kind:"daily_deadlines"|"weekly_digest"
){
  const owned=campaigns.filter(c=>c.organizationId===orgId);
  const alerts=c3SortAlerts(c3CollectAlerts(owned,tasks,today));
  const relevant=kind==="daily_deadlines"
    ?alerts.filter(a=>a.kind==="overdue"||a.kind==="today"||a.kind==="upcoming")
    :alerts.filter(a=>a.kind!=="normal"||a.missingOwner);
  const counts=c3AlertCounts(relevant);
  const title=kind==="daily_deadlines"?"Alertas de compromisos":"Resumen semanal de seguimiento";
  const organization=owned[0]?.organizationName||"Empresa";
  const lines=[
    "FactoRH C3 PRO · "+title,
    "Empresa: "+organization,
    "Corte: "+today+" (hora de Guadalajara)",
    "Actividades en revisión: "+counts.active,
    "Vencidas: "+counts.overdue+" | Vencen hoy: "+counts.today+
      " | Próximos 7 días: "+counts.upcoming,
    "Sin fecha: "+counts.noDate+" | Sin responsable: "+counts.withoutOwner,
    "",
    "COMPROMISOS"
  ];
  for(const [i,a] of relevant.slice(0,25).entries()){
    const notice=a.kind==="overdue"?"VENCIDA":a.kind==="today"?"HOY":
      a.kind==="upcoming"?"PRÓXIMA":a.kind==="no_date"?"SIN FECHA":"PENDIENTE";
    lines.push((i+1)+". ["+notice+"] "+a.title);
    lines.push("   Campaña: "+a.campaign.name);
    lines.push("   Responsable/área: "+(a.owner||"POR ASIGNAR"));
    lines.push("   Compromiso: "+(a.dueOn||"SIN FECHA")+" · Etapa "+a.phaseDays+" días");
  }
  if(relevant.length>25)lines.push("... y "+(relevant.length-25)+" compromisos más en FactoRH.");
  lines.push("", "Este es un resumen administrativo: no incluye respuestas individuales ni resultados confidenciales de las encuestas.");
  return {
    organization,title,counts,items:relevant,subject:"FactoRH C3 PRO | "+title+" | "+organization,
    text:lines.join("\n")
  };
}
export function c3Esc(s:string){
  return s.replace(/[&<>"']/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]||ch));
}
export function c3SummaryHtml(text:string){
  return '<!doctype html><html lang="es"><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#243044">'+
    '<div style="max-width:660px;margin:20px auto;padding:28px;background:#fff;border-top:5px solid #ea580c;border-radius:14px">'+
    '<div style="font-size:22px;font-weight:800;color:#ea580c">FactoRH · C3 PRO</div>'+
    '<pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.7 Arial,sans-serif">'+c3Esc(text)+'</pre>'+
    '</div></body></html>';
}
