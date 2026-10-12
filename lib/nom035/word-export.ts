import type {Nom035ReportGroup} from "./report-data";
import {NOM035_LEVEL_LABELS} from "./report-data";

/** Tiny dependency-free DOCX writer (Office Open XML ZIP with STORE entries). */
function esc(value:string|number|null|undefined){
 return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;")
  .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
function para(value:string,bold=false,pt=21){
 return '<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr>'+
 (bold?"<w:b/>":"")+'<w:sz w:val="'+pt+'"/></w:rPr><w:t xml:space="preserve">'+
 esc(value)+'</w:t></w:r></w:p>';
}
function crc32(buf:Buffer){
 let crc=0xffffffff;
 for(const byte of buf){
  crc^=byte;
  for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 }
 return (crc^0xffffffff)>>>0;
}
function packZip(entries:Array<{path:string;data:string}>){
 const local:Buffer[]=[],central:Buffer[]=[];
 let offset=0;
 for(const e of entries){
  const path=Buffer.from(e.path),data=Buffer.from(e.data,"utf8"),sum=crc32(data);
  const localHeader=Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50,0);
  localHeader.writeUInt16LE(20,4);
  localHeader.writeUInt16LE(0,6);
  localHeader.writeUInt16LE(0,8);
  localHeader.writeUInt32LE(sum,14);
  localHeader.writeUInt32LE(data.length,18);
  localHeader.writeUInt32LE(data.length,22);
  localHeader.writeUInt16LE(path.length,26);
  local.push(localHeader,path,data);
  const centralHeader=Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50,0);
  centralHeader.writeUInt16LE(20,4);
  centralHeader.writeUInt16LE(20,6);
  centralHeader.writeUInt16LE(0,8);
  centralHeader.writeUInt16LE(0,10);
  centralHeader.writeUInt32LE(sum,16);
  centralHeader.writeUInt32LE(data.length,20);
  centralHeader.writeUInt32LE(data.length,24);
  centralHeader.writeUInt16LE(path.length,28);
  centralHeader.writeUInt32LE(offset,42);
  central.push(centralHeader,path);
  offset+=localHeader.length+path.length+data.length;
 }
 const body=Buffer.concat(local),index=Buffer.concat(central),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);
 end.writeUInt16LE(entries.length,8);
 end.writeUInt16LE(entries.length,10);
 end.writeUInt32LE(index.length,12);
 end.writeUInt32LE(body.length,16);
 return Buffer.concat([body,index,end]);
}
export type WordReportPayload={
 kind:"executive"|"technical";
 company:string;center:string;address:string;activity:string;
 guide:string;version:string;population:number;target:number;completed:number;
 covered:boolean;validated:boolean;
 objective:string;activities:string;method:string;conclusions:string;recommendations:string;
 interventions:string;responsible:string;license:string;
 aggregates:Nom035ReportGroup[];actions:Array<{
 description:string;responsible:string;affected_area:string;status:string;progress_percent:number
 }>;
};
export function buildNom035WordReport(data:WordReportPayload):Buffer{
 const rows:string[]=[];
 const add=(t:string,bold=false,pt=21)=>rows.push(para(t,bold,pt));
 add("FACToRH  |  NOM-035-STPS-2018",true,21);
 add(data.kind==="executive"?"INFORME EJECUTIVO":"INFORME TÉCNICO · NUMERAL 7.7",true,32);
 add("DOCUMENTO PARA REVISIÓN · NO CONSTITUYE CERTIFICADO DE CUMPLIMIENTO",true,18);
 add("Razón social: "+data.company,true);
 add("Centro de trabajo: "+data.center);
 add("Domicilio: "+(data.address||"PENDIENTE"));
 add("Actividad principal: "+data.activity);
 add("Instrumento: Guía "+data.guide+" · "+data.version);
 add("Plantilla: "+data.population+" · Población objetivo: "+data.target+" · Respuestas: "+data.completed);
 add(data.covered?"Población objetivo alcanzada.":"ADVERTENCIA: población objetivo no alcanzada; informe incompleto.",true);
 add(data.validated?"Revisión administrativa interna registrada.":"BORRADOR: revisión administrativa pendiente.",true);
 const sec=(title:string,content:string)=>{
  add(title,true,24);
  for(const line of (content||"PENDIENTE DE REDACCIÓN Y REVISIÓN PROFESIONAL").split("\n"))
   add(line||" ");
 };
 if(data.kind==="technical"){
  sec("B. Objetivo de la evaluación",data.objective);
  sec("C. Actividades realizadas",data.activities);
  sec("D. Método utilizado (numeral 7.4)",data.method);
 }
 add("E. Resultados agregados",true,24);
 for(const group of data.aggregates){
  if(data.kind==="executive"&&group.metric_kind!=="total"&&group.metric_kind!=="domain")continue;
  add((group.metric_kind==="total"?"TOTAL":group.metric_kind==="category"?"CATEGORÍA":"DOMINIO")+
   " · "+group.metric_name,true);
  add("Media descriptiva: "+(group.count_scored?(group.sum_score/group.count_scored).toFixed(1):"—")+" puntos.");
  add(NOM035_LEVEL_LABELS.map(x=>x.name+": "+group[x.key]).join(" · "));
 }
 sec("F. Conclusiones",data.conclusions);
 sec("G. Recomendaciones",data.recommendations);
 if(data.kind==="technical")sec("Acciones de intervención, cuando corresponda",data.interventions);
 add("Programa de intervención vinculado",true,24);
 if(!data.actions.length)add("No hay acciones vinculadas. Revisar su necesidad según los resultados.");
 else for(const a of data.actions){
  add(a.description,true);
  add("Área: "+a.affected_area+" · Responsable: "+a.responsible+
   " · Avance: "+a.progress_percent+"% · Estado: "+a.status);
 }
 if(data.kind==="technical"){
  add("H. Responsable de la evaluación",true,24);
  add(data.responsible||"PENDIENTE");
  add("Cédula profesional (en su caso): "+(data.license||"No indicada"));
 }
 add("Fuente: NOM-035-STPS-2018 · Diario Oficial de la Federación.");
 add("Las distribuciones no contienen respuestas individuales. Documento sujeto a revisión normativa independiente.");
 const xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
 '<w:body>'+rows.join("")+
 '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="950" w:right="950" w:bottom="950" w:left="950"/></w:sectPr>'+
 '</w:body></w:document>';
 return packZip([
  {path:"[Content_Types].xml",data:'<?xml version="1.0" encoding="UTF-8"?>'+
   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
   '<Default Extension="xml" ContentType="application/xml"/>'+
   '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
   '</Types>'},
  {path:"_rels/.rels",data:'<?xml version="1.0" encoding="UTF-8"?>'+
   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
   '</Relationships>'},
  {path:"word/document.xml",data:xml}
 ]);
}
