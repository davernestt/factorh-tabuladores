export type C3AlertCampaign={
  id:string;
  name:string;
  organizationId:string;
  organizationName:string;
  status:string;
};
export type C3AlertTask={
  id:string;
  campaignId:string;
  title:string;
  owner:string;
  phaseDays:number;
  dimensionCode:string|null;
  priority:string;
  status:string;
  dueOn:string|null;
};
export type C3AlertKind="overdue"|"today"|"upcoming"|"no_date"|"normal";
export type C3AlertItem=C3AlertTask&{
  campaign:C3AlertCampaign;
  kind:C3AlertKind;
  daysUntilDue:number|null;
  missingOwner:boolean;
};
const activeStatuses=new Set(["pendiente","en_proceso"]);
export const C3_ALERT_LABELS:Record<C3AlertKind,string>={
  overdue:"Vencida",today:"Vence hoy",upcoming:"Vence en los próximos 7 días",
  no_date:"Sin fecha compromiso",normal:"Programada a futuro"
};
function validDate(date:string|null):boolean{
  return Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date+"T12:00:00Z")));
}
/** YYYY-MM-DD is compared as a calendar day in Mexico City, never a browser-local timestamp. */
export function c3DayDifference(due:string,today:string):number|null{
  if(!validDate(due)||!validDate(today))return null;
  const a=Date.parse(due+"T12:00:00Z");
  const b=Date.parse(today+"T12:00:00Z");
  return Math.round((a-b)/86400000);
}
export function c3ClassifyAlert(due:string|null,today:string):{
  kind:C3AlertKind;daysUntilDue:number|null
}{
  const delta=due?c3DayDifference(due,today):null;
  if(delta===null)return {kind:"no_date",daysUntilDue:null};
  if(delta<0)return {kind:"overdue",daysUntilDue:delta};
  if(delta===0)return {kind:"today",daysUntilDue:0};
  if(delta<=7)return {kind:"upcoming",daysUntilDue:delta};
  return {kind:"normal",daysUntilDue:delta};
}
export function c3CollectAlerts(campaigns:C3AlertCampaign[],tasks:C3AlertTask[],today:string):C3AlertItem[]{
  const map=new Map(campaigns.filter(c=>c.status!=="cancelled").map(c=>[c.id,c]));
  return tasks.filter(t=>activeStatuses.has(t.status)&&map.has(t.campaignId)).map(t=>{
    const classification=c3ClassifyAlert(t.dueOn,today);
    return {...t,campaign:map.get(t.campaignId)!,...classification,missingOwner:!t.owner.trim()};
  });
}
export function c3AlertCounts(items:C3AlertItem[]){
  return {
    overdue:items.filter(a=>a.kind==="overdue").length,
    today:items.filter(a=>a.kind==="today").length,
    upcoming:items.filter(a=>a.kind==="upcoming").length,
    noDate:items.filter(a=>a.kind==="no_date").length,
    withoutOwner:items.filter(a=>a.missingOwner).length,
    active:items.length
  };
}
export function c3AlertPriority(a:C3AlertItem):number{
  if(a.kind==="overdue")return 0;
  if(a.kind==="today")return 1;
  if(a.kind==="upcoming")return 2;
  if(a.kind==="no_date")return 3;
  if(a.missingOwner)return 4;
  return 5;
}
export function c3SortAlerts(items:C3AlertItem[]):C3AlertItem[]{
  return [...items].sort((a,b)=>
    c3AlertPriority(a)-c3AlertPriority(b) ||
    (a.daysUntilDue??Number.MAX_SAFE_INTEGER)-(b.daysUntilDue??Number.MAX_SAFE_INTEGER) ||
    (a.dueOn||"9999").localeCompare(b.dueOn||"9999") ||
    a.title.localeCompare(b.title,"es")
  );
}
