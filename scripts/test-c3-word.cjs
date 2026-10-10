/* Native C3 PRO DOCX integrity and privacy guard smoke test.
 * Uses only fictitious aggregated data and never reads Supabase.
 */
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const vm=require("node:vm");
const childProcess=require("node:child_process");
const ts=require("typescript");

const reporting={
 c3Format:(v,d=1)=>typeof v==="number"?v.toFixed(d):"—",
};
function compile(file,imports={}){
 const source=fs.readFileSync(path.join(__dirname,"..",file),"utf8");
 const compiled=ts.transpileModule(source,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true
 }}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(compiled,{
   module:mod,exports:mod.exports,Buffer,
   require:(name)=>{
    if(name==="./report")return reporting;
    if(Object.prototype.hasOwnProperty.call(imports,name))return imports[name];
    throw new Error("Unexpected import: "+name);
   },
 },{filename:file,timeout:12000});
 return mod.exports;
}
const consulting=compile("lib/c3/consulting.ts");
const word=compile("lib/c3/word.ts",{"./consulting":consulting});
const pillars=[
 {name:"Clima",score:73},{name:"Cultura",score:75},{name:"Compromiso",score:77}
];
const names=[
 ["D01","Liderazgo inmediato","Clima"],["D02","Comunicación interna","Clima"],
 ["D03","Colaboración y relaciones","Clima"],["D04","Condiciones y recursos","Clima"],
 ["D05","Reconocimiento y valoración del trabajo","Clima"],
 ["D13","Compensaciones, beneficios y equidad","Clima"],
 ["D06","Valores y congruencia","Cultura"],["D07","Ética, respeto y justicia","Cultura"],
 ["D08","Orientación a resultados","Cultura"],["D09","Adaptabilidad y mejora continua","Cultura"],
 ["D10","Orgullo y pertenencia","Compromiso"],["D11","Motivación y contribución","Compromiso"],
 ["D12","Permanencia y futuro","Compromiso"]
];
const report={
 campaign:{id:"11111111-1111-1111-1111-111111111111",name:"Campaña SINTÉTICA 2026",bank_version:"1.6-prepiloto",status:"closed",scope:"operativo_administrativo"},
 organization:"EMPRESA SINTÉTICA · DATOS FICTICIOS",
 generatedAt:"2026-10-10T10:00:00.000Z",
 demo:true,
 summary:{suppressed:false,completed:18,invitations:20,population:20,global:75,enps:20,pillars,
  dimensions:names.map(([code,name,pillar],i)=>({
    code,name,pillar,score:55+i*3,favorability:60+i*2,neutrality:15,unfavorable:25,
    participants:18,suppressed:false
  }))
 }
};
if(!consulting.c3ReadyToReport(report.summary))throw new Error("Expected synthetic report to be publishable.");
const bytes=word.createC3WordReport(report);
if(!Buffer.isBuffer(bytes)||bytes.length<7500)throw new Error("DOCX generation returned an invalid or suspiciously short payload.");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"factorh-c3-qa-"));
const filename=path.join(tmp,"c3-report-qa.docx");
fs.writeFileSync(filename,bytes);
try{
 childProcess.execFileSync("unzip",["-t",filename],{stdio:"pipe"});
 const content=childProcess.execFileSync("unzip",["-p",filename,"word/document.xml"],{encoding:"utf8"});
 const expected=["DATOS FICTICIOS","Lectura ejecutiva","Liderazgo inmediato","Compensaciones, beneficios y equidad",
   "Oportunidades y plan de acción","Decisiones","Días 31–60","Metodología","eNPS"];
 for(const marker of expected){if(!content.includes(marker))throw new Error("Word output missing content: "+marker);}
 if((content.match(/<w:tbl>/g)||[]).length<5)throw new Error("Tables and action plan were not rendered.");
 const blocked={...report,summary:{...report.summary,suppressed:true}};
 let rejected=false;
 try{word.createC3WordReport(blocked);}catch{rejected=true;}
 if(!rejected)throw new Error("Privacy guard failed to reject suppressed report.");
 const operational=consulting.c3OperationalBand(64);
 if(operational!=="Atención")throw new Error("Provisional scoring band mismatch.");
 console.log("PASS C3 CONSULTING WORD: valid native DOCX, 13 dimensions, 90-day plan, privacy suppression.");
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
