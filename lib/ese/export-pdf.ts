import type {Block,Report} from "./report-model";

/** PDF autónomo: tamaño carta; secciones y tablas espejo del Word. */
const PW=612,PH=792,L=35,R=35,B=52,W=PW-L-R;
type Context={ops:string[];y:number;heading:string;pageNumber:number};
function str(v:string):string{
 return v.replace(/[\u2010-\u2015]/g,"-").replace(/[•]/g,"-").replace(/[\u2018\u2019]/g,"'")
  .replace(/[\u201c\u201d]/g,'"').replace(/[^\x20-\xFF\n]/g,"?");
}
function pdfText(t:string):string{return str(t).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").replace(/\n/g," ");}
function lines(t:string,maxWidth:number,font=8,maxLines=0):string[]{
 const out:string[]=[];let line="";
 const approx=(s:string)=>s.length*font*.53;
 for(const segment of t.replace(/\r/g,"").split("\n")){
  for(const word of segment.split(/\s+/)){
   if(!word)continue;
   if(!line){line=word;continue;}
   if(approx(line+" "+word)<=maxWidth){line+=" "+word;continue;}
   out.push(line);line=word;
   while(approx(line)>maxWidth&&line.length>3){
    let at=Math.max(2,Math.floor(maxWidth/(font*.53)));
    out.push(line.slice(0,at));line=line.slice(at);
   }
  }
  if(line){out.push(line);line="";}
 }
 if(!out.length)out.push("");
 return maxLines?out.slice(0,maxLines):out;
}
function rgb(hex:string){
 const v=hex.match(/[0-9a-f]{2}/gi)||["00","00","00"];
 return v.slice(0,3).map(x=>(parseInt(x,16)/255).toFixed(3)).join(" ");
}
function fill(ctx:Context,x:number,y:number,w:number,h:number,color:string){
 ctx.ops.push(rgb(color)+" rg "+x.toFixed(2)+" "+y.toFixed(2)+" "+w.toFixed(2)+" "+h.toFixed(2)+" re f");
}
function stroke(ctx:Context,x:number,y:number,w:number,h:number,color="CBCBCB"){
 ctx.ops.push(rgb(color)+" RG .45 w "+x.toFixed(2)+" "+y.toFixed(2)+" "+w.toFixed(2)+" "+h.toFixed(2)+" re S");
}
function text(ctx:Context,s:string,x:number,y:number,size=8,bold=false,color="343434"){
 ctx.ops.push(rgb(color)+" rg BT /"+(bold?"F2":"F1")+" "+size+" Tf 1 0 0 1 "+x.toFixed(2)+" "+y.toFixed(2)+" Tm ("+pdfText(s)+") Tj ET");
}
function header(ctx:Context,report:Report,continuation=false){
 fill(ctx,0,0,PW,PH,"FFFFFF");
 text(ctx,"Facto",L,751,25,true,"737373");
 text(ctx,"RH",L+65,751,25,true,"F05A14");
 text(ctx,"FORMATO MAESTRO  |  ESTUDIO SOCIOECONÓMICO Y LABORAL",298,753,8,true,"444444");
 fill(ctx,L,738,W,1.6,"F05A14");
 text(ctx,report.version,L,717,8,true,"F05A14");
 const label=continuation?"CONTINUACIÓN · "+ctx.heading:ctx.heading;
 text(ctx,label,L,695,12,true,"333333");
 ctx.y=677;
}
function footer(ctx:Context,num:number){
 fill(ctx,L,39,W,.55,"DDDDDD");
 text(ctx,"Documento confidencial  |  Uso exclusivo del proceso autorizado",L,27,7,false,"808080");
 text(ctx,"Página "+num,525,27,7,false,"808080");
}
function makePage(report:Report,heading:string,number:number,continued=false):Context{
 const c:Context={ops:[],y:0,heading,pageNumber:number};
 header(c,report,continued);return c;
}
function drawBody(ctx:Context,report:Report,block:Block,pages:Context[]){
 const required=blockHeight(block);
 if(ctx.y-required<B){
  const next=makePage(report,ctx.heading,pages.length+1,true);
  pages.push(next);ctx=next;
 }
 if(block.kind==="bar"){
  fill(ctx,L,ctx.y-20,W,20,"434343");
  fill(ctx,L,ctx.y-20,W,1.2,"F05A14");
  text(ctx,block.text,L+8,ctx.y-14,9,true,"FFFFFF");
  ctx.y-=24;
 }else if(block.kind==="text"){
  const fs=block.size||8,rr=lines(block.text,W,fs);
  rr.forEach(t=>{text(ctx,t,L,ctx.y-10,fs,false,"6B6B6B");ctx.y-=fs+5});
  ctx.y-=4;
 }else if(block.kind==="box"){
  const height=Math.max(block.height||55,32),part=block.text.split("\n");
  fill(ctx,L,ctx.y-height,W,height,"FCFCFC");
  stroke(ctx,L,ctx.y-height,W,height);
  let cursor=ctx.y-16;
  part.forEach((paragraph,idx)=>{
   const ls=lines(paragraph,W-20,idx===0?8.2:8);
   ls.forEach(t=>{if(cursor>ctx.y-height+10){text(ctx,t,L+10,cursor,idx===0?8.2:8,idx===0,"444444");cursor-=12;}});
  });
  ctx.y-=height+6;
 }else if(block.kind==="table"){
  const weights=block.widths&&block.widths.length===block.headers.length?block.widths:Array(block.headers.length).fill(1);
  const n=weights.length,total=weights.reduce((a,b)=>a+b,0);
  const widths=weights.map(x=>W*x/total);
  const rows=[block.headers,...block.rows];
  rows.forEach((row,index)=>{
   const h=rowHeight(row,widths,index===0);
   if(ctx.y-h<B){
    const next=makePage(report,ctx.heading,pages.length+1,true);pages.push(next);ctx=next;
   }
   let x=L;const y=ctx.y-h;
   row.forEach((value,i)=>{
    const width=widths[i];
    if(index===0)fill(ctx,x,y,width,h,"434343");else fill(ctx,x,y,width,h,"FFFFFF");
    stroke(ctx,x,y,width,h);
    const fs=index===0?7.0:7.2;
    const rr=lines(String(value||""),width-9,fs);
    let top=ctx.y-10;
    rr.forEach(t=>{text(ctx,t,x+4,top,fs,index===0,index===0?"FFFFFF":"383838");top-=9;});
    x+=width;
   });
   ctx.y-=h;
  });
  ctx.y-=6;
 }
 return ctx;
}
function rowHeight(row:string[],widths:number[],header=false){
 const fs=header?7.0:7.2;
 const n=Math.max(...row.map((v,i)=>lines(String(v||""),widths[i]-9,fs).length),1);
 return Math.max(header?20:17,8+n*9);
}
function blockHeight(block:Block):number{
 if(block.kind==="bar")return 24;
 if(block.kind==="text")return lines(block.text,W,block.size||8).length*((block.size||8)+5)+4;
 if(block.kind==="box")return Math.max(block.height||55,32)+6;
 const weights=block.widths&&block.widths.length===block.headers.length?block.widths:Array(block.headers.length).fill(1);
 const total=weights.reduce((a,b)=>a+b,0),widths=weights.map(x=>W*x/total);
 return [block.headers,...block.rows].reduce((s,row,i)=>s+rowHeight(row,widths,i===0),6);
}
/** Produce un PDF descargable con 13 páginas base y páginas de continuación si la información excede el espacio. */
export function makeEsePdf(report:Report):Buffer{
 const pages:Context[]=[];
 report.pages.forEach(page=>{
  let ctx=makePage(report,page.heading,pages.length+1);
  pages.push(ctx);
  for(const block of page.blocks)ctx=drawBody(ctx,report,block,pages);
 });
 pages.forEach((p,i)=>footer(p,i+1));
 const objects:Buffer[]=[];
 const obj=(body:Buffer|string)=>{objects.push(Buffer.isBuffer(body)?body:Buffer.from(body,"latin1"));return objects.length;};
 obj("<< /Type /Catalog /Pages 2 0 R >>"); // 1
 obj("<< /Type /Pages /Kids [] /Count 0 >>"); // 2 replaced after allocating pages
 obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); // 3
 obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"); // 4
 const pageIds:number[]=[];
 for(const page of pages){
  const stream=Buffer.from(page.ops.join("\n"),"latin1");
  const streamObj=obj(Buffer.concat([Buffer.from("<< /Length "+stream.length+" >>\nstream\n"),stream,Buffer.from("\nendstream")]));
  const p=obj("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents "+streamObj+" 0 R >>");
  pageIds.push(p);
 }
 objects[1]=Buffer.from("<< /Type /Pages /Kids ["+pageIds.map(n=>n+" 0 R").join(" ")+"] /Count "+pageIds.length+" >>");
 const parts:Buffer[]=[Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n","latin1")],offsets=[0];
 let offset=parts[0].length;
 for(let i=0;i<objects.length;i++){
  const chunk=Buffer.concat([Buffer.from((i+1)+" 0 obj\n"),objects[i],Buffer.from("\nendobj\n")]);
  offsets.push(offset);parts.push(chunk);offset+=chunk.length;
 }
 const xref=offset;
 let end="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";
 for(let i=1;i<offsets.length;i++)end+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
 end+="trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF";
 parts.push(Buffer.from(end));
 return Buffer.concat(parts);
}
