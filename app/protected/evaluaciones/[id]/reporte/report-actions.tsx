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
  behavioralReading: string;
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
    if (exporting) return;

    setExporting("pdf");
    setError(null);

    try {
      await document.fonts?.ready;
      const pageJpegs = buildBrandedPdfPages(reportData);
      const pdf = buildImagePdf(pageJpegs, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT);
      triggerDownload(pdf, `${sanitize(fileName)}.pdf`);
    } catch (cause) {
      console.error(cause);
      setError("No fue posible generar el PDF. Intenta nuevamente.");
    } finally {
      setExporting(null);
    }
  }

  async function downloadWord() {
    if (exporting) return;
    setExporting("word");
    setError(null);

    try {
      await document.fonts?.ready;
      const radarDataUrl = buildWordRadarImage(reportData.dimensions);
      const radarBase64 = radarDataUrl.split(",")[1] ?? "";
      const html = buildWordReport(reportData, "radar.png");
      const mhtml = buildWordMhtml(html, radarBase64);
      const blob = new Blob(["\ufeff", mhtml], {
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


function buildBrandedPdfPages(data: ReportData) {
  const pages: HTMLCanvasElement[] = [];
  const first = createPdfPage();
  const ctx = first.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");

  drawPdfHeader(ctx, data);
  drawMetricRow(ctx, data, 420);
  drawExecutiveSummary(ctx, data, 585);
  drawFooter(ctx, 1);
  pages.push(first);

  const overview = createPdfPage();
  const overviewCtx = overview.getContext("2d");
  if (!overviewCtx) throw new Error("Canvas no disponible.");
  drawSectionPageHeader(overviewCtx, data, "Vista global de competencias");
  drawRadar(overviewCtx, data.dimensions, 320, 650, 205);
  drawRadarLegend(overviewCtx, data.dimensions, 85, 920, 465);
  drawDimensionBars(overviewCtx, data.dimensions, 650, 285, 500, 980);
  drawFooter(overviewCtx, 2);
  pages.push(overview);

  let pageNumber = 3;
  for (let index = 0; index < data.dimensions.length; index += 1) {
    const page = createPdfPage();
    const pageCtx = page.getContext("2d");
    if (!pageCtx) throw new Error("Canvas no disponible.");
    drawSectionPageHeader(pageCtx, data, "Interpretación por dimensión");
    let y = 210;
    for (const item of data.dimensions.slice(index, index + 1)) {
      y = drawDimensionCard(pageCtx, item, y);
      y += 34;
    }
    drawFooter(pageCtx, pageNumber++);
    pages.push(page);
  }

  const strengthsPage = createPdfPage();
  const strengthsCtx = strengthsPage.getContext("2d");
  if (!strengthsCtx) throw new Error("Canvas no disponible.");
  drawSectionPageHeader(strengthsCtx, data, "Fortalezas, prioridades y riesgos");
  drawStrengthPriorityColumns(strengthsCtx, data, 220);
  drawRisks(strengthsCtx, data.risks, 930);
  drawFooter(strengthsCtx, pageNumber++);
  pages.push(strengthsPage);

  if (data.plan.length) {
    for (let index = 0; index < data.plan.length; index += 2) {
      const page = createPdfPage();
      const pageCtx = page.getContext("2d");
      if (!pageCtx) throw new Error("Canvas no disponible.");
      drawSectionPageHeader(pageCtx, data, "Plan de acción 30 · 60 · 90 días");
      let y = 220;
      for (const item of data.plan.slice(index, index + 2)) {
        y = drawPlanCard(pageCtx, item, index + data.plan.slice(index, index + 2).indexOf(item) + 1, y);
        y += 28;
      }
      drawFooter(pageCtx, pageNumber++);
      pages.push(page);
    }
  }

  if (data.openResponses.length) {
    let page = createPdfPage();
    let pageCtx = page.getContext("2d");
    if (!pageCtx) throw new Error("Canvas no disponible.");
    drawSectionPageHeader(pageCtx, data, "Anexo cualitativo");
    let y = 220;

    for (const response of data.openResponses) {
      const needed = estimateTextHeight(pageCtx, response.prompt, 900, 28) + estimateTextHeight(pageCtx, response.answer, 900, 26) + 95;
      if (y + needed > PDF_PAGE_HEIGHT - 120) {
        drawFooter(pageCtx, pageNumber++);
        pages.push(page);
        page = createPdfPage();
        pageCtx = page.getContext("2d");
        if (!pageCtx) throw new Error("Canvas no disponible.");
        drawSectionPageHeader(pageCtx, data, "Anexo cualitativo");
        y = 220;
      }
      y = drawResponseCard(pageCtx, response, y);
      y += 22;
    }

    drawFooter(pageCtx, pageNumber++);
    pages.push(page);
  }

  return pages.map((canvas) => dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.92)));
}

function drawPdfHeader(ctx: CanvasRenderingContext2D, data: ReportData) {
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, PDF_PAGE_WIDTH, 360);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 34px Arial";
  ctx.fillText("Factor", 72, 82);
  const factorWidth = ctx.measureText("Factor").width;
  ctx.fillStyle = "#f97316";
  ctx.fillText("RH", 72 + factorWidth, 82);

  ctx.fillStyle = "#a3a3a3";
  ctx.font = "700 14px Arial";
  ctx.fillText("PROGRAMA DE DESARROLLO DE LÍDERES", 72, 118);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 46px Arial";
  ctx.fillText("Reporte de Competencias", 72, 215);

  ctx.fillStyle = "#d4d4d4";
  ctx.font = "24px Arial";
  drawWrappedText(ctx, data.templateName, 72, 252, 650, 30);

  roundRect(ctx, 835, 72, 330, 205, 20, "#1f1f1f", "#3f3f46");
  ctx.fillStyle = "#fb923c";
  ctx.font = "700 13px Arial";
  ctx.fillText("PERSONA EVALUADA", 865, 112);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 24px Arial";
  drawWrappedText(ctx, data.personName, 865, 150, 270, 28);
  ctx.fillStyle = "#d4d4d4";
  ctx.font = "16px Arial";
  drawWrappedText(ctx, [data.jobTitle, data.area].filter(Boolean).join(" · ") || "Sin puesto registrado", 865, 200, 270, 22);
  ctx.fillText(data.organizationName, 865, 252);
}

function drawSectionPageHeader(ctx: CanvasRenderingContext2D, data: ReportData, title: string) {
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, PDF_PAGE_WIDTH, 150);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 28px Arial";
  ctx.fillText("Factor", 62, 62);
  const w = ctx.measureText("Factor").width;
  ctx.fillStyle = "#f97316";
  ctx.fillText("RH", 62 + w, 62);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 24px Arial";
  ctx.fillText(title, 62, 112);

  ctx.fillStyle = "#a3a3a3";
  ctx.font = "14px Arial";
  const meta = `${data.personName} · ${data.templateName}`;
  ctx.fillText(clipCanvasText(ctx, meta, 560), 600, 88);
  ctx.fillText(`${data.organizationName} · ${data.reportDate}`, 600, 112);
}

