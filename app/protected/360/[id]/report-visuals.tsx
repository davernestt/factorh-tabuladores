import { FEEDBACK_ROLES, type FeedbackRole, type DimensionScore } from '@/lib/feedback360';

const ROLES:FeedbackRole[]=['self','manager','peer','report'];
const ROLE_STYLES:Record<FeedbackRole,{stroke:string;dash?:string}>={
  self:{stroke:'#f97316'}, manager:{stroke:'#262626'}, peer:{stroke:'#737373',dash:'6 4'}, report:{stroke:'#a3a3a3',dash:'2 4'}
};

export function Radar360({dimensions}:{dimensions:DimensionScore[]}){
  const size=560,c=size/2,r=205,n=dimensions.length;
  const point=(i:number,value:number)=>{const a=-Math.PI/2+i*2*Math.PI/n;const rr=r*(value/4);return [c+Math.cos(a)*rr,c+Math.sin(a)*rr]};
  const polygon=(role:FeedbackRole)=>dimensions.map((d,i)=>{const [x,y]=point(i,d.scores[role]??0);return `${x},${y}`}).join(' ');
  return <div className="overflow-x-auto"><svg viewBox="0 0 560 560" className="mx-auto min-w-[520px] max-w-[650px]" role="img" aria-label="Radar de competencias 360">
    {[1,2,3,4].map(level=><polygon key={level} points={dimensions.map((_,i)=>point(i,level).join(',')).join(' ')} fill="none" stroke="#e5e5e5" strokeWidth="1"/>)}
    {dimensions.map((d,i)=>{const [x,y]=point(i,4);const [lx,ly]=point(i,4.55);return <g key={d.key}><line x1={c} y1={c} x2={x} y2={y} stroke="#eeeeee"/><text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill="#525252">{d.name.length>18?d.name.slice(0,17)+'…':d.name}</text></g>})}
    {ROLES.map(role=>dimensions.some(d=>d.scores[role]!=null)&&<polygon key={role} points={polygon(role)} fill={role==='self'?'rgba(249,115,22,.08)':'none'} stroke={ROLE_STYLES[role].stroke} strokeWidth={role==='self'?3:2} strokeDasharray={ROLE_STYLES[role].dash}/>)}
  </svg><div className="mt-2 flex flex-wrap justify-center gap-4 text-xs font-semibold text-neutral-600">{ROLES.map(role=><span key={role} className="flex items-center gap-2"><i className="inline-block h-0.5 w-6" style={{background:ROLE_STYLES[role].stroke}}/>{FEEDBACK_ROLES[role]}</span>)}</div></div>
}

export function GapBars({dimensions}:{dimensions:DimensionScore[]}){
  const rows=dimensions.filter(d=>d.gap!=null).sort((a,b)=>Math.abs(b.gap!)-Math.abs(a.gap!));
  return <div className="space-y-3">{rows.map(d=>{const g=d.gap!;const width=Math.min(50,Math.abs(g)/2*50);return <div key={d.key} className="grid grid-cols-[150px_1fr_52px] items-center gap-3 text-xs"><span className="font-semibold text-neutral-700">{d.name}</span><div className="relative h-5 rounded-full bg-neutral-100"><div className="absolute left-1/2 top-0 h-full w-px bg-neutral-400"/><div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-orange-500" style={g>=0?{left:'50%',width:`${width}%`}:{right:'50%',width:`${width}%`}}/></div><strong className={Math.abs(g)>=.7?'text-orange-600':'text-neutral-600'}>{g>0?'+':''}{g.toFixed(2)}</strong></div>})}</div>
}

export function CompetencyBars({dimensions}:{dimensions:DimensionScore[]}){
  const ext=(d:DimensionScore)=>{const a=(['manager','peer','report'] as FeedbackRole[]).map(r=>d.scores[r]).filter((v):v is number=>v!=null);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null};
  return <div className="space-y-3">{[...dimensions].sort((a,b)=>(ext(b)??0)-(ext(a)??0)).map(d=>{const v=ext(d);return <div key={d.key} className="grid grid-cols-[150px_1fr_42px] items-center gap-3 text-xs"><span className="font-semibold text-neutral-700">{d.name}</span><div className="h-3 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-800" style={{width:`${((v??0)/4)*100}%`}}/></div><strong>{v?.toFixed(2)??'—'}</strong></div>})}</div>
}