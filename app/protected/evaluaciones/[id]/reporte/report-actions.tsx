"use client";

import { useState } from "react";

type DimensionExport = {
  id: string;
  name: string;
  order: number;
  score: number | null;
  level: string;
  tone: "strong" | "functional" | "attention" | "priority";
  narrative: string;
  strongestItem: string | null;
  developmentItem: string | null;
  qualitativeEvidence: string[];
};

type PlanExport = {
  competency: string;
  currentFinding: string;
  targetBehavior: string;
  action: string;
  indicator: string;
  day30: string;
  day60: string;
  day90: string;
};

type ReportData = {
  personName: string;
  jobTitle: string | null;
  area: string | null;
  organizationName: string;
  templateName: string;
  sourceLabel: string;
  evaluatorName: string | null;
  reportDate: string;
  overall: number | null;
  overallLevel: string;
  executiveSummary: string;
  perspectiveNote: string;
  dimensions: DimensionExport[];
  strengths: DimensionExport[];
  priorities: DimensionExport[];
  risks: string[];
  plan: PlanExport[];
  openResponses: Array<{ prompt: string; answer: string }>;
};

type Props = {
  fileName: string;
  reportData: ReportData;
};

export default function ReportActions({ fileName, reportData }: Props) {
  const [exporting, setExporting] = useState<"pdf" | "word" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadPdf() {
    const report = document.getElementById("leadership-report");
    if (!report || exporting) return;

    setExporting("pdf");
    setError(null);

    try {
      await document.fonts?.ready;
      const pageJpegs = await renderReportToJpegPages(report);
      const pdf = buildImagePdf(pageJpegs, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT);
      triggerDownload(pdf, `${sanitize(fileName)}.pdf`);
    } catch (cause) {
      console.error(cause);
      setError("No fue posible generar el PDF. Intenta nuevamente.");
    } finally {
      setExporting(null);
    }
  }

  function downloadWord() {
    if (exporting) return;
    setExporting("word");
    setError(null);

    try {
      const html = buildWordReport(reportData);
      const blob = new Blob(["\ufeff", html], {
        type: "application/msword;charset=utf-8",
      });
      triggerDownload(blob, `${sanitize(fileName)}.doc`);
    } catch (cause) {
      console.error(cause);
      setError("No fue posible generar el archivo de Word.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="no-print">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void downloadPdf()}
          disabled={Boolean(exporting)}
          className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-50"
        >
          {exporting === "pdf" ? "Generando PDF..." : "Descargar PDF"}
        </button>
        <button
          type="button"
          onClick={downloadWord}
          disabled={Boolean(exporting)}
          className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-50"
        >
          {exporting === "word" ? "Generando Word..." : "Descargar Word"}
        </button>
      </div>
      {error && <div className="mt-2 text-xs font-semibold text-red-600">{error}</div>}
    </div>
  );
}

const PDF_PAGE_WIDTH = 1240;
const PDF_PAGE_HEIGHT = 1754;
const PDF_MARGIN = 62;
const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2;
const PDF_CONTENT_HEIGHT = PDF_PAGE_HEIGHT - PDF_MARGIN * 2;

async function renderReportToJpegPages(report: HTMLElement) {
  const blocks: HTMLElement[] = [];
  const header = report.children.item(0);
  const body = report.children.item(1);

  if (header instanceof HTMLElement) blocks.push(header);
  if (body instanceof HTMLElement) {
    for (const child of Array.from(body.children)) {
      if (child instanceof HTMLElement) blocks.push(child);
    }
  }

  const pages: HTMLCanvasElement[] = [];
  let page = createPdfPage();
  let pageContext = page.getContext("2d");
  if (!pageContext) throw new Error("Canvas no disponible.");
  let cursorY = PDF_MARGIN;

  function newPage() {
    pages.push(page);
    page = createPdfPage();
    pageContext = page.getContext("2d");
    if (!pageContext) throw new Error("Canvas no disponible.");
    cursorY = PDF_MARGIN;
  }

  for (const block of blocks) {
    const canvas = await renderElement(block);
    if (!canvas.width || !canvas.height) continue;

    const breakBefore =
      block.classList.contains("break-before-page") ||
      getComputedStyle(block).breakBefore === "page";

    const scale = PDF_CONTENT_WIDTH / canvas.width;
    const scaledHeight = canvas.height * scale;

    if (breakBefore && cursorY > PDF_MARGIN + 8) newPage();

    const remaining = PDF_MARGIN + PDF_CONTENT_HEIGHT - cursorY;
    if (scaledHeight <= PDF_CONTENT_HEIGHT && scaledHeight > remaining && cursorY > PDF_MARGIN + 8) {
      newPage();
    }

    let sourceY = 0;
    while (sourceY < canvas.height) {
      const available = PDF_MARGIN + PDF_CONTENT_HEIGHT - cursorY;
      if (available <= 4) {
        newPage();
        continue;
      }

      const sourceHeightAvailable = available / scale;
      const sourceHeight = Math.min(canvas.height - sourceY, sourceHeightAvailable);
      const destinationHeight = sourceHeight * scale;

      pageContext.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sourceHeight,
        PDF_MARGIN,
        cursorY,
        PDF_CONTENT_WIDTH,
        destinationHeight,
      );

      sourceY += sourceHeight;
      cursorY += destinationHeight;

      if (sourceY < canvas.height) {
        newPage();
      }
    }

    cursorY += 24;
  }

  pages.push(page);

  return pages.map((canvas) => dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.92)));
}