function drawMetricRow(ctx: CanvasRenderingContext2D, data: ReportData, y: number) {
  const metrics = [
    ["Resultado global", data.overall === null ? "—" : `${data.overall.toFixed(2)} / 5`],
    ["Nivel", data.overallLevel],
    ["Dimensiones", String(data.dimensions.length)],
    ["Fuente", data.sourceLabel],
    ["Fecha", data.reportDate],
  ];
  const gap = 14;
  const width = (PDF_CONTENT_WIDTH - gap * 4) / 5;
  metrics.forEach(([label, value], index) => {
    const x = PDF_MARGIN + index * (width + gap);
    roundRect(ctx, x, y, width, 125, 18, "#fafafa", "#e5e5e5");
    ctx.fillStyle = "#a3a3a3";
    ctx.font = "700 12px Arial";
    ctx.fillText(label.toUpperCase(), x + 18, y + 32);
    ctx.fillStyle = "#171717";
    const metricFont = fitFontSize(ctx, value, width - 36, 28, 16, "800");
    ctx.font = `800 ${metricFont}px Arial`;
    drawWrappedText(ctx, value, x + 18, y + 66, width - 36, Math.max(20, metricFont + 4), 2);
  });
}

function drawExecutiveSummary(ctx: CanvasRenderingContext2D, data: ReportData, y: number) {
  const height = 340;
  roundRect(ctx, PDF_MARGIN, y, PDF_CONTENT_WIDTH, height, 20, "#fff7ed", "#fed7aa");
  ctx.fillStyle = "#c2410c";
  ctx.font = "700 13px Arial";
  ctx.fillText("SÍNTESIS EJECUTIVA", PDF_MARGIN + 24, y + 34);
  ctx.fillStyle = "#171717";
  ctx.font = "800 22px Arial";
  ctx.fillText("Lectura general del perfil", PDF_MARGIN + 24, y + 68);
  ctx.fillStyle = "#404040";
  ctx.font = "17px Arial";
  const summaryEnd = drawWrappedText(
    ctx,
    data.executiveSummary,
    PDF_MARGIN + 24,
    y + 106,
    PDF_CONTENT_WIDTH - 48,
    25,
    7,
  );

  const noteY = Math.max(y + 255, summaryEnd + 26);
  ctx.strokeStyle = "#fed7aa";
  ctx.beginPath();
  ctx.moveTo(PDF_MARGIN + 24, noteY - 18);
  ctx.lineTo(PDF_PAGE_WIDTH - PDF_MARGIN - 24, noteY - 18);
  ctx.stroke();

  ctx.fillStyle = "#9a3412";
  ctx.font = "700 12px Arial";
  ctx.fillText("CLAVE DE INTERPRETACIÓN", PDF_MARGIN + 24, noteY);
  ctx.fillStyle = "#737373";
  ctx.font = "15px Arial";
  drawWrappedText(
    ctx,
    data.perspectiveNote,
    PDF_MARGIN + 24,
    noteY + 28,
    PDF_CONTENT_WIDTH - 48,
    21,
    3,
  );
}

