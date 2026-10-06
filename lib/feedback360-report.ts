import { COMPETENCIES_360, type FeedbackRole, type DimensionScore } from './feedback360';

export type ResultRater = { id:string; role:FeedbackRole; status:string };
export type ResultAnswer = { rater_id:string; item_key:string; rating:number|null; not_observed:boolean };
export type CommentRow = { rater_id:string;question_key:string;comment:string };
export type FacetScore = { key:string; competencyKey:string; competency:string; facet:string; prompt:string; scores:DimensionScore['scores']; counts:DimensionScore['counts'] };

export function summarize360(raters:ResultRater[], answers:ResultAnswer[], releaseAggregates = true) {
  const completed=raters.filter(r=>r.status==='completed');
  const byRater=new Map<string,Map<string,number>>();
  for(const a of answers) if(a.rating!==null && Number.isFinite(a.rating) && a.rating>=1 && a.rating<=4) {
    const m=byRater.get(a.rater_id)??new Map<string,number>();m.set(a.item_key,Number(a.rating));byRater.set(a.rater_id,m);
  }
  const dimensions:DimensionScore[]=COMPETENCIES_360.map(c=>{
    const scores:DimensionScore['scores']={};const counts:DimensionScore['counts']={};
    for(const role of ['self','manager','peer','report'] as FeedbackRole[]){
      const perRater=completed.filter(r=>r.role===role).map(r=>{
        const values=c.items.map((_,i)=>byRater.get(r.id)?.get(`${c.key}_${i+1}`)).filter((v):v is number=>v!==undefined);
        return values.length>=3?values.reduce((a,b)=>a+b,0)/values.length:null;
      }).filter((x):x is number=>x!==null);
      counts[role]=perRater.length;
      if((releaseAggregates || (role!=='peer'&&role!=='report')) && perRater.length >= (role==='peer'||role==='report'?3:1))scores[role]=perRater.reduce((a,b)=>a+b,0)/perRater.length;
    }
    const external=(['manager','peer','report'] as FeedbackRole[]).map(role=>scores[role]).filter((v):v is number=>v!==undefined);
    const gap=scores.self!==undefined&&external.length?Number((scores.self-external.reduce((a,b)=>a+b,0)/external.length).toFixed(2)):null;
    return {key:c.key,name:c.name,scores,counts,gap};
  });
  const facets:FacetScore[]=COMPETENCIES_360.flatMap(c=>c.items.map((item,i)=>{
    const key=`${c.key}_${i+1}`;
    const scores:DimensionScore['scores']={};
    const counts:DimensionScore['counts']={};
    for(const role of ['self','manager','peer','report'] as FeedbackRole[]){
      const values=completed
        .filter(r=>r.role===role)
        .map(r=>byRater.get(r.id)?.get(key))
        .filter((v):v is number=>v!==undefined);
      counts[role]=values.length;
      if((releaseAggregates || (role!=='peer'&&role!=='report')) && values.length >= (role==='peer'||role==='report'?3:1)){
        scores[role]=values.reduce((a,b)=>a+b,0)/values.length;
      }
    }
    return {key,competencyKey:c.key,competency:c.name,facet:item.facet,prompt:item.prompt,scores,counts};
  }));
  const byRole=Object.fromEntries((['self','manager','peer','report'] as FeedbackRole[]).map(role=>[role,{invited:raters.filter(r=>r.role===role).length,completed:completed.filter(r=>r.role===role).length}])) as Record<FeedbackRole,{invited:number;completed:number}>;
  return { dimensions, facets, byRole, total:raters.length, completed:completed.length, suppressedGroups:(['peer','report'] as FeedbackRole[]).filter(role=>byRole[role].completed>0&&byRole[role].completed<3) };
}

export function band360(value:number){return value>=3.5?'Muy bien':value>=3?'Estable':value>=2.4?'Atención':'Riesgo';}
