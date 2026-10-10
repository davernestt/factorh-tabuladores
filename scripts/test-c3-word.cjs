/* Smoke test: generate a native DOCX using synthetic, non-sensitive C3 data.
 * Executes the same TypeScript generator shipped in the Next.js server.
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const childProcess = require("node:child_process");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname,"..","lib","c3","word.ts"),"utf8");
const compiled = ts.transpileModule(source,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}
}).outputText;
const fakeReportExports = {
 c3Format: v => typeof v==="number"?v.toFixed(1):"—",
 c3Opportunities: s=>(s.dimensions||[]).slice(0,3).map(d=>({code:d.code,name:d.name,score:d.score,action:"Revisar hallazgos",measure:"Evaluar cambios"})),
 c3Strengths: s=>(s.dimensions||[]).slice(-2),
};
const moduleObject={exports:{}};
vm.runInNewContext(compiled,{
 module:moduleObject,exports:moduleObject.exports,Buffer,
 require:(s)=>s==="./report"?fakeReportExports:require(s)
},{filename:"lib/c3/word.ts"});
const report={
 campaign:{id:"11111111-1111-1111-1111-111111111111",name:"Campaña sintética de QA",bank_version:"1.6",status:"closed",scope:"operativo_administrativo"},
 organization:"Organización sintética",
 generatedAt:new Date("2026-10-10T10:00:00Z").toISOString(),
 summary:{suppressed:false,completed:7,invitations:8,population:10,global:74.8,enps:15,
  pillars:[{name:"Clima",score:73.2},{name:"Cultura",score:76.4},{name:"Compromiso",score:74.8}],
  dimensions:Array.from({length:13},(_,i)=>({code:"D"+String(i+1).padStart(2,"0"),name:"Dimensión sintética "+(i+1),pillar:"Clima",score:60+i*2,favorability:67,neutrality:25,unfavorable:8,participants:7,suppressed:false}))
 }
};
const bytes=moduleObject.exports.createC3WordReport(report);
if(!Buffer.isBuffer(bytes)||bytes.length<4000)throw new Error("Native Word export produced invalid/empty bytes.");
const folder=fs.mkdtempSync(path.join(os.tmpdir(),"factorh-c3-word-test-"));
const file=path.join(folder,"test-c3.docx");
fs.writeFileSync(file,bytes);
try{
 childProcess.execFileSync("unzip",["-t",file],{stdio:"pipe"});
 const doc=childProcess.execFileSync("unzip",["-p",file,"word/document.xml"],{encoding:"utf8"});
 if(!doc.includes("Organización sintética")||!doc.includes("Dimensión sintética 13")||!doc.includes("FactoRH"))
  throw new Error("Document XML is missing expected report content.");
 console.log("C3 WORD EXPORT TEST PASS: valid DOCX ZIP, report content and 13 dimensions.");
}finally{
 fs.rmSync(folder,{recursive:true,force:true});
}
