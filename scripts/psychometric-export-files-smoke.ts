import { strict as assert } from "node:assert";
import { buildImagePdf, buildMhtml } from "../app/protected/psicometrias/export-actions";

async function run() {
  // JPEG mínimo de referencia: sólo sirve para probar el empaquetado, no el contenido del informe.
  const jpeg = new Uint8Array(Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwB+AB//2Q==",
    "base64",
  ));
  const pdfBlob = buildImagePdf([jpeg]);
  assert.equal(pdfBlob.type, "application/pdf");
  const pdf = Buffer.from(await pdfBlob.arrayBuffer());
  assert.ok(pdf.subarray(0, 8).toString("utf8").startsWith("%PDF-1.4"));
  const content = pdf.toString("latin1");
  assert.match(content, /\/Type \/Pages/);
  assert.match(content, /\/Count 1/);
  assert.match(content, /\/Subtype \/Image/);
  assert.match(content, /\/DCTDecode/);
  assert.match(content, /xref\n0 6\n/);
  assert.match(content, /startxref\n\d+\n%%EOF$/);
  const xrefOffset = Number(content.match(/startxref\n(\d+)\n%%EOF$/)?.[1]);
  assert.equal(content.slice(xrefOffset, xrefOffset + 4), "xref");

  const html = '<html><body><h1>Reporte FICTICIO de QA</h1><img src="chart-1.png"></body></html>';
  const word = buildMhtml(html, [{name:"chart-1.png",base64:Buffer.from("IMAGEN DE PRUEBA").toString("base64")}]);
  assert.match(word, /^MIME-Version: 1\.0/);
  assert.match(word, /Content-Type: multipart\/related/);
  assert.match(word, /Content-Type: text\/html; charset="utf-8"/);
  assert.match(word, /Content-Type: image\/png/);
  assert.match(word, /Content-Location: chart-1\.png/);
  assert.ok(word.includes("Reporte FICTICIO de QA"));
  assert.ok(word.includes("----=_NextPart_FactoRH_Psychometrics--"));
  console.log("PSYCHOMETRIC_EXPORT_FILES_OK: PDF válido estructural y Word .doc MHTML empaquetado");
}
run().catch(error => { console.error(error); process.exitCode=1; });