function drawRadar(ctx: CanvasRenderingContext2D, dimensions: DimensionExport[], cx: number, cy: number, radius: number) {
  ctx.fillStyle = "#171717";
  ctx.font = "800 24px Arial";
  ctx.fillText("Radar de competencias", PDF_MARGIN, 220);
  ctx.fillStyle = "#737373";
  ctx.font = "14px Arial";
  ctx.fillText("Los números del radar corresponden a la leyenda inferior.", PDF_MARGIN, 248);

  const count = Math.max(1, dimensions.length);
  for (let level = 1; level <= 5; level += 1) {
    ctx.beginPath();
    dimensions.forEach((_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
      const r = (radius * level) / 5;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  dimensions.forEach((_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    const axisX = cx + Math.cos(angle) * radius;
    const axisY = cy + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(axisX, axisY);
    ctx.strokeStyle = "#eeeeee";
    ctx.lineWidth = 1;
    ctx.stroke();

    const labelX = cx + Math.cos(angle) * (radius + 28);
    const labelY = cy + Math.sin(angle) * (radius + 28);
    ctx.beginPath();
    ctx.arc(labelX, labelY, 16, 0, Math.PI * 2);
    ctx.fillStyle = "#171717";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), labelX, labelY + 1);
  });

  ctx.beginPath();
  dimensions.forEach((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    const score = item.score ?? 0;
    const r = radius * Math.max(0, Math.min(5, score)) / 5;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(249,115,22,0.16)";
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 5;
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawRadarLegend(
  ctx: CanvasRenderingContext2D,
  dimensions: DimensionExport[],
  x: number,
  y: number,
  width: number,
) {
  ctx.fillStyle = "#171717";
  ctx.font = "800 17px Arial";
  ctx.fillText("Leyenda del radar", x, y);

  let rowY = y + 34;
  dimensions.forEach((item, index) => {
    ctx.beginPath();
    ctx.arc(x + 13, rowY - 5, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#171717";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), x + 13, rowY - 4);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#404040";
    ctx.font = "700 13px Arial";
    ctx.fillText(clipCanvasText(ctx, item.name, width - 84), x + 36, rowY);
    ctx.textAlign = "right";
    ctx.fillStyle = "#171717";
    ctx.font = "800 13px Arial";
    ctx.fillText(item.score === null ? "—" : item.score.toFixed(2), x + width, rowY);
    ctx.textAlign = "left";
    rowY += 31;
  });
}
function drawDimensionBars(ctx: CanvasRenderingContext2D, dimensions: DimensionExport[], x: number, y: number, width: number, height: number) {
  ctx.fillStyle = "#171717";
  ctx.font = "800 24px Arial";
  ctx.fillText("Resultado por dimensión", x, y - 52);
  ctx.fillStyle = "#737373";
  ctx.font = "14px Arial";
  ctx.fillText("Fortalezas y brechas en una sola vista.", x, y - 28);

  const rowHeight = Math.min(64, height / Math.max(1, dimensions.length));
  dimensions.forEach((item, index) => {
    const rowY = y + index * rowHeight;
    ctx.fillStyle = "#404040";
    ctx.font = "700 13px Arial";
    ctx.fillText(clipCanvasText(ctx, item.name, width - 100), x, rowY + 16);
    ctx.fillStyle = "#171717";
    ctx.font = "800 14px Arial";
    ctx.textAlign = "right";
    ctx.fillText(item.score === null ? "—" : item.score.toFixed(2), x + width, rowY + 16);
    ctx.textAlign = "left";

    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(x, rowY + 28, width, 12);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(x, rowY + 28, width * Math.max(0, Math.min(1, (item.score ?? 0) / 5)), 12);
  });
}

function drawDimensionCard(ctx: CanvasRenderingContext2D, item: DimensionExport, y: number) {
  const x = PDF_MARGIN;
  const width = PDF_CONTENT_WIDTH;
  const height = 1320;
  roundRect(ctx, x, y, width, height, 22, "#ffffff", "#e5e5e5");

  const tone = tonePalette(item.tone);
  ctx.fillStyle = tone.bg;
  ctx.fillRect(x + 1, y + 1, width - 2, 100);
  ctx.fillStyle = tone.fg;
  ctx.font = "700 13px Arial";
  ctx.fillText(`DIMENSIÓN ${item.order}`, x + 28, y + 36);
  ctx.fillStyle = "#171717";
  ctx.font = "800 28px Arial";
  ctx.fillText(item.name, x + 28, y + 76);

  ctx.textAlign = "right";
  ctx.font = "800 38px Arial";
  ctx.fillText(item.score === null ? "—" : item.score.toFixed(2), x + width - 30, y + 68);
  ctx.textAlign = "left";

  roundRect(ctx, x + 28, y + 128, 260, 42, 18, tone.badge, undefined);
  ctx.fillStyle = tone.fg;
  ctx.font = "700 13px Arial";
  ctx.fillText(shortLevel(item.level), x + 47, y + 155);

  ctx.fillStyle = "#404040";
  ctx.font = "17px Arial";
  let nextY = drawWrappedText(ctx, item.narrative, x + 28, y + 220, width - 56, 26, 7);

  const gap = 24;
  const boxWidth = (width - 80) / 2;
  const boxY = Math.max(y + 410, nextY + 36);

  if (item.strongestItem) {
    roundRect(ctx, x + 28, boxY, boxWidth, 235, 18, "#ecfdf5", "#a7f3d0");
    ctx.fillStyle = "#065f46";
    ctx.font = "700 12px Arial";
    ctx.fillText("CONDUCTA RELATIVAMENTE MÁS SÓLIDA", x + 48, boxY + 34);
    ctx.fillStyle = "#404040";
    ctx.font = "16px Arial";
    drawWrappedText(ctx, item.strongestItem, x + 48, boxY + 72, boxWidth - 40, 23, 6);
  }

  if (item.developmentItem) {
    const rightX = x + 28 + boxWidth + gap;
    roundRect(ctx, rightX, boxY, boxWidth, 235, 18, "#fff7ed", "#fed7aa");
    ctx.fillStyle = "#c2410c";
    ctx.font = "700 12px Arial";
    ctx.fillText("PRINCIPAL CONDUCTA A DESARROLLAR", rightX + 20, boxY + 34);
    ctx.fillStyle = "#404040";
    ctx.font = "16px Arial";
    drawWrappedText(ctx, item.developmentItem, rightX + 20, boxY + 72, boxWidth - 40, 23, 6);
  }

  const readingY = boxY + 275;
  roundRect(ctx, x + 28, readingY, width - 56, 300, 18, "#fafafa", "#e5e5e5");
  ctx.fillStyle = "#ea580c";
  ctx.font = "700 12px Arial";
  ctx.fillText("LECTURA CONDUCTUAL", x + 50, readingY + 36);
  ctx.fillStyle = "#404040";
  ctx.font = "16px Arial";
  drawWrappedText(ctx, item.behavioralReading, x + 50, readingY + 76, width - 100, 24, 8);

  if (item.qualitativeEvidence.length) {
    const evidenceY = readingY + 340;
    roundRect(ctx, x + 28, evidenceY, width - 56, 210, 18, "#ffffff", "#eeeeee");
    ctx.fillStyle = "#737373";
    ctx.font = "700 12px Arial";
    ctx.fillText("EVIDENCIA CUALITATIVA REPORTADA", x + 50, evidenceY + 34);
    ctx.fillStyle = "#525252";
    ctx.font = "italic 15px Arial";
    drawWrappedText(ctx, item.qualitativeEvidence.join(" · "), x + 50, evidenceY + 74, width - 100, 23, 5);
  }

  return y + height;
}
function drawStrengthPriorityColumns(ctx: CanvasRenderingContext2D, data: ReportData, y: number) {
  const gap = 24;
  const width = (PDF_CONTENT_WIDTH - gap) / 2;
  drawListPanel(ctx, PDF_MARGIN, y, width, "Fortalezas mejor posicionadas", data.strengths, "strong");
  drawListPanel(ctx, PDF_MARGIN + width + gap, y, width, "Focos prioritarios de desarrollo", data.priorities, "attention");
}

function drawListPanel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, title: string, items: DimensionExport[], tone: "strong" | "attention") {
  const palette = tone === "strong"
    ? { bg: "#ecfdf5", border: "#a7f3d0", title: "#065f46" }
    : { bg: "#fffbeb", border: "#fde68a", title: "#92400e" };
  roundRect(ctx, x, y, width, 610, 22, palette.bg, palette.border);
  ctx.fillStyle = palette.title;
  ctx.font = "800 22px Arial";
  drawWrappedText(ctx, title, x + 24, y + 44, width - 48, 26, 2);

  let rowY = y + 115;
  items.forEach((item) => {
    roundRect(ctx, x + 22, rowY, width - 44, 135, 16, "rgba(255,255,255,0.82)", undefined);
    ctx.fillStyle = "#171717";
    ctx.font = "800 17px Arial";
    drawWrappedText(ctx, item.name, x + 40, rowY + 35, width - 125, 22, 2);
    ctx.fillStyle = palette.title;
    ctx.font = "800 22px Arial";
    ctx.textAlign = "right";
    ctx.fillText(item.score?.toFixed(2) ?? "—", x + width - 40, rowY + 35);
    ctx.textAlign = "left";
    ctx.fillStyle = "#737373";
    ctx.font = "14px Arial";
    drawWrappedText(
      ctx,
      tone === "strong"
        ? item.strongestItem ?? item.narrative
        : item.developmentItem ?? item.narrative,
      x + 40,
      rowY + 73,
      width - 80,
      20,
      3,
    );
    rowY += 158;
  });
}

function drawRisks(ctx: CanvasRenderingContext2D, risks: string[], y: number) {
  if (!risks.length) return;
  roundRect(ctx, PDF_MARGIN, y, PDF_CONTENT_WIDTH, 600, 20, "#fef2f2", "#fecaca");
  ctx.fillStyle = "#b91c1c";
  ctx.font = "700 13px Arial";
  ctx.fillText("RIESGOS DE DESARROLLO", PDF_MARGIN + 24, y + 38);
  ctx.fillStyle = "#7f1d1d";
  ctx.font = "800 22px Arial";
  ctx.fillText("Impactos posibles si las brechas no se trabajan", PDF_MARGIN + 24, y + 76);

  let nextY = y + 125;
  ctx.font = "16px Arial";
  for (const risk of risks) {
    ctx.fillStyle = "#7f1d1d";
    nextY = drawWrappedText(ctx, `• ${risk}`, PDF_MARGIN + 32, nextY, PDF_CONTENT_WIDTH - 64, 24, 4) + 18;
  }
}

function drawPlanCard(ctx: CanvasRenderingContext2D, item: PlanExport, priority: number, y: number) {
  const x = PDF_MARGIN;
  const width = PDF_CONTENT_WIDTH;
  const height = 665;
  roundRect(ctx, x, y, width, height, 20, "#ffffff", "#d4d4d4");
  ctx.fillStyle = "#171717";
  ctx.fillRect(x + 1, y + 1, width - 2, 95);
  ctx.fillStyle = "#fb923c";
  ctx.font = "700 13px Arial";
  ctx.fillText(`PRIORIDAD ${priority}`, x + 26, y + 34);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 24px Arial";
  ctx.fillText(item.competency, x + 26, y + 70);

  const colWidth = (width - 78) / 2;
  const left = x + 26;
  const right = left + colWidth + 26;
  drawPlanCell(ctx, left, y + 130, colWidth, "Hallazgo actual", item.currentFinding);
  drawPlanCell(ctx, right, y + 130, colWidth, "Conducta esperada", item.targetBehavior);
  drawPlanCell(ctx, left, y + 310, colWidth, "Acción concreta", item.action);
  drawPlanCell(ctx, right, y + 310, colWidth, "Indicador", item.indicator);

  const boxWidth = (width - 104) / 3;
  [
    ["30 días", item.day30],
    ["60 días", item.day60],
    ["90 días", item.day90],
  ].forEach(([label, value], index) => {
    const bx = x + 26 + index * (boxWidth + 26);
    roundRect(ctx, bx, y + 500, boxWidth, 135, 14, "#fafafa", "#eeeeee");
    ctx.fillStyle = "#ea580c";
    ctx.font = "800 16px Arial";
    ctx.fillText(label, bx + 16, y + 528);
    ctx.fillStyle = "#525252";
    ctx.font = "13px Arial";
    drawWrappedText(ctx, value, bx + 16, y + 558, boxWidth - 32, 18, 4);
  });
  return y + height;
}

function drawPlanCell(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, label: string, value: string) {
  roundRect(ctx, x, y, width, 150, 14, "#ffffff", "#e5e5e5");
  ctx.fillStyle = "#a3a3a3";
  ctx.font = "700 12px Arial";
  ctx.fillText(label.toUpperCase(), x + 16, y + 28);
  ctx.fillStyle = "#404040";
  ctx.font = "15px Arial";
  drawWrappedText(ctx, value, x + 16, y + 58, width - 32, 21, 4);
}

function drawResponseCard(ctx: CanvasRenderingContext2D, response: { prompt: string; answer: string }, y: number) {
  const promptHeight = estimateTextHeight(ctx, response.prompt, PDF_CONTENT_WIDTH - 56, 24);
  const answerHeight = estimateTextHeight(ctx, response.answer, PDF_CONTENT_WIDTH - 56, 23);
  const height = promptHeight + answerHeight + 72;
  roundRect(ctx, PDF_MARGIN, y, PDF_CONTENT_WIDTH, height, 16, "#ffffff", "#e5e5e5");
  ctx.fillStyle = "#171717";
  ctx.font = "700 16px Arial";
  let next = drawWrappedText(ctx, response.prompt, PDF_MARGIN + 24, y + 34, PDF_CONTENT_WIDTH - 48, 23);
  ctx.fillStyle = "#525252";
  ctx.font = "15px Arial";
  next = drawWrappedText(ctx, response.answer, PDF_MARGIN + 24, next + 18, PDF_CONTENT_WIDTH - 48, 22);
  return y + height;
}

function drawFooter(ctx: CanvasRenderingContext2D, pageNumber: number) {
  ctx.strokeStyle = "#e5e5e5";
  ctx.beginPath();
  ctx.moveTo(PDF_MARGIN, PDF_PAGE_HEIGHT - 70);
  ctx.lineTo(PDF_PAGE_WIDTH - PDF_MARGIN, PDF_PAGE_HEIGHT - 70);
  ctx.stroke();

  ctx.fillStyle = "#a3a3a3";
  ctx.font = "12px Arial";
  ctx.fillText("FactorRH · Reporte de desarrollo de liderazgo · Confidencial", PDF_MARGIN, PDF_PAGE_HEIGHT - 38);
  ctx.textAlign = "right";
  ctx.fillText(`Página ${pageNumber}`, PDF_PAGE_WIDTH - PDF_MARGIN, PDF_PAGE_HEIGHT - 38);
  ctx.textAlign = "left";
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 999,
) {
  const paragraphs = String(text ?? "").split(/\n+/);
  let cursorY = y;
  let linesUsed = 0;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY);
        cursorY += lineHeight;
        linesUsed += 1;
        if (linesUsed >= maxLines) return cursorY;
        line = word;
      } else {
        line = test;
      }
    }
    if (line && linesUsed < maxLines) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
      linesUsed += 1;
    }
    if (linesUsed >= maxLines) return cursorY;
  }

  return cursorY;
}

