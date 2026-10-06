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
      if((releaseAggregates || (role!=='peer'&&role!=='report')) && perRater.length >= 1) scores[role]=perRater.reduce((a,b)=>a+b,0)/perRater.length;
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
      if((releaseAggregates || (role!=='peer'&&role!=='report')) && values.length >= 1){
        scores[role]=values.reduce((a,b)=>a+b,0)/values.length;
      }
    }
    return {key,competencyKey:c.key,competency:c.name,facet:item.facet,prompt:item.prompt,scores,counts};
  }));
  const byRole=Object.fromEntries((['self','manager','peer','report'] as FeedbackRole[]).map(role=>[role,{invited:raters.filter(r=>r.role===role).length,completed:completed.filter(r=>r.role===role).length}])) as Record<FeedbackRole,{invited:number;completed:number}>;
  return { dimensions, facets, byRole, total:raters.length, completed:completed.length, smallSampleGroups:(['peer','report'] as FeedbackRole[]).filter(role=>byRole[role].completed>0&&byRole[role].completed<3) };
}

export function band360(value:number){return value>=3.5?'Muy bien':value>=3?'Estable':value>=2.4?'Atención':'Riesgo';}


export type ProfessionalInsight = {
  overall:number|null;
  headline:string;
  executiveSummary:string[];
  strengths:{name:string;score:number;message:string}[];
  priorities:{name:string;score:number;message:string}[];
  blindSpots:{name:string;gap:number;message:string}[];
  developmentPlan:{competency:string;objective:string;actions:string[];indicator:string;horizon:string}[];
  recommendations:string[];
};

const behaviorText=(name:string,score:number)=>{
  if(score>=3.5)return `En ${name}, el entorno observa una conducta consistente y confiable. Conviene preservar estas prácticas y utilizarlas como palanca para modelar al equipo.`;
  if(score>=3)return `En ${name}, el desempeño observado es funcional y relativamente estable, aunque todavía existe margen para elevar la consistencia en situaciones de presión o cambio.`;
  if(score>=2.4)return `En ${name}, la conducta aparece de manera irregular. La prioridad es convertir buenas intenciones en hábitos observables, repetibles y medibles.`;
  return `En ${name}, el resultado señala una prioridad de desarrollo relevante. Se recomienda intervención específica, seguimiento frecuente y evidencia conductual de avance.`;
};

export function professional360(dimensions:DimensionScore[]):ProfessionalInsight{
  const external=(d:DimensionScore)=>{
    const vals=(['manager','peer','report'] as FeedbackRole[]).map(r=>d.scores[r]).filter((v):v is number=>v!=null);
    return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  };
  const scored=dimensions.map(d=>({...d,external:external(d)})).filter((d):d is typeof d & {external:number}=>d.external!==null);
  const ordered=[...scored].sort((a,b)=>b.external-a.external);
  const strengths=ordered.slice(0,3).map(d=>({name:d.name,score:d.external,message:behaviorText(d.name,d.external)}));
  const priorities=[...ordered].reverse().slice(0,3).map(d=>({name:d.name,score:d.external,message:behaviorText(d.name,d.external)}));
  const blindSpots=scored.filter(d=>d.scores.self!=null&&Math.abs(d.gap??0)>=.7).sort((a,b)=>Math.abs(b.gap??0)-Math.abs(a.gap??0)).map(d=>({
    name:d.name,gap:d.gap!,
    message:d.gap!>0?`La autopercepción supera en ${d.gap!.toFixed(2)} puntos la percepción del entorno. Puede existir un punto ciego: conviene contrastar ejemplos concretos y acordar conductas observables.`:`El entorno valora esta competencia ${Math.abs(d.gap!).toFixed(2)} puntos por encima de la autoevaluación. Puede existir una fortaleza subestimada que conviene reconocer y capitalizar.`
  }));
  const overall=scored.length?scored.reduce((a,b)=>a+b.external,0)/scored.length:null;
  const level=overall==null?'sin información suficiente':overall>=3.5?'sólido y consistente':overall>=3?'funcional con oportunidades de consolidación':overall>=2.4?'mixto, con oportunidades claras de desarrollo':'prioritario para intervención y acompañamiento';
  const executiveSummary=[
    `La evaluación 360° presenta un perfil ${level}${overall!=null?`, con una valoración promedio del entorno de ${overall.toFixed(2)} sobre 4.00`:''}. La lectura integra jefe, pares y colaboradores disponibles; no constituye un diagnóstico clínico ni de personalidad.`,
    strengths.length?`Las fortalezas más reconocidas son ${strengths.map(x=>x.name).join(', ')}. Estos comportamientos representan recursos actuales para sostener resultados, generar confianza y facilitar la colaboración.`:'No existe información externa suficiente para identificar fortalezas consolidadas.',
    priorities.length?`Las principales oportunidades se concentran en ${priorities.map(x=>x.name).join(', ')}. El foco recomendado es trabajar pocas conductas de alto impacto y verificar su transferencia al puesto mediante evidencia observable.`:'',
    blindSpots.length?`Se detectan ${blindSpots.length} brecha(s) de percepción relevante(s) (≥0.70). Estas diferencias no deben interpretarse como fallas por sí mismas, sino como hipótesis de conversación para contrastar expectativas, ejemplos y efectos en terceros.`:'La autopercepción y la percepción del entorno no muestran brechas críticas de 0.70 puntos o más.'
  ].filter(Boolean);
  const developmentPlan=priorities.map((p,i)=>({
    competency:p.name,
    objective:`Incrementar la consistencia observable de ${p.name} y acercar la percepción del entorno a un nivel ≥ 3.20.`,
    actions:[
      i===0?'Definir con el jefe dos conductas concretas esperadas y revisarlas semanalmente durante el primer mes.':'Seleccionar una situación real por semana para practicar deliberadamente la conducta objetivo.',
      'Solicitar retroalimentación breve y específica a dos personas que observen directamente el comportamiento.',
      'Registrar ejemplos, resultados y aprendizajes; ajustar la conducta con base en evidencia y no sólo en percepción.'
    ],
    indicator:'≥80% de acciones cumplidas + mejora observable en pulso de seguimiento.',
    horizon:i===0?'0–30 días':i===1?'31–60 días':'61–90 días'
  }));
  return {overall,headline:overall==null?'Reporte 360°':overall>=3.5?'Fortalezas consolidadas':overall>=3?'Base sólida para evolucionar':overall>=2.4?'Potencial con focos definidos':'Desarrollo prioritario',executiveSummary,strengths,priorities,blindSpots,developmentPlan,recommendations:[
    'Realizar una sesión de devolución de 60–90 minutos centrada en patrones y ejemplos, evitando discutir quién emitió cada respuesta.',
    'Elegir máximo tres prioridades de desarrollo; intentar modificar demasiadas conductas al mismo tiempo reduce la transferencia al puesto.',
    'Acordar indicadores conductuales con el jefe inmediato y revisar avances a 30, 60 y 90 días.',
    'Aplicar un pulso breve de seguimiento y repetir el 360° entre 6 y 9 meses para comparar cambios sostenidos.'
  ]};
}
