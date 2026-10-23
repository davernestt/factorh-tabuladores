import { strict as assert } from "node:assert";
import { buildPages, type PsychometricExportData } from "../app/protected/psicometrias/export-actions";

type Drawn = {text:string; x:number; y:number; font:string};
const pages: Drawn[][] = [];
const context = () => {
  const texts: Drawn[] = [];
  pages.push(texts);
  const fake: Record<string, any> = {
    font: "16px Arial", fillStyle: "", strokeStyle: "", textAlign: "left",
    fillText(text:string,x:number,y:number) {
      texts.push({text:String(text),x,y,font:String(this.font)});
    },
    measureText(text:string) {
      const match=String(this.font).match(/(\d+)px/);
      const size=match?Number(match[1]):16;
      return {width:[...String(text)].reduce((n,ch)=>n+(ch===" "?0.27:0.53)*size,0)};
    },
  };
  return new Proxy(fake,{
    get(target, key){ if(key in target) return target[key as string]; return () => {}; },
  });
};
(globalThis as unknown as {document:unknown}).document = {
  createElement(tag:string){
    assert.equal(tag,"canvas");
    const ctx=context();
    return {
      width:1240,height:1754,
      getContext(){return ctx;},
      toDataURL(){return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==";}
    };
  }
};

const long = "La interpretación es descriptiva y requiere contraste con evidencia laboral contextualizada. ".repeat(33);
const data:PsychometricExportData={
  title:"INFORME DE PRUEBA FICTICIO",
  subtitle:"Validación de legibilidad",
  personName:"Persona ficticia QA",
  organizationName:"Organización QA",
  processName:"Proceso de control visual",
  reportDate:"23 de octubre de 2026",
  executiveSummary:[long,long],
  keyFindings:Array.from({length:11},(_,i)=>"FORTALEZA_INTEGRA_"+i+" "+long),
  cautions:Array.from({length:13},(_,i)=>"ALERTA_INTEGRA_"+i+" "+long),
  objectiveText:"OBJETIVO_PRESERVADO "+long,
  managerGuidance:{
    supervision:"LECTURA_JEFATURA_PRESERVADA "+long,
    pressure:"",
    team:"",
    motivators:[],
    coaching:[]
  },
  instruments:[],
};
const output=buildPages(data,true,{} as HTMLImageElement);
assert.equal(output.length,pages.length,"Una imagen por página");
assert.ok(output.length>5,"El texto extenso debe expandirse a páginas adicionales");
const all=pages.flat().map(x=>x.text).join(" ");
for(let i=0;i<11;i++)assert.ok(all.includes("FORTALEZA_INTEGRA_"+i),"Fortaleza omitida "+i);
for(let i=0;i<13;i++)assert.ok(all.includes("ALERTA_INTEGRA_"+i),"Alerta omitida "+i);
assert.ok(all.includes("OBJETIVO_PRESERVADO"));
assert.ok(all.includes("LECTURA_JEFATURA_PRESERVADA"));

let cardPages=0, bodyLines=0;
for(const drawn of pages){
  const summaryLabels=drawn.filter(x=>/^(PANORAMA GENERAL|FORTALEZAS Y SEÑALES|ASPECTOS PARA VALIDAR|OBJETIVO|LECTURA PARA EL JEFE)/.test(x.text));
  if(!summaryLabels.length)continue;
  cardPages++;
  const body=drawn.filter(x=>x.font==="22px Arial" && x.x===128);
  bodyLines+=body.length;
  for(const line of body){
    assert.ok(line.y<1649 && line.y>145, "Texto fuera del área imprimible: "+JSON.stringify(line));
  }
  const positions=body.map(x=>x.y).sort((a,b)=>a-b);
  for(let i=1;i<positions.length;i++){
    assert.ok(positions[i]-positions[i-1]>=33,
      "Renglones del resumen empalmados en y="+positions[i]);
  }
}
assert.ok(cardPages>=4 && bodyLines>120,"No se renderizaron todas las líneas del resumen");
console.log("PSYCHOMETRIC_READABLE_PDF_OK: "+output.length+" páginas, "+bodyLines+" renglones legibles, sin recortes ni solapamientos.");