function estimateTextHeight(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  let line = "";
  let lines = 1;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines += 1;
      line = word;
    } else {
      line = test;
    }
  }
  return lines * lineHeight;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill?: string,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function clipCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && ctx.measureText(value + "…").width > maxWidth) {
    value = value.slice(0, -1);
  }
  return value + "…";
}

function tonePalette(tone: DimensionExport["tone"]) {
  if (tone === "strong") return { bg: "#ecfdf5", badge: "#d1fae5", fg: "#065f46" };
  if (tone === "functional") return { bg: "#eff6ff", badge: "#dbeafe", fg: "#1e40af" };
  if (tone === "priority") return { bg: "#fef2f2", badge: "#fee2e2", fg: "#991b1b" };
  return { bg: "#fffbeb", badge: "#fef3c7", fg: "#92400e" };
}

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

  return new Blob(parts.map((part) => part as unknown as BlobPart), { type: "application/pdf" });
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

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  start: number,
  minimum: number,
  weight = "800",
) {
  for (let size = start; size >= minimum; size -= 1) {
    ctx.font = `${weight} ${size}px Arial`;
    if (ctx.measureText(value).width <= maxWidth) return size;
  }
  return minimum;
}

function buildWordRadarImage(dimensions: DimensionExport[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 920;
  canvas.height = 610;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = 300;
  const cy = 300;
  const radius = 205;
  const count = Math.max(1, dimensions.length);

  for (let level = 1; level <= 5; level += 1) {
    ctx.beginPath();
    dimensions.forEach((_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
      const r = (radius * level) / 5;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  dimensions.forEach((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.strokeStyle = "#eeeeee";
    ctx.stroke();

    const lx = cx + Math.cos(angle) * (radius + 25);
    const ly = cy + Math.sin(angle) * (radius + 25);
    ctx.beginPath();
    ctx.arc(lx, ly, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#171717";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), lx, ly + 1);
  });

  ctx.beginPath();
  dimensions.forEach((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    const r = radius * Math.max(0, Math.min(5, item.score ?? 0)) / 5;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(249,115,22,0.16)";
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 5;
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#171717";
  ctx.font = "800 20px Arial";
  ctx.fillText("Leyenda", 585, 72);

  let y = 110;
  dimensions.forEach((item, index) => {
    ctx.beginPath();
    ctx.arc(600, y - 4, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#171717";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 9px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), 600, y - 3);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#404040";
    ctx.font = "700 13px Arial";
    ctx.fillText(clipCanvasText(ctx, item.name, 230), 620, y);
    ctx.fillStyle = "#171717";
    ctx.font = "800 13px Arial";
    ctx.textAlign = "right";
    ctx.fillText(item.score === null ? "—" : item.score.toFixed(2), 890, y);
    ctx.textAlign = "left";
    y += 45;
  });

  return canvas.toDataURL("image/png");
}

function buildWordMhtml(html: string, radarBase64: string) {
  const boundary = "----=_NextPart_FactorRH_Report";
  return [
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "Content-Location: report.html",
    "",
    html,
    "",
    `--${boundary}`,
    "Content-Type: image/png",
    "Content-Transfer-Encoding: base64",
    "Content-Location: radar.png",
    "",
    wrapBase64(radarBase64),
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? value;
}

function buildWordReport(data: ReportData, radarImageName: string) {
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
          .radar-section { margin-top:16px; page-break-inside:avoid; }
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

        <table class="radar-section" role="presentation">
          <tr>
            <td style="width:48%;padding:14px;border:1px solid #e5e7eb;">
              <div class="eyebrow">VISTA GLOBAL</div>
              <h2>Radar de competencias</h2>
              <img src="${radarImageName}" alt="Radar de competencias" style="width:100%;max-width:430px;height:auto;"/>
            </td>
            <td style="width:52%;padding:14px;border:1px solid #e5e7eb;">
              <div class="eyebrow">LECTURA RÁPIDA</div>
              <h2>Resultado por dimensión</h2>
              <p class="muted">La gráfica radial y las barras permiten identificar fortalezas relativas y focos de desarrollo.</p>
            </td>
          </tr>
        </table>

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
