import type {Block,Report} from "./report-model";

const esc=(s:unknown)=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
 .replace(/"/g,"&quot;").replace(/\r/g,"").replace(/\t/g," ");
function run(text:string,bold=false,size=16,color="323232"):string{
 const lines=esc(text).split("\n");
 return '<w:r><w:rPr>'+(bold?'<w:b/>':'')+
  '<w:color w:val="'+color+'"/><w:sz w:val="'+size+'"/>'+
  '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial"/></w:rPr>'+
  lines.map((line,i)=>(i?'<w:br/>':'')+'<w:t xml:space="preserve">'+line+'</w:t>').join("")+
  '</w:r>';
}
function p(text:string,options:{size?:number;bold?:boolean;color?:string;align?:string;before?:number;after?:number;shade?:string}={}):string{
 const pr='<w:pPr><w:spacing w:before="'+(options.before||0)+'" w:after="'+(options.after??50)+'"/>'+
  (options.align?'<w:jc w:val="'+options.align+'"/>':'')+
  (options.shade?'<w:shd w:fill="'+options.shade+'"/>':'')+'</w:pPr>';
 return '<w:p>'+pr+run(text,options.bold,options.size??15,options.color)+'</w:p>';
}
const gray="444444",orange="F05A14";
function mark():string{
 return '<w:p><w:pPr><w:spacing w:after="15"/></w:pPr>'+
  run("Facto",true,38,"737373")+run("RH",true,38,orange)+
  run("    FORMATO MAESTRO  |  Estudio Socioeconómico y Laboral",false,12,"555555")+'</w:p>';
}
function bar(text:string):string{
 return p(text,{size:15,bold:true,color:"FFFFFF",shade:gray,after:0,before:45,align:"center"});
}
function cell(text:string,width:number,heading=false):string{
 const w=Math.max(320,Math.round(width));
 const props='<w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/>'+
  '<w:tcBorders><w:top w:val="single" w:sz="4" w:color="CFCFCF"/>'+
  '<w:bottom w:val="single" w:sz="4" w:color="CFCFCF"/>'+
  '<w:left w:val="single" w:sz="4" w:color="CFCFCF"/>'+
  '<w:right w:val="single" w:sz="4" w:color="CFCFCF"/></w:tcBorders>'+
  (heading?'<w:shd w:fill="444444"/>':'')+
  '<w:tcMar><w:top w:w="38" w:type="dxa"/><w:bottom w:w="38" w:type="dxa"/>'+
  '<w:left w:w="65" w:type="dxa"/><w:right w:w="65" w:type="dxa"/></w:tcMar></w:tcPr>';
 return '<w:tc>'+props+'<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'+
  run(text,heading,heading?12:12,heading?"FFFFFF":"333333")+'</w:p></w:tc>';
}
function table(headers:string[],rows:string[][],widths?:number[]):string{
 const n=Math.max(1,headers.length),ws=widths?.length===n?widths:Array(n).fill(1);
 const total=ws.reduce((s,x)=>s+x,0);
 const dw=ws.map(w=>Math.floor(10310*w/total));
 const grid=dw.map(w=>'<w:gridCol w:w="'+w+'"/>').join("");
 const tr=(values:string[],heading=false)=>'<w:tr>'+Array.from({length:n},(_,i)=>cell(values[i]||"",dw[i],heading)).join("")+'</w:tr>';
 return '<w:tbl><w:tblPr><w:tblW w:w="10310" w:type="dxa"/>'+
  '<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>'+grid+'</w:tblGrid>'+
  tr(headers,true)+rows.map(r=>tr(r)).join("")+'</w:tbl>'+p("",{size:4,after:0});
}
function content(block:Block):string{
 if(block.kind==="bar")return bar(block.text);
 if(block.kind==="text")return p(block.text,{size:Math.round((block.size||8)*2),color:"666666",after:80});
 if(block.kind==="table")return table(block.headers,block.rows,block.widths);
 if(block.kind==="box")return '<w:tbl><w:tblPr><w:tblW w:w="10310" w:type="dxa"/></w:tblPr>'+
  '<w:tblGrid><w:gridCol w:w="10310"/></w:tblGrid>'+
  '<w:tr><w:tc><w:tcPr><w:tcW w:w="10310" w:type="dxa"/>'+
  '<w:tcBorders><w:top w:val="single" w:sz="5" w:color="CFCFCF"/>'+
  '<w:bottom w:val="single" w:sz="5" w:color="CFCFCF"/>'+
  '<w:left w:val="single" w:sz="5" w:color="CFCFCF"/>'+
  '<w:right w:val="single" w:sz="5" w:color="CFCFCF"/></w:tcBorders>'+
  '<w:tcMar><w:top w:w="130" w:type="dxa"/><w:bottom w:w="130" w:type="dxa"/>'+
  '<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>'+
  p(block.text,{size:15,after:65})+'</w:tc></w:tr></w:tbl>'+p("",{size:5,after:30});
 return "";
}
/** Compone un archivo Word OOXML sin depender de servicios externos ni cargas de la plantilla. */
export function makeEseDocx(report:Report):Buffer{
 const pages=report.pages.map((page,i)=>{
  return (i?'<w:p><w:r><w:br w:type="page"/></w:r></w:p>':"")+
   mark()+
   p("ESTUDIO SOCIOECONÓMICO Y LABORAL",{size:20,bold:true,align:"center",after:20})+
   p(report.version+"  ·  "+report.caseName+"  ·  "+report.studyType,{size:12,color:orange,after:50,align:"center"})+
   page.blocks.map(content).join("")+
   p("Documento confidencial | Uso exclusivo del proceso autorizado                      Página "+(i+1)+" de 13",
    {size:11,color:"888888",before:85});
 }).join("");
 const document='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
  '<w:body>'+pages+
  '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'+
  '<w:pgMar w:top="830" w:right="750" w:bottom="760" w:left="750" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr>'+
  '</w:body></w:document>';
 const types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
  '<Default Extension="xml" ContentType="application/xml"/>'+
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
  '</Types>';
 const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
  '</Relationships>';
 return zip([
  ["[Content_Types].xml",Buffer.from(types)],
  ["_rels/.rels",Buffer.from(rels)],
  ["word/document.xml",Buffer.from(document)]
 ]);
}
function crc32(buffer:Buffer):number{
 let n=0xffffffff;
 for(const byte of buffer){n^=byte;for(let j=0;j<8;j++)n=(n>>>1)^((n&1)?0xedb88320:0);}
 return (n^0xffffffff)>>>0;
}
function zip(items:Array<[string,Buffer]>):Buffer{
 const chunks:Buffer[]=[],central:Buffer[]=[];
 let offset=0;
 for(const [name,data] of items){
  const file=Buffer.from(name,"utf8"),crc=crc32(data);
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);
  local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);
  local.writeUInt16LE(0,8);local.writeUInt32LE(crc,14);
  local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);
  local.writeUInt16LE(file.length,26);
  chunks.push(local,file,data);
  const dir=Buffer.alloc(46);dir.writeUInt32LE(0x02014b50,0);
  dir.writeUInt16LE(20,4);dir.writeUInt16LE(20,6);dir.writeUInt16LE(0x800,8);
  dir.writeUInt32LE(crc,16);dir.writeUInt32LE(data.length,20);dir.writeUInt32LE(data.length,24);
  dir.writeUInt16LE(file.length,28);dir.writeUInt32LE(offset,42);
  central.push(dir,file);
  offset+=local.length+file.length+data.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(items.length,8);
 end.writeUInt16LE(items.length,10);end.writeUInt32LE(directory.length,12);
 end.writeUInt32LE(offset,16);
 return Buffer.concat([...chunks,directory,end]);
}
