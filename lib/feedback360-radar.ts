import type {DimensionScore,FeedbackRole} from "./feedback360";

export type RadarPathData={
 paths:string[];
 dots:Array<{x:number;y:number}>;
 complete:boolean;
 availableCount:number;
};

/**
 * Construye trayectorias solo entre valores existentes.
 * Una categoría sin respuestas jamás se transforma en puntuación cero.
 */
export function buildRadarRolePaths(
 dimensions:DimensionScore[],
 role:FeedbackRole,
 size=560,
 radius=205
):RadarPathData{
 const count=dimensions.length;
 const empty:RadarPathData={paths:[],dots:[],complete:false,availableCount:0};
 if(!count)return empty;
 const center=size/2;
 const points=dimensions.map((dimension,index)=>{
  const score=dimension.scores[role];
  if(typeof score!=="number"||!Number.isFinite(score)||score<1||score>4)return null;
  const angle=-Math.PI/2+index*2*Math.PI/count;
  const adjusted=radius*(score/4);
  return {x:center+Math.cos(angle)*adjusted,y:center+Math.sin(angle)*adjusted};
 });
 const available=points.filter((p):p is {x:number;y:number}=>p!==null);
 if(!available.length)return empty;
 const asString=(p:{x:number;y:number})=>`${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
 const complete=available.length===count;
 if(complete){
  return {
   paths:[`M ${available.map(asString).join(" L ")} Z`],
   dots:available,
   complete:true,
   availableCount:available.length
  };
 }
 // Iniciar la vuelta justo después de una categoría ausente permite
 // representar también las rachas que atraviesan el inicio del radar.
 const firstMissing=points.findIndex(point=>point===null);
 const paths:string[]=[];
 let segment:Array<{x:number;y:number}>=[];
 const flush=()=>{
  if(segment.length>=2)paths.push(`M ${segment.map(asString).join(" L ")}`);
  segment=[];
 };
 for(let offset=1;offset<=count;offset++){
  const index=(firstMissing+offset)%count;
  const point=points[index];
  if(point)segment.push(point);
  else flush();
 }
 flush();
 return {paths,dots:available,complete:false,availableCount:available.length};
}
