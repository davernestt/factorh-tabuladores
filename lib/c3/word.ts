import type {C3Report} from "./report";
import {c3Format} from "./report";
import {c3OperationalBand,c3Readout,c3ReadyToReport} from "./consulting";

function xml(value:string|number|null|undefined){
 return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
   .replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
type ParagraphOptions={bold?:boolean;size?:number;color?:string;style?:string;before?:number;after?:number;keep?:boolean};
function paragraph(value:string|number,options:ParagraphOptions={}):string{
 const o=options;
 const properties=[
  o.style?`<w:pStyle w:val="${o.style}"/>`:"",
  (o.before||o.after)?`<w:spacing w:before="${o.before||0}" w:after="${o.after||100}"/>`:"",
  o.keep?'<w:keepNext/>':""
 ].join("");
 const rp=[
  o.bold?'<w:b/>':"",
  o.color?`<w:color w:val="${o.color}"/>`:"",
  o.size?`<w:sz w:val="${o.size}"/>`:""
 ].join("");
 return `<w:p><w:pPr>${properties}</w:pPr><w:r><w:rPr>${rp}</w:rPr><w:t xml:space="preserve">${xml(value)}</w:t></w:r></w:p>`;
}
function table(headers:string[],rows:(string|number)[][],widths?:number[]):string{
 const n=headers.length;
 const shades=["FFF3EC","F3F5F7"];
 const cells=(row:(string|number)[],header:boolean,index:number)=>
  `<w:tr>${row.map((cell,j)=>`<w:tc><w:tcPr><w:tcW w:w="${widths?.[j]||Math.floor(9000/n)}" w:type="dxa"/><w:shd w:fill="${header?"243142":shades[index%2]}"/><w:tcMar><w:top w:w="75" w:type="dxa"/><w:start w:w="110" w:type="dxa"/><w:bottom w:w="75" w:type="dxa"/><w:end w:w="110" w:type="dxa"/></w:tcMar></w:tcPr>${paragraph(String(cell),{bold:header,color:header?"FFFFFF":"243142",size:18})}</w:tc>`).join("")}</w:tr>`;
 return `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:bottom w:val="single" w:color="E5E7EB" w:sz="4"/></w:tblBorders></w:tblPr><w:tblGrid>${(widths||headers.map(()=>Math.floor(9000/n))).map(w=>`<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${cells(headers,true,0)}${rows.map((row,i)=>cells(row,false,i)).join("")}</w:tbl>`;
}
function heading(title:string):string{return paragraph(title,{bold:true,size:28,color:"243142",before:360,after:180,keep:true});}
function subheading(title:string):string{return paragraph(title,{bold:true,size:21,color:"EC6D18",before:220,after:100,keep:true});}
function scoreBar(score:number|null):string{
 const n=Math.round(Math.max(0,Math.min(100,score??0))/10);
 const filled="▰".repeat(n),empty="▱".repeat(10-n);
 return `<w:p><w:r><w:rPr><w:color w:val="EC6D18"/><w:sz w:val="22"/></w:rPr><w:t>${xml(filled)}</w:t></w:r><w:r><w:rPr><w:color w:val="CBD5E1"/><w:sz w:val="22"/></w:rPr><w:t>${xml(empty)}</w:t></w:r></w:p>`;
}


function crc32(bytes:Buffer):number{
 let crc=0xFFFFFFFF;
 for(const byte of bytes){
  crc^=byte;
  for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xEDB88320:0);
 }
 return (crc^0xFFFFFFFF)>>>0;
}
function makeZip(files:{name:string;data:Buffer|string}[]):Buffer{
 const payloads:Buffer[]=[],directory:Buffer[]=[];
 let offset=0;
 for(const file of files){
  const name=Buffer.from(file.name,"utf8");
  const data=Buffer.isBuffer(file.data)?file.data:Buffer.from(file.data,"utf8");
  const crc=crc32(data);
  const local=Buffer.alloc(30);
  local.writeUInt32LE(0x04034B50,0);
  local.writeUInt16LE(20,4);
  local.writeUInt16LE(0,6);
  local.writeUInt16LE(0,8); // Stored: no compression
  local.writeUInt32LE(crc,14);
  local.writeUInt32LE(data.length,18);
  local.writeUInt32LE(data.length,22);
  local.writeUInt16LE(name.length,26);
  const central=Buffer.alloc(46);
  central.writeUInt32LE(0x02014B50,0);
  central.writeUInt16LE(20,4);
  central.writeUInt16LE(20,6);
  central.writeUInt16LE(0,8);
  central.writeUInt16LE(0,10);
  central.writeUInt32LE(crc,16);
  central.writeUInt32LE(data.length,20);
  central.writeUInt32LE(data.length,24);
  central.writeUInt16LE(name.length,28);
  central.writeUInt32LE(offset,42);
  payloads.push(local,name,data);
  directory.push(central,name);
  offset+=local.length+name.length+data.length;
 }
 const dir=Buffer.concat(directory);
 const end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054B50,0);
 end.writeUInt16LE(files.length,8);
 end.writeUInt16LE(files.length,10);
 end.writeUInt32LE(dir.length,12);
 end.writeUInt32LE(offset,16);
 return Buffer.concat([...payloads,dir,end]);
}
export function createC3WordReport(report:C3Report):Buffer{
 const s=report.summary;
 const date=new Date(report.generatedAt).toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric",timeZone:"America/Mexico_City"});
 if(!c3ReadyToReport(s))throw new Error("No hay cobertura suficiente para el reporte.");
 const readout=c3Readout(s);
 const strengths=readout.strengths;
 const plan=readout.opportunities;
 const body:string[]=[
  paragraph("FactoRH",{bold:true,size:50,color:"EC6D18",after:0}),
  paragraph("C3 PRO  /  INTELIGENCIA ORGANIZACIONAL",{bold:true,size:19,color:"243142",after:120}),
  paragraph("REPORTE EJECUTIVO · EDICIÓN CONSULTIVA",{bold:true,size:19,color:"243142",after:120}),
  ...(report.demo?[paragraph("DEMOSTRACIÓN · CIFRAS FICTICIAS · NO ES UN REPORTE DE CLIENTES",{bold:true,size:20,color:"9A3412",after:200})]:[]),
  paragraph(report.organization,{bold:true,size:32,color:"243142",after:70}),
  paragraph(report.campaign.name,{size:21,color:"4B5563",after:100}),
  paragraph("Fecha: "+date+"  |  Metodología: "+report.campaign.bank_version,{size:17,color:"64748B",after:210}),
  paragraph("Uso consultivo preliminar. No equivale a una prueba psicométricamente validada ni sustituye NOM-035.",{size:18,color:"9A3412",after:200}),
  heading("01 / Lectura ejecutiva"),
  table(["Indicador ejecutivo","Resultado"],[
   ["Índice global C3 · 0–100",c3Format(s.global)+" / "+c3OperationalBand(s.global)],
   ["Participación",s.population?String(s.completed)+" de "+s.population+" · "+c3Format(100*s.completed/s.population)+"%":String(s.completed)+" respuestas"],
   ["Ligas generadas",String(s.invitations)],
   ["eNPS · −100 a +100",c3Format(s.enps)]
  ],[5600,3400]),
  paragraph(readout.overview,{size:19,before:180,after:130}),
  paragraph(readout.participationCaveat,{size:18,after:160}),
  heading("02 / Lectura de los tres pilares"),
  ...readout.pillars.flatMap(p=>[
   subheading(p.name+"   "+c3Format(p.score)+"/100"),
   scoreBar(p.score),
   paragraph(p.observation,{size:18,after:150})
  ]),
  heading("03 / Mapa de las 13 dimensiones"),
  paragraph("Índice normalizado y favorabilidad son métricas distintas. Comparación interna, sin baremos externos.",{size:17,after:150}),
  table(["Código","Dimensión","Índice","Favorabilidad"],(s.dimensions||[]).map(d=>[
   d.code,d.name,c3Format(d.score),d.favorability===null?"No publicable":c3Format(d.favorability)+"%"
  ]),[850,4850,1400,1900]),
  heading("04 / Fortalezas relativas"),
  paragraph("Las mayores puntuaciones corresponden exclusivamente a esta aplicación, no a benchmarks de otras organizaciones.",{size:18,after:130}),
  ...strengths.map((d,i)=>paragraph((i+1)+". "+d.name+" — "+c3Format(d.score)+"/100 ("+d.pillar+")",{bold:true,size:19,after:100})),
  heading("05 / Oportunidades y plan de acción propuesto"),
  paragraph("Las tres dimensiones relativamente más bajas sugieren ámbitos para investigar. Las siguientes explicaciones no son causas demostradas.",{size:18,after:170}),
  ...plan.flatMap((o,i)=>[
   subheading((i+1)+". "+o.code+" · "+o.dimension+" — "+c3Format(o.score)+"/100"),
   paragraph("Hipótesis a contrastar: "+o.hypothesis,{size:18,after:75}),
   paragraph("Verificación previa: "+o.discovery,{size:18,after:75}),
   paragraph("Intervención posible: "+o.action,{size:18,after:75}),
   paragraph("Responsable sugerido: "+o.owner,{size:18,after:75}),
   paragraph("Indicador de seguimiento: "+o.indicator,{size:18,after:110}),
   table(["Plazo","Actividad"],[
    ["Días 1–30",o.day30],
    ["Días 31–60",o.day60],
    ["Días 61–90",o.day90]
   ],[2100,6900]),
  ]),
  heading("06 / Agenda de decisiones para Dirección"),
  ...readout.decisions.map((d,i)=>paragraph(String(i+1)+". "+d,{size:19,after:130})),
  heading("07 / Definiciones y límites técnicos"),
  ...readout.glossary.map(d=>paragraph("• "+d,{size:18,after:120})),
  paragraph("Metodología prepiloto: dimensión = media de índices individuales con al menos 3 de 4 respuestas válidas; pilar = media de sus dimensiones; índice global = media de Clima, Cultura y Compromiso, con pesos iguales. El eNPS se calcula por separado. No se exportan respuestas individuales ni comentarios abiertos.",{size:18,before:200,after:140}),
  paragraph("El umbral mínimo de reporte es de cinco respuestas completas y cobertura suficiente de las 13 dimensiones. La publicación también depende del riesgo contextual de identificación. La escala no cuenta aún con puntos de corte empíricos ni baremos externos.",{size:18,after:130}),
  paragraph("FactoRH C3 PRO   |   Documento prepiloto   |   "+date,{size:16,color:"64748B",after:90})
 ];
 const document=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1080" w:bottom="1000" w:left="1080" w:header="450" w:footer="450"/></w:sectPr></w:body></w:document>`;
 const types=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
 const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
 const wordrels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
 const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="20"/><w:color w:val="243142"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;
 const core=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>FactoRH C3 PRO - Reporte Ejecutivo</dc:title><dc:creator>FactoRH</dc:creator><dc:description>Resultados agregados, versión prepiloto.</dc:description></cp:coreProperties>`;
 return makeZip([
  {name:"[Content_Types].xml",data:types},
  {name:"_rels/.rels",data:rels},
  {name:"word/document.xml",data:document},
  {name:"word/_rels/document.xml.rels",data:wordrels},
  {name:"word/styles.xml",data:styles},
  {name:"docProps/core.xml",data:core},
 ]);
}
