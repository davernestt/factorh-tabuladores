import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { buildPsychometricDocx } from "../lib/psychometric-docx";
import type { PsychometricExportData } from "../app/protected/psicometrias/export-actions";

const long = "Texto ficticio QA para comprobar que la información no se empalma ni se trunca. ".repeat(14);
const data: PsychometricExportData = {
  title: "Informe QA de Psicometrías - Datos Ficticios",
  subtitle: "Solo para comprobación de exportaciones",
  personName: "Candidato QA Ficticio",
  organizationName: "Empresa de Pruebas QA",
  jobTitle: "Analista de QA",
  area: "Pruebas",
  reportDate: "22 de octubre de 2026",
  executiveSummary: [long,long],
  keyFindings: ["Fortaleza sintética",long],
  cautions: ["Precaución sintética"],
  instruments: [{
    name: "Instrumento técnico QA",
    chart: "radar",
    summary: [long],
    dimensions: [
      { name: "Dimensión 1", value: 77, narrative: long, potential: "Evidencia de prueba" },
      { name: "Dimensión 2", value: 55, watchout: long },
    ],
    highlights: [long],
    watchouts: [long],
  }],
};
async function main() {
  // PNG 1x1 válido y no vinculado a una persona real.
  const image = "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAKUlEQVR4nGP8//8/AzbAhFWUgYGBhYGB4VeJOJooW89LnDpIl2Ak2VUAf7YJCw1pW3AAAAAASUVORK5CYII=";
  const blob=buildPsychometricDocx(data,[{name:"chart-1.png",base64:image}],true);
  assert.equal(blob.type,"application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  const bytes=Buffer.from(await blob.arrayBuffer());
  writeFileSync("/tmp/factorh_psychometric_qa.docx", bytes);
  assert.equal(bytes.readUInt32LE(0),0x04034b50,"ZIP local header");
  assert.ok(bytes.includes(Buffer.from("word/document.xml")),"Documento Word nativo");
  assert.ok(bytes.includes(Buffer.from("word/media/chart-1.png")),"Imagen de gráfico integrada");
  assert.ok(bytes.includes(Buffer.from("word/_rels/document.xml.rels")),"Relaciones OOXML");
  const text=bytes.toString("utf8");
  assert.ok(text.includes("Informe QA de Psicometrías"),"Texto original conservado");
  assert.ok(text.includes("Dimensión 1")&&text.includes("Dimensión 2"));
  assert.ok(text.includes("wp:inline"),"Gráfica no flotante: evitar empalmes");
  assert.ok(text.includes("w:pgSz"),"Configuración de página A4");
  assert.ok(!text.includes("<table class='results'>"),"No usar tablas HTML de ancho arbitrario");
  const exportSource=readFileSync("app/protected/psicometrias/export-actions.tsx","utf8");
  assert.match(exportSource,/buildPsychometricDocx\(data, chartImages, integral\)/);
  assert.match(exportSource,/sanitize\(fileName\) \+ "\.docx"/);
  assert.doesNotMatch(exportSource,/sanitize\(fileName\) \+ "\.doc"/);
  assert.match(exportSource,/dimensionTileHeight\(ctx, left, gridW\)/);
  assert.match(exportSource,/if \(dy \+ height \+ 16 > pageBottom\) continuePage\(\)/);
  assert.match(exportSource,/function dimensionTileNarrative\(/);
  assert.match(exportSource,/const totalLines = items.reduce\(/);
  console.log("PSYCHOMETRIC_LAYOUT_QA_OK: DOCX nativo con imágenes inline, PDF con tarjetas adaptables y paginación");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
