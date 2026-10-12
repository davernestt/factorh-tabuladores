import {nom035Simulation} from "../lib/nom035/demo-data";
import {validateNom035Bank,nom035SampleSize} from "../lib/nom035/official-scoring";
import {GUIDE1_QUESTIONS} from "../lib/nom035/guide1";
import {NOM035_OFFICIAL_BANK} from "../lib/nom035/official-bank";

function assert(condition:unknown,why:string):asserts condition{
 if(!condition)throw new Error("NOM035 DEMO CHECK FAILED: "+why);
}
assert(validateNom035Bank(),"Missing guide domain classification");
assert(NOM035_OFFICIAL_BANK.II.length===46,"Guide II count");
assert(NOM035_OFFICIAL_BANK.III.length===72,"Guide III count");
assert(GUIDE1_QUESTIONS.length===14,"Guide I conditional section length");
const first=nom035Simulation(),second=nom035Simulation();
assert(JSON.stringify(first)===JSON.stringify(second),"simulation must be deterministic");
assert(first.guide1.completed===110&&first.guide1.invited===120,"Guide I virtual participants");
assert(first.guide1.referralCount<=first.guide1.exposureCount,"Guide I clinical direction counts");
assert(first.guide1.exposureCount<=first.guide1.completed,"Guide I exposure counts");
assert(first.guideII.population===34&&first.guideII.completed===34,"Guide II census");
assert(first.guideIII.population===120&&first.guideIII.completed===94,"Guide III virtual sample");
assert(first.guideIII.sampleMinimum===nom035SampleSize(120)&&
 first.guideIII.completed>=first.guideIII.sampleMinimum,"Guide III sample minimum");
for(const g of [first.guideII,first.guideIII]){
 assert(g.total.counts.reduce((sum,entry)=>sum+entry.count,0)===g.completed,
  "Final risk level counts total Guide "+g.guide);
 assert(g.categories.length===(g.guide==="II"?4:5),"Category count "+g.guide);
 assert(g.domains.length===(g.guide==="II"?8:10),"Domain count "+g.guide);
 for(const category of [...g.categories,...g.domains]){
  assert(category.counts.reduce((s,c)=>s+c.count,0)===g.completed,
   "Aggregated category/domain count "+g.guide+" "+category.name);
 }
 assert(g.answeredAverage+g.skippedAverage===(g.guide==="II"?46:72),
  "Conditional answering average completeness "+g.guide);
}
assert(first.requirements.length===9,"Must show nine demo obligations");
console.log("NOM035_DEMO_OK",JSON.stringify({
 guideI:{invited:first.guide1.invited,completed:first.guide1.completed,
  exposed:first.guide1.exposureCount,referrals:first.guide1.referralCount},
 guideII:{completed:first.guideII.completed,average:first.guideII.averageScore,
  levels:first.guideII.total.counts.map(x=>({name:x.level,count:x.count}))},
 guideIII:{completed:first.guideIII.completed,minimum:first.guideIII.sampleMinimum,
  average:first.guideIII.averageScore,
  levels:first.guideIII.total.counts.map(x=>({name:x.level,count:x.count}))},
 totalDocuments:first.totalDocuments
}));


// Verify a structurally valid Office Open XML report can be generated
// without connecting to a real center or accessing personal data.
import {writeFileSync} from "node:fs";
import {buildNom035WordReport} from "../lib/nom035/word-export";
const word=buildNom035WordReport({
 kind:"technical",company:"Empresa Ficticia",center:"Planta Demostración",
 address:"Calle Prueba 10, Guadalajara, Jalisco",activity:"Servicio de prueba",
 guide:"III",version:"DOF-2018-v1",population:120,target:94,completed:94,
 covered:true,validated:false,objective:"Ejemplo de objetivo de identificación de riesgos",
 activities:"Ejemplo de aplicación de instrumentos oficiales",
 method:"Muestreo de ejemplo con respuestas ficticias y criterios de calificación",
 conclusions:"Conclusiones ficticias sujetas a validación profesional",
 recommendations:"Medidas de prevención simuladas",interventions:"",
 responsible:"Consultor de prueba",license:"",aggregates:[],actions:[]
});
assert(word.subarray(0,4).toString("latin1")==="PK\x03\x04","DOCX ZIP file signature");
assert(word.length>1000,"DOCX minimum size");
writeFileSync("/tmp/factorh_nom035_report_smoke.docx",word);
console.log("NOM035_WORD_OK "+word.length+" bytes");
