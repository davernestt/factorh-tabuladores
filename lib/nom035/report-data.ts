import {nom035AuthorizedRiskCampaign} from "@/lib/nom035/server-access";

export type Nom035ReportGroup={
 metric_kind:"total"|"category"|"domain";metric_name:string;
 sum_score:number;count_scored:number;risk_nulo:number;risk_bajo:number;
 risk_medio:number;risk_alto:number;risk_muy_alto:number;
};
export type Nom035ReportDraft={
 objective:string;activities:string;methodology_notes:string;conclusions:string;
 recommendations:string;intervention_notes:string;
 responsible_name:string;professional_license:string;validation_status:string;
 reviewed_at:string|null;
};
export type Nom035ReportAction={
 source_domain:string;measure_scope:string;description:string;affected_area:string;
 responsible:string;due_on:string|null;status:string;progress_percent:number;
 evidence_reference:string;effectiveness_notes:string;
};
export async function getNom035ReportBundle(campaignId:string){
 const {user,db,campaign,center}=await nom035AuthorizedRiskCampaign(campaignId);
 const [orgR,aggregatesR,draftR,actionsR,linksR]=await Promise.all([
  db.from("organizations").select("name").eq("id",center.organization_id).maybeSingle(),
  db.from("nom035_risk_aggregates").select(
   "metric_kind,metric_name,sum_score,count_scored,risk_nulo,risk_bajo,risk_medio,risk_alto,risk_muy_alto"
  ).eq("campaign_id",campaign.id).order("metric_kind").order("metric_name"),
  db.from("nom035_report_drafts").select(
   "objective,activities,methodology_notes,conclusions,recommendations,intervention_notes,responsible_name,professional_license,validation_status,reviewed_at"
  ).eq("campaign_id",campaign.id).maybeSingle(),
  db.from("nom035_intervention_actions").select(
   "source_domain,measure_scope,description,affected_area,responsible,due_on,status,progress_percent,evidence_reference,effectiveness_notes"
  ).eq("campaign_id",campaign.id).order("created_at",{ascending:false}),
  db.from("nom035_risk_invites").select("id",{count:"exact",head:true}).eq("campaign_id",campaign.id)
 ]);
 if(orgR.error||aggregatesR.error||draftR.error||actionsR.error||linksR.error)
  throw Error("El informe técnico no pudo consultarse.");
 const privacyReady=campaign.status==="closed"&&campaign.completed_count>=10;
 const targetAchieved=campaign.completed_count>=campaign.eligible_population;
 return {
  user,campaign,center,
  organizationName:orgR.data?.name||"Organización",
  groups:(aggregatesR.data||[]) as Nom035ReportGroup[],
  draft:(draftR.data||null) as Nom035ReportDraft|null,
  actions:(actionsR.data||[]) as Nom035ReportAction[],
  invited:linksR.count||0,privacyReady,targetAchieved,
  reviewable:privacyReady&&targetAchieved&&Boolean(draftR.data)
 };
}
export const NOM035_LEVEL_LABELS=[
 {key:"risk_nulo",name:"Nulo o despreciable"},
 {key:"risk_bajo",name:"Bajo"},
 {key:"risk_medio",name:"Medio"},
 {key:"risk_alto",name:"Alto"},
 {key:"risk_muy_alto",name:"Muy alto"}
] as const;
export function interventionSummaryDomain(groups:Nom035ReportGroup[]){
 return groups.filter(g=>g.metric_kind==="domain").map(g=>({
  name:g.metric_name,high:g.risk_alto+g.risk_muy_alto,
  count:g.count_scored,average:g.count_scored?Number(g.sum_score/g.count_scored):0
 })).sort((a,b)=>b.high-a.high||b.average-a.average);
}
