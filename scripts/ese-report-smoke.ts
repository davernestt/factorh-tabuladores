import {strict as assert} from "node:assert";
import {writeFileSync} from "node:fs";
import {buildEseReport} from "../lib/ese/report-model";
import {makeEsePdf} from "../lib/ese/export-pdf";
import {makeEseDocx} from "../lib/ese/export-docx";

const report=buildEseReport({
 caseName:"PERSONA DE DEMOSTRACIÓN",companyName:"EMPRESA DEMOSTRACIÓN",
 studyType:"Integral",position:"Auxiliar de almacén",approvedVisit:true,approvedReferences:true,
 visit:{
  "id.name":"Persona Ejemplo", "visit_result":"realizada",
  "visit_observations":"Se efectuó la visita de demostración sin registrar información real.",
  "housing.type":"Rentada",
  "income.0.person":"Persona Ejemplo","income.0.amount":"20000",
  "income.1.person":"Familiar ficticio","income.1.amount":"5000",
  "expense.0.amount":"3800","expense.1.amount":"6800",
  "expense.2.amount":"1000","finance.notes":"Egresos declarados mensuales de prueba."
 },
 references:{
  "labor.0.company":"Empresa Laboral Ficticia","labor.0.position":"Almacenista",
  "labor.0.rating.0":"5","labor.0.conclusion":"Referencias de prueba corroboradas."
 },
 review:{
  "executive.summary":"Síntesis de hallazgos enteramente simulados.",
  "research.report":"Información ficticia de prueba sin datos personales reales.",
  "verdict.result":"No concluyente",
  "verdict.rationale":"Los hallazgos simulados son insuficientes para emitir una conclusión definitiva."
 }
});
assert.equal(report.pages.length,13,"13 páginas de estructura de reporte");
const p5=JSON.stringify(report.pages[4]);
assert.match(p5,/\$25,000\.00/,"suma mensual de ingresos");
assert.match(p5,/\$11,600\.00/,"suma mensual de egresos");
assert.match(p5,/\$13,400\.00/,"balance mensual");
assert.equal(report.version,"VISTA PREVIA VALIDADA");
const pdf=makeEsePdf(report),docx=makeEseDocx(report);
assert.ok(pdf.subarray(0,8).toString("latin1").startsWith("%PDF-1.4"),"PDF header");
assert.equal(pdf.includes(Buffer.from("%%EOF")),true,"PDF footer");
assert.ok(docx.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04])),"Word ZIP");
assert.ok(pdf.length>10000&&docx.length>10000,"nonempty report files");
const pageCount=(pdf.toString("latin1").match(/\/Type \/Page \/Parent /g)||[]).length;
assert.ok(pageCount>=13,"13 pages or more when content flows");
const xml=docx.toString("utf8");
assert.ok(xml.includes("word/document.xml"),"Word main entry");
assert.ok(pdf.includes(Buffer.from("Facto","latin1")),"Facto wordmark");
writeFileSync("/tmp/factorh_ese_master_smoke.pdf",pdf);
writeFileSync("/tmp/factorh_ese_master_smoke.docx",docx);
console.log("ESE_REPORT_SMOKE_OK",JSON.stringify({pages:pageCount,pdfBytes:pdf.length,docxBytes:docx.length,sections:report.pages.length}));