function createPdfPage() {
  const canvas = document.createElement("canvas");
  canvas.width = PDF_PAGE_WIDTH;
  canvas.height = PDF_PAGE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas no disponible.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

async function renderElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));

  const clone = element.cloneNode(true) as HTMLElement;
  inlineComputedStyles(element, clone);
  clone.style.margin = "0";
  clone.style.width = `${width}px`;
  clone.style.maxWidth = "none";
  clone.style.boxSizing = "border-box";

  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject x="0" y="0" width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#fff;">
          ${serialized}
        </div>
      </foreignObject>
    </svg>
  `;

  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas no disponible.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function inlineComputedStyles(source: Element, target: Element) {
  if (source instanceof HTMLElement || source instanceof SVGElement) {
    const computed = getComputedStyle(source);
    let css = "";
    for (let index = 0; index < computed.length; index += 1) {
      const property = computed.item(index);
      const value = computed.getPropertyValue(property);
      if (value) css += `${property}:${value};`;
    }
    target.setAttribute("style", css);
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  for (let index = 0; index < sourceChildren.length; index += 1) {
    if (targetChildren[index]) {
      inlineComputedStyles(sourceChildren[index], targetChildren[index]);
    }
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No fue posible rasterizar el reporte."));
    image.src = url;
  });
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function buildImagePdf(images: Uint8Array[], widthPx: number, heightPx: number) {
  const encoder = new TextEncoder();
  const objects: Uint8Array[] = [];
  const pageIds: number[] = [];
  const mediaWidth = 595.28;
  const mediaHeight = 841.89;

  const objectCount = 2 + images.length * 3;
  const objectBodies = new Map<number, Uint8Array>();

  objectBodies.set(1, encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));

  for (let index = 0; index < images.length; index += 1) {
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    pageIds.push(pageId);

    objectBodies.set(
      pageId,
      encoder.encode(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${mediaWidth} ${mediaHeight}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );

    const stream = `q\n${mediaWidth} 0 0 ${mediaHeight} 0 0 cm\n/Im0 Do\nQ\n`;
    const streamBytes = encoder.encode(stream);
    objectBodies.set(
      contentId,
      concatBytes(
        encoder.encode(`<< /Length ${streamBytes.length} >>\nstream\n`),
        streamBytes,
        encoder.encode("endstream"),
      ),
    );

    objectBodies.set(
      imageId,
      concatBytes(
        encoder.encode(
          `<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${images[index].length} >>\nstream\n`,
        ),
        images[index],
        encoder.encode("\nendstream"),
      ),
    );
  }

  objectBodies.set(
    2,
    encoder.encode(
      `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`,
    ),
  );

  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = new Array<number>(objectCount + 1).fill(0);
  let totalLength = parts[0].length;

  for (let id = 1; id <= objectCount; id += 1) {
    const body = objectBodies.get(id);
    if (!body) throw new Error(`Falta objeto PDF ${id}`);
    offsets[id] = totalLength;
    const objectBytes = concatBytes(
      encoder.encode(`${id} 0 obj\n`),
      body,
      encoder.encode("\nendobj\n"),
    );
    objects.push(objectBytes);
    parts.push(objectBytes);
    totalLength += objectBytes.length;
  }

  const xrefOffset = totalLength;
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objectCount; id += 1) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(encoder.encode(xref));

  return new Blob(parts, { type: "application/pdf" });
}

function concatBytes(...parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function buildWordReport(data: ReportData) {
  const dimensions = data.dimensions
    .map(
      (item) => `
        <table class="card" role="presentation">
          <tr>
            <td class="section-title">Dimensión ${item.order} · ${escapeHtml(item.name)}</td>
            <td class="score">${item.score === null ? "—" : item.score.toFixed(2) + " / 5"}</td>
          </tr>
          <tr><td colspan="2"><span class="pill ${toneClass(item.tone)}">${escapeHtml(item.level)}</span></td></tr>
          <tr><td colspan="2" class="body-text">${escapeHtml(item.narrative)}</td></tr>
          ${item.qualitativeEvidence.length ? `<tr><td colspan="2" class="evidence"><b>Evidencia cualitativa:</b><br/>${item.qualitativeEvidence.map((value) => "• " + escapeHtml(value)).join("<br/>")}</td></tr>` : ""}
        </table>`,
    )
    .join("");

  const strengths = data.strengths
    .map((item) => `<tr><td><b>${escapeHtml(item.name)}</b><br/><span class="muted">${escapeHtml(item.strongestItem ?? "")}</span></td><td class="mini-score">${item.score?.toFixed(2) ?? "—"}</td></tr>`)
    .join("");
  const priorities = data.priorities
    .map((item) => `<tr><td><b>${escapeHtml(item.name)}</b><br/><span class="muted">${escapeHtml(item.developmentItem ?? "")}</span></td><td class="mini-score">${item.score?.toFixed(2) ?? "—"}</td></tr>`)
    .join("");

  const dimensionRows = data.dimensions
    .map((item) => {
      const percent = item.score === null ? 0 : Math.max(0, Math.min(100, item.score * 20));
      return `
        <tr>
          <td class="dim-name">${escapeHtml(item.name)}</td>
          <td class="dim-score">${item.score === null ? "—" : item.score.toFixed(2)}</td>
          <td>
            <table class="bar-table" role="presentation"><tr>
              <td bgcolor="#f97316" style="width:${percent}%;height:10px;font-size:1px;">&nbsp;</td>
              <td bgcolor="#f1f5f9" style="width:${100 - percent}%;height:10px;font-size:1px;">&nbsp;</td>
            </tr></table>
          </td>
          <td><span class="small-pill ${toneClass(item.tone)}">${escapeHtml(shortLevel(item.level))}</span></td>
        </tr>
      `;
    })
    .join("");

  const plans = data.plan
    .map(
      (item, index) => `
        <table class="plan" role="presentation">
          <tr><td colspan="2" class="plan-head"><span>PRIORIDAD ${index + 1}</span><br/><b>${escapeHtml(item.competency)}</b></td></tr>
          <tr><td><b>Hallazgo actual</b><br/>${escapeHtml(item.currentFinding)}</td><td><b>Conducta esperada</b><br/>${escapeHtml(item.targetBehavior)}</td></tr>
          <tr><td><b>Acción concreta</b><br/>${escapeHtml(item.action)}</td><td><b>Indicador</b><br/>${escapeHtml(item.indicator)}</td></tr>
          <tr>
            <td colspan="2">
              <table class="timeline" role="presentation"><tr>
                <td><b>30 días</b><br/>${escapeHtml(item.day30)}</td>
                <td><b>60 días</b><br/>${escapeHtml(item.day60)}</td>
                <td><b>90 días</b><br/>${escapeHtml(item.day90)}</td>
              </tr></table>
            </td>
          </tr>
        </table>
      `,
    )
    .join("");

  const responses = data.openResponses
    .map((item) => `<table class="response" role="presentation"><tr><td><b>${escapeHtml(item.prompt)}</b><br/><span class="response-answer">${escapeHtml(item.answer)}</span></td></tr></table>`)
    .join("");

  const risks = data.risks.length
    ? `
      <table class="risk-box" role="presentation">
        <tr><td><div class="eyebrow risk">RIESGOS DE DESARROLLO</div><h2>Impactos posibles si las brechas no se trabajan</h2>${data.risks.map((risk) => `<p>• ${escapeHtml(risk)}</p>`).join("")}</td></tr>
      </table>
    `
    : "";

  const evaluator = data.evaluatorName
    ? `<div class="meta-line"><b>Evaluador:</b> ${escapeHtml(data.evaluatorName)}</div>`
    : "";

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <title>${escapeHtml(data.templateName)}</title>
        <style>
          @page { size: A4; margin: 1.4cm; }
          body { font-family: Arial, Helvetica, sans-serif; color:#171717; font-size:10.5pt; line-height:1.45; }
          table { border-collapse:collapse; width:100%; }
          td { vertical-align:top; }
          h1 { font-size:24pt; line-height:1.05; margin:0; color:#ffffff; }
          h2 { font-size:15pt; margin:4px 0 8px; color:#171717; }
          .header { background:#171717; color:#ffffff; }
          .header td { padding:22px; }
          .brand { font-size:20pt; font-weight:bold; }
          .orange { color:#f97316; }
          .program { color:#a3a3a3; font-size:8pt; letter-spacing:1.5px; }
          .header-meta { border:1px solid #404040; background:#262626; padding:12px; color:#e5e5e5; }
          .header-meta b { color:#ffffff; }
          .spacer { height:14px; }
          .metrics td { width:20%; padding:10px; border:1px solid #e5e7eb; background:#fafafa; }
          .metric-label { font-size:7.5pt; color:#737373; font-weight:bold; text-transform:uppercase; }
          .metric-value { font-size:15pt; font-weight:bold; color:#171717; margin-top:5px; }
          .summary { background:#fff7ed; border:1px solid #fed7aa; }
          .summary td, .risk-box td { padding:16px; }
          .eyebrow { font-size:8pt; font-weight:bold; letter-spacing:1.2px; color:#c2410c; }
          .body-text { padding:12px 14px 14px; color:#404040; }
          .muted { color:#737373; font-size:9pt; }
          .overview { margin-top:8px; }
          .overview th { background:#171717; color:#ffffff; padding:8px; font-size:8.5pt; text-align:left; }
          .overview td { border-bottom:1px solid #e5e7eb; padding:8px; }
          .dim-name { width:28%; font-weight:bold; }
          .dim-score { width:9%; text-align:center; font-weight:bold; }
          .bar-table { width:100%; }
          .card { margin-top:10px; border:1px solid #e5e7eb; page-break-inside:avoid; }
          .card td { border:0; }
          .section-title { padding:12px 14px 4px; font-size:12pt; font-weight:bold; }
          .score { padding:12px 14px 4px; text-align:right; font-size:17pt; font-weight:bold; width:18%; }
          .pill, .small-pill { display:inline-block; padding:4px 8px; border-radius:10px; font-size:8pt; font-weight:bold; margin:2px 14px 7px; }
          .small-pill { margin:0; }
          .tone-strong { background:#ecfdf5; color:#065f46; }
          .tone-functional { background:#eff6ff; color:#1e40af; }
          .tone-attention { background:#fffbeb; color:#92400e; }
          .tone-priority { background:#fef2f2; color:#991b1b; }
          .evidence { padding:10px 14px; background:#fafafa; color:#525252; border-top:1px solid #eeeeee !important; }
          .split { margin-top:14px; }
          .split > tbody > tr > td { width:50%; padding:0 5px; }
          .mini-card { border:1px solid #e5e7eb; }
          .mini-card .head { padding:12px; font-size:12pt; font-weight:bold; }
          .green { background:#ecfdf5; color:#065f46; }
          .amber { background:#fffbeb; color:#92400e; }
          .mini-card td td { padding:8px; border-top:1px solid #e5e7eb; }
          .mini-score { width:15%; text-align:right; font-weight:bold; }
          .risk-box { margin-top:14px; background:#fef2f2; border:1px solid #fecaca; }
          .risk { color:#b91c1c; }
          .plan { margin-top:12px; border:1px solid #d4d4d4; page-break-inside:avoid; }
          .plan td { padding:10px; border:1px solid #e5e7eb; width:50%; }
          .plan-head { background:#171717; color:#ffffff; font-size:12pt; }
          .plan-head span { color:#fb923c; font-size:8pt; letter-spacing:1px; }
          .timeline td { width:33.333%; background:#fafafa; font-size:9pt; border:0; }
          .timeline b { color:#ea580c; }
          .response { margin-top:8px; border:1px solid #e5e7eb; page-break-inside:avoid; }
          .response td { padding:10px 12px; }
          .response-answer { color:#525252; }
          .note { margin-top:16px; border-top:1px solid #d4d4d4; padding-top:10px; color:#737373; font-size:8.5pt; }
          .meta-line { margin-top:4px; color:#d4d4d4; font-size:8.5pt; }
          .page-break { page-break-before:always; }
        </style>
      </head>
      <body>
        <table class="header" role="presentation">
          <tr>
            <td style="width:58%;">
              <div class="brand">Factor<span class="orange">RH</span></div>
              <div class="program">PROGRAMA DE DESARROLLO DE LÍDERES</div>
              <div style="height:22px;"></div>
              <h1>Reporte de Competencias</h1>
              <div style="margin-top:6px;color:#d4d4d4;font-size:13pt;">${escapeHtml(data.templateName)}</div>
            </td>
            <td style="width:42%;padding-left:8px;">
              <div class="header-meta">
                <div style="color:#fb923c;font-size:8pt;font-weight:bold;">PERSONA EVALUADA</div>
                <div style="font-size:14pt;font-weight:bold;margin-top:5px;">${escapeHtml(data.personName)}</div>
                <div>${escapeHtml([data.jobTitle, data.area].filter(Boolean).join(" · ") || "Sin puesto registrado")}</div>
                <div>${escapeHtml(data.organizationName)}</div>
                <div class="meta-line"><b>Fuente:</b> ${escapeHtml(data.sourceLabel)}</div>
                ${evaluator}
              </div>
            </td>
          </tr>
        </table>

        <div class="spacer"></div>

        <table class="metrics" role="presentation"><tr>
          ${metricCell("Resultado global", data.overall === null ? "—" : data.overall.toFixed(2) + " / 5")}
          ${metricCell("Nivel", data.overallLevel)}
          ${metricCell("Dimensiones", String(data.dimensions.length))}
          ${metricCell("Fuente", data.sourceLabel)}
          ${metricCell("Fecha", data.reportDate)}
        </tr></table>

        <div class="spacer"></div>
        <table class="summary" role="presentation"><tr><td>
          <div class="eyebrow">SÍNTESIS EJECUTIVA</div>
          <h2>Lectura general del perfil</h2>
          <p>${escapeHtml(data.executiveSummary)}</p>
          <p class="muted">${escapeHtml(data.perspectiveNote)}</p>
        </td></tr></table>

        <h2 style="margin-top:20px;">Resultado por dimensión</h2>
        <table class="overview">
          <tr><th>Competencia</th><th>Resultado</th><th>Lectura visual</th><th>Nivel</th></tr>
          ${dimensionRows}
        </table>

        <h2 style="margin-top:20px;">Análisis por dimensión</h2>
        ${dimensions}

        <table class="split" role="presentation"><tr>
          <td><table class="mini-card"><tr><td class="head green" colspan="2">Fortalezas mejor posicionadas</td></tr>${strengths}</table></td>
          <td><table class="mini-card"><tr><td class="head amber" colspan="2">Focos prioritarios de desarrollo</td></tr>${priorities}</table></td>
        </tr></table>

        ${risks}

        <div class="page-break"></div>
        <div class="eyebrow">DESARROLLO</div>
        <h2>Plan de acción 30 · 60 · 90 días</h2>
        <p class="muted">Se priorizan hasta tres competencias y se proponen conductas, acciones e indicadores observables para el seguimiento.</p>
        ${plans}

        ${data.openResponses.length ? `<div class="page-break"></div><div class="eyebrow">ANEXO CUALITATIVO</div><h2>Respuestas abiertas</h2><p class="muted">Se presentan como evidencia del proceso y no como afirmaciones verificadas por sí mismas.</p>${responses}` : ""}

        <div class="note"><b>Nota metodológica.</b> Este reporte interpreta competencias y conductas laborales con base en las respuestas registradas en la herramienta. No constituye diagnóstico clínico, psicopatológico ni certificación de aptitud. Para decisiones de desarrollo relevantes debe contrastarse con evidencia de desempeño y demás instrumentos del programa.</div>
      </body>
    </html>
  `;
}

function metricCell(label: string, value: string) {
  return `<td><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div></td>`;
}

function toneClass(tone: DimensionExport["tone"]) {
  return `tone-${tone}`;
}

function shortLevel(value: string) {
  return value
    .replace("Fortaleza consolidada", "Fortaleza")
    .replace("Fortaleza funcional", "Fortaleza")
    .replace("Desempeño funcional con oportunidad", "Desarrollo")
    .replace("Brecha de desarrollo relevante", "Atención")
    .replace("Brecha prioritaria", "Prioridad");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br/>");
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function sanitize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
