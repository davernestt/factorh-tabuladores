import type { PsychometricExportData } from "@/app/protected/psicometrias/export-actions";

type Image = { name: string; base64: string };
const encoder = new TextEncoder();
const xml = (v: string | number | null | undefined) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
function run(value: string, props = "") {
  return "<w:r><w:rPr>" + props + "</w:rPr><w:t xml:space=\"preserve\">" + xml(value) + "</w:t></w:r>";
}
function p(value: string, opts: {size?:number; bold?:boolean; color?:string; space?:number; keep?:boolean; page?:boolean} = {}) {
  const size = opts.size ?? 22;
  const after = opts.space ?? 130;
  const rpr = "<w:rFonts w:ascii=\"Arial\" w:hAnsi=\"Arial\"/>" +
    "<w:sz w:val=\"" + size + "\"/>" +
    (opts.bold ? "<w:b/>" : "") +
    (opts.color ? "<w:color w:val=\"" + opts.color + "\"/>" : "");
  const ppr = "<w:pPr><w:spacing w:before=\"0\" w:after=\"" + after + "\" w:line=\"310\" w:lineRule=\"auto\"/>" +
    (opts.keep ? "<w:keepNext/>" : "") + "<w:widowControl/></w:pPr>";
  return "<w:p>" + ppr + (opts.page ? "<w:r><w:br w:type=\"page\"/></w:r>" : "") +
    run(value, rpr) + "</w:p>";
}
const title = (s:string,page=false) => p(s,{size:32,bold:true,color:"292929",space:240,keep:true,page});
const heading = (s:string) => p(s,{size:26,bold:true,color:"333333",space:170,keep:true});
const subheading = (s:string) => p(s,{size:22,bold:true,color:"B45309",space:110,keep:true});
const body = (s:string) => p(s,{size:21,space:110});
const bullet = (s:string) => p("•  "+s,{size:21,space:100});
const paragraphs = (items:string[] | undefined) => (items??[]).filter(Boolean).map(body).join("");
const bullets = (items:string[] | undefined) => (items??[]).filter(Boolean).map(bullet).join("");
function pic(relId: string, id: number) {
  const cx=4974336, cy=3244122; // 5.44 x 3.55 in, inside A4 margins.
  return '<w:p><w:pPr><w:spacing w:before="120" w:after="220"/><w:jc w:val="center"/></w:pPr>' +
  '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
  '<wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+id+'" name="Gráfica del instrumento"/>' +
  '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
  '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="'+id+'" name="Gráfica '+id+'"/><pic:cNvPicPr/></pic:nvPicPr>' +
  '<pic:blipFill><a:blip r:embed="'+relId+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>' +
  '<a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm>' +
  '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>' +
  '</wp:inline></w:drawing></w:r></w:p>';
}
function zip(entries: Array<{path:string;data:Uint8Array}>):Uint8Array {
  const local:Uint8Array[] = [], central:Uint8Array[] = [];
  let offset=0;
  for(const entry of entries){
    const name=encoder.encode(entry.path), bytes=entry.data;
    let crc=0xffffffff;
    for(const b of bytes){
      crc^=b;
      for(let k=0;k<8;k++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
    }
    crc=(crc^0xffffffff)>>>0;
    const h=new Uint8Array(30+name.length),v=new DataView(h.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);
    v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);
    v.setUint16(26,name.length,true);h.set(name,30);local.push(h,bytes);
    const c=new Uint8Array(46+name.length),cv=new DataView(c.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);
    cv.setUint16(8,0x0800,true);cv.setUint32(16,crc,true);
    cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);
    cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);
    c.set(name,46);central.push(c);
    offset+=h.length+bytes.length;
  }
  const centralOffset=offset,centralSize=central.reduce((n,b)=>n+b.length,0);
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);
  v.setUint16(10,entries.length,true);v.setUint32(12,centralSize,true);
  v.setUint32(16,centralOffset,true);
  const all=[...local,...central,end],out=new Uint8Array(all.reduce((n,b)=>n+b.length,0));
  let idx=0;for(const chunk of all){out.set(chunk,idx);idx+=chunk.length;}return out;
}
function decodeBase64(s:string):Uint8Array {
  const raw=atob(s);const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return bytes;
}
/** Native, editable .docx with flowing paragraphs and images. No fixed-height HTML tables. */
export function buildPsychometricDocx(data:PsychometricExportData, chartImages:Image[],integral:boolean):Blob {
  let doc="";
  doc+=p("FactoRH · Evaluaciones psicométricas",{bold:true,size:25,color:"EA580C",space:250});
  doc+=title(data.title);
  doc+=p(data.subtitle || (integral?"Síntesis ejecutiva y resultados por instrumento":"Reporte ejecutivo"),{size:22,color:"666666"});
  doc+=body("Persona evaluada: "+data.personName);
  doc+=body("Organización: "+data.organizationName);
  if(data.jobTitle)doc+=body("Puesto: "+data.jobTitle);
  if(data.area)doc+=body("Área: "+data.area);
  if(data.processName)doc+=body("Proceso: "+data.processName);
  doc+=body("Fecha del informe: "+data.reportDate);
  doc+=heading("Resumen ejecutivo");
  doc+=paragraphs(data.executiveSummary);
  if(data.keyFindings?.length){doc+=subheading("Fortalezas y señales favorables");doc+=bullets(data.keyFindings);}
  if(data.cautions?.length){doc+=subheading("Aspectos por validar");doc+=bullets(data.cautions);}
  if(data.objectiveText){doc+=heading("Objetivo de la evaluación");doc+=body(data.objectiveText);}
  if(data.battery?.length){doc+=heading("Batería aplicada");for(const item of data.battery){doc+=subheading(item.name);doc+=body(item.description);}}
  if(data.jobComparison?.length){
    doc+=heading("Alineación con el perfil objetivo");
    for(const item of data.jobComparison){
      doc+=subheading(item.name+" · "+item.status);
      doc+=body("Referencia: "+item.referenceMin+"–"+item.referenceMax+" | Evidencia: "+(item.observed??"No disponible")+" | Importancia: "+item.importance);
    }
  }
  if(data.managerGuidance){
    doc+=heading("Lectura para el jefe de la vacante");
    doc+=subheading("Supervisión recomendada");doc+=body(data.managerGuidance.supervision);
    doc+=subheading("Bajo presión");doc+=body(data.managerGuidance.pressure);
    doc+=subheading("Integración con el equipo");doc+=body(data.managerGuidance.team);
    if(data.managerGuidance.motivators.length){doc+=subheading("Motivadores clave");doc+=bullets(data.managerGuidance.motivators);}
    if(data.managerGuidance.coaching.length){doc+=subheading("Retroalimentación y coaching");doc+=bullets(data.managerGuidance.coaching);}
  }
  if(data.onboardingPlan?.length){
    doc+=heading("Plan de integración");
    for(const stage of data.onboardingPlan){doc+=subheading(stage.period+" · "+stage.focus);doc+=bullets(stage.actions);}
  }
  data.instruments.forEach((instrument,index)=>{
    doc+=title("Prueba "+(index+1)+" de "+data.instruments.length+" · "+instrument.name,true);
    if(instrument.subtitle)doc+=body(instrument.subtitle);
    if(instrument.overallDisplay)doc+=subheading((instrument.overallLabel||"Resultado global")+": "+instrument.overallDisplay);
    if(chartImages[index])doc+=pic("rId"+(index+1),index+1);
    doc+=paragraphs(instrument.summary);
    doc+=heading("Resultados por dimensión");
    for(const item of instrument.dimensions){
      doc+=subheading(item.name+" · "+(item.displayValue||String(Math.round(item.value))));
      if(item.band)doc+=body("Clasificación: "+item.band);
      if(item.narrative)doc+=body(item.narrative);
      if(item.potential)doc+=body("Puede aportar: "+item.potential);
      if(item.watchout)doc+=body("Conviene observar: "+item.watchout);
    }
    if(instrument.highlights?.length){doc+=subheading("Elementos destacados");doc+=bullets(instrument.highlights);}
    if(instrument.watchouts?.length){doc+=subheading("Puntos para profundizar");doc+=bullets(instrument.watchouts);}
  });
  if(data.interviewQuestions?.length){doc+=title("Guía para entrevista",true);data.interviewQuestions.forEach((q,i)=>doc+=body((i+1)+". "+q));}
  doc+=heading("Conclusión para toma de decisión");
  doc+=body(data.closing || "Integrar resultados con entrevista, experiencia, referencias y requisitos reales del puesto.");
  const documentXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
    '<w:body>'+doc+'<w:sectPr><w:pgSz w:w="11907" w:h="16840"/><w:pgMar w:top="1100" w:right="1180" w:bottom="1100" w:left="1180" w:header="500" w:footer="500"/></w:sectPr></w:body></w:document>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    chartImages.map((im,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/chart-'+(i+1)+'.png"/>').join("")+'</Relationships>';
  const files:Array<{path:string;data:Uint8Array}>=[
    {path:"[Content_Types].xml",data:encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')},
    {path:"_rels/.rels",data:encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')},
    {path:"word/document.xml",data:encoder.encode(documentXml)},
    {path:"word/_rels/document.xml.rels",data:encoder.encode(rels)},
    ...chartImages.map((im,i)=>({path:"word/media/chart-"+(i+1)+".png",data:decodeBase64(im.base64)}))
  ];
  const bytes=zip(files);
  return new Blob([bytes as unknown as BlobPart],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
