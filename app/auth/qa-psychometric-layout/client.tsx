"use client";
import { useEffect, useState } from "react";
import PsychometricExportActions, {buildPages,loadBrandLogo,type PsychometricExportData} from "@/app/protected/psicometrias/export-actions";

const paragraph="Esta información es completamente ficticia y se utiliza únicamente para comprobar legibilidad, separación de párrafos, manejo de textos largos y saltos automáticos de página. No contiene resultados reales de personas evaluadas.";
const dims=Array.from({length:8},(_,i)=>({
  name:"Competencia evaluada de prueba "+(i+1),
  value:45+i*5,
  narrative:paragraph.repeat(i%3===0?2:1),
  potential:paragraph,
  watchout:paragraph,
}));
const data:PsychometricExportData={
  title:"Reporte Psicométrico Integral — QA FICTICIO",
  subtitle:"Prueba visual de exportación PDF y Word",
  personName:"Candidato Ficticio QA",
  organizationName:"Empresa Ficticia QA",
  jobTitle:"Analista de procesos de prueba",
  area:"Área de aseguramiento de calidad",
  processName:"Batería experimental no comercial",
  reportDate:"22 de octubre de 2026",
  executiveSummary:[paragraph.repeat(3),paragraph.repeat(2),paragraph.repeat(2)],
  keyFindings:Array.from({length:5},(_,i)=>"Fortaleza QA "+(i+1)+": "+paragraph),
  cautions:Array.from({length:4},(_,i)=>"Aspecto a validar QA "+(i+1)+": "+paragraph),
  objectiveText:paragraph.repeat(3),
  battery:Array.from({length:6},(_,i)=>({name:"Instrumento de prueba "+(i+1),description:paragraph})),
  jobComparison:Array.from({length:8},(_,i)=>({name:"Competencia QA "+(i+1),referenceMin:50,referenceMax:85,observed:60,status:"Requiere análisis con evidencia complementaria y entrevista estructurada; "+paragraph,importance:"Alta"})),
  managerGuidance:{supervision:paragraph.repeat(3),pressure:paragraph.repeat(3),team:paragraph.repeat(2),motivators:Array.from({length:3},()=>paragraph),coaching:Array.from({length:4},()=>paragraph)},
  onboardingPlan:[{period:"Días 1-30",focus:"Contexto",actions:Array.from({length:4},()=>paragraph)},{period:"Días 31-60",focus:"Autonomía",actions:Array.from({length:4},()=>paragraph)},{period:"Días 61-90",focus:"Consolidación",actions:Array.from({length:4},()=>paragraph)}],
  interviewQuestions:Array.from({length:7},(_,i)=>"Pregunta de entrevista de prueba "+(i+1)+": "+paragraph),
  closing:paragraph.repeat(3),
  instruments:[
    {name:"Vector Conductual QA",chart:"radar",overallDisplay:"78",summary:[paragraph,paragraph],dimensions:dims.slice(0,5),highlights:[paragraph,paragraph],watchouts:[paragraph,paragraph]},
    {name:"Atención y Precisión QA",chart:"columns",overallDisplay:"85%",summary:[paragraph.repeat(2),paragraph],dimensions:dims,highlights:[paragraph],watchouts:[paragraph]},
  ],
};

export default function LayoutQaClient(){
  const [urls,setUrls]=useState<string[]>([]);
  const [error,setError]=useState("");
  useEffect(()=>{
    let current:string[]=[];
    (async()=>{
      try{
        await document.fonts?.ready;
        const logo=await loadBrandLogo();
        const images=buildPages(data,true,logo);
        current=images.map(b=>URL.createObjectURL(new Blob([new Uint8Array(b)],{type:"image/jpeg"})));
        setUrls(current);
      }catch(e){setError(String(e));}
    })();
    return ()=>current.forEach(u=>URL.revokeObjectURL(u));
  },[]);
  return <main style={{padding:20,background:"#f0f0f0"}}>
    <h1>QA VISUAL FACTORH — DATOS FICTICIOS</h1>
    <p>Este informe es ficticio y sólo está disponible en Preview; permite evaluar texto largo y saltos de página.</p>
    <PsychometricExportActions data={data} fileName="Factorh-QA-Ficticio" integral />
    {error && <p style={{color:"red"}}>{error}</p>}
    <p>Total de páginas: {urls.length}</p>
    {urls.map((url,i)=><section key={i} style={{maxWidth:700,margin:"12px auto"}}>
      <h2>Página {i+1}</h2><img src={url} alt={"Página QA "+(i+1)} style={{width:"100%",height:"auto",boxShadow:"0 1px 8px #aaa"}}/>
    </section>)}
  </main>;
}
