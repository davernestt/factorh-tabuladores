"use client";

import { useState } from "react";

export type PsychometricExportDimension = {
  name: string;
  value: number;
  displayValue?: string;
  band?: string;
  narrative?: string;
  potential?: string;
  watchout?: string;
};

export type PsychometricExportInstrument = {
  name: string;
  subtitle?: string;
  chart?: "radar" | "columns" | "dots" | "bars";
  overallLabel?: string;
  overallDisplay?: string;
  summary?: string[];
  highlights?: string[];
  watchouts?: string[];
  dimensions: PsychometricExportDimension[];
};

export type PsychometricExportData = {
  title: string;
  subtitle?: string;
  personName: string;
  jobTitle?: string | null;
  area?: string | null;
  organizationName: string;
  processName?: string | null;
  reportDate: string;
  executiveSummary: string[];
  keyFindings?: string[];
  cautions?: string[];
  interviewQuestions?: string[];
  objectiveText?: string;
  battery?: Array<{ name: string; description: string }>;
  jobComparison?: Array<{
    name: string;
    referenceMin: number;
    referenceMax: number;
    observed: number | null;
    status: string;
    importance: string;
  }>;
  managerGuidance?: {
    supervision: string;
    pressure: string;
    team: string;
    motivators: string[];
    coaching: string[];
  };
  onboardingPlan?: Array<{
    period: string;
    focus: string;
    actions: string[];
  }>;
  closing?: string;
  instruments: PsychometricExportInstrument[];
};

type Props = {
  fileName: string;
  data: PsychometricExportData;
  integral?: boolean;
};

const W = 1240;
const H = 1754;
const M = 64;
const CW = W - M * 2;

export default function PsychometricExportActions({ fileName, data, integral = false }: Props) {
  const [exporting, setExporting] = useState<"pdf" | "word" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadPdf() {
    if (exporting) return;
    setExporting("pdf");
    setError(null);
    try {
      await document.fonts?.ready;
      const pages = buildPages(data, integral);
      triggerDownload(buildImagePdf(pages), sanitize(fileName) + ".pdf");
    } catch (cause) {
      console.error(cause);
      setError("No fue posible generar el PDF.");
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
      const images = data.instruments.map(function (instrument, index) {
        return {
          name: "chart-" + String(index + 1) + ".png",
          base64: buildChart(instrument, 920, 600).toDataURL("image/png").split(",")[1] || "",
        };
      });
      const html = buildWordHtml(data, images.map(function (item) { return item.name; }), integral);
      const blob = new Blob(["\ufeff", buildMhtml(html, images)], {
        type: "application/msword;charset=utf-8",
      });
      triggerDownload(blob, sanitize(fileName) + ".doc");
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
        <button type="button" onClick={() => void downloadPdf()} disabled={Boolean(exporting)}
          className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50">
          {exporting === "pdf" ? "Generando PDF..." : integral ? "Descargar reporte integral PDF" : "Descargar PDF"}
        </button>
        <button type="button" onClick={() => void downloadWord()} disabled={Boolean(exporting)}
          className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">
          {exporting === "word" ? "Generando Word..." : integral ? "Descargar reporte integral Word" : "Descargar Word"}
        </button>
      </div>
      {error && <div className="mt-2 text-xs font-semibold text-red-600">{error}</div>}
    </div>
  );
}

function buildPages(data: PsychometricExportData, integral: boolean) {
  const out: Uint8Array[] = [];
  let page = 1;
  const pageBottom = H - 105;

  let canvas = makePage();
  let ctx = mustContext(canvas);

  function commitPage() {
    footer(ctx, page++);
    out.push(canvasBytes(canvas));
  }

  function beginPage(title: string) {
    canvas = makePage();
    ctx = mustContext(canvas);
    header(ctx, data, title);
  }

  // 1. Portada
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, W, 505);
  brand(ctx, 74, 92);
  ctx.fillStyle = "#a3a3a3";
  ctx.font = "700 14px Arial";
  ctx.fillText("EVALUACIONES PSICOMÉTRICAS", 74, 128);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 50px Arial";
  wrap(ctx, data.title, 74, 235, 700, 56, 3);

  ctx.fillStyle = "#d4d4d4";
  ctx.font = "20px Arial";
  wrap(
    ctx,
    data.subtitle ||
      (integral
        ? "Síntesis ejecutiva, lectura para el puesto y resultados individuales"
        : "Reporte ejecutivo de resultados"),
    74,
    397,
    710,
    30,
    3,
  );

  box(ctx, 852, 88, 316, 282, "#1f1f1f", "#404040");
  ctx.fillStyle = "#fb923c";
  ctx.font = "700 11px Arial";
  ctx.fillText("PERSONA EVALUADA", 880, 128);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 24px Arial";
  wrap(ctx, data.personName, 880, 168, 258, 29, 3);
  ctx.fillStyle = "#d4d4d4";
  ctx.font = "15px Arial";
  wrap(
    ctx,
    [data.jobTitle, data.area].filter(Boolean).join(" · ") ||
      "Sin puesto registrado",
    880,
    245,
    258,
    22,
    3,
  );
  ctx.fillText(data.organizationName, 880, 315);
  ctx.fillStyle = "#a3a3a3";
  ctx.font = "13px Arial";
  ctx.fillText(data.reportDate, 880, 347);

  metric(ctx, M, 592, 330, "Pruebas incluidas", String(data.instruments.length));
  metric(
    ctx,
    M + 350,
    592,
    430,
    "Proceso",
    data.processName || "Evaluación psicométrica",
  );
  metric(ctx, M + 800, 592, 312, "Fecha", data.reportDate);

  box(ctx, M, 770, CW, 315, "#fff7ed", "#fed7aa");
  ctx.fillStyle = "#c2410c";
  ctx.font = "700 12px Arial";
  ctx.fillText(integral ? "REPORTE INTEGRAL" : "LECTURA EJECUTIVA", M + 28, 812);
  ctx.fillStyle = "#171717";
  ctx.font = "800 29px Arial";
  ctx.fillText(
    integral
      ? "Lectura ejecutiva + evidencia por instrumento"
      : "Interpretación del instrumento",
    M + 28,
    864,
  );
  ctx.fillStyle = "#404040";
  ctx.font = "17px Arial";
  wrap(
    ctx,
    data.executiveSummary[0] || "Resumen del proceso psicométrico.",
    M + 28,
    920,
    CW - 56,
    27,
    6,
  );
  commitPage();

  // 2. Snapshot ejecutivo: una página con más densidad y mejor jerarquía.
  beginPage(integral ? "Resumen ejecutivo integral" : "Resumen ejecutivo");
  let y = 165;
  ctx.fillStyle = "#f97316";
  ctx.font = "700 11px Arial";
  ctx.fillText("LECTURA EJECUTIVA", M, y);
  y += 34;
  ctx.fillStyle = "#171717";
  ctx.font = "800 34px Arial";
  ctx.fillText("Lo más importante del perfil", M, y);
  y += 42;

  const lead = data.executiveSummary.slice(0, 3);
  box(ctx, M, y, CW, 245, "#fafafa", "#e5e5e5");
  ctx.fillStyle = "#404040";
  ctx.font = "15px Arial";
  let ly = y + 36;
  lead.forEach(function (paragraph) {
    ly = wrap(ctx, paragraph, M + 24, ly, CW - 48, 23, 5) + 12;
  });
  y += 268;

  const findings = data.keyFindings?.slice(0, 5) ?? [];
  const cautions = data.cautions?.slice(0, 5) ?? [];
  const gap = 18;
  const colW = (CW - gap) / 2;
  const fh = findings.length
    ? compactListBoxHeight(ctx, findings, colW, 13, 19)
    : 0;
  const ch = cautions.length
    ? compactListBoxHeight(ctx, cautions, colW, 13, 19)
    : 0;
  const summaryBoxH = Math.max(fh, ch, 165);

  if (findings.length) {
    drawCompactListBox(
      ctx,
      M,
      y,
      colW,
      "Fortalezas / señales favorables",
      findings,
      "#ecfdf5",
      "#065f46",
      13,
      19,
    );
  }
  if (cautions.length) {
    drawCompactListBox(
      ctx,
      M + colW + gap,
      y,
      colW,
      "Aspectos para validar",
      cautions,
      "#fff7ed",
      "#92400e",
      13,
      19,
    );
  }
  y += summaryBoxH + 22;

  const quickItems = [
    ["OBJETIVO", data.objectiveText || "Comprender el patrón de resultados para apoyar entrevista y toma de decisiones."],
    ["LECTURA PARA EL JEFE", data.managerGuidance?.supervision || "Interpretar el perfil frente a las exigencias reales del puesto y el contexto del equipo."],
  ];
  const quickH = 150;
  quickItems.forEach(function (item, index) {
    const x = index === 0 ? M : M + colW + gap;
    box(ctx, x, y, colW, quickH, "#ffffff", "#e5e5e5");
    ctx.fillStyle = "#f97316";
    ctx.font = "700 10px Arial";
    ctx.fillText(item[0], x + 18, y + 28);
    ctx.fillStyle = "#404040";
    ctx.font = "13px Arial";
    wrap(ctx, item[1], x + 18, y + 58, colW - 36, 19, 4);
  });
  commitPage();

  // 3. Objetivo y batería
  if (data.objectiveText || (data.battery && data.battery.length)) {
    beginPage("Objetivo y batería aplicada");
    let oy = 165;

    if (data.objectiveText) {
      ctx.fillStyle = "#f97316";
      ctx.font = "700 11px Arial";
      ctx.fillText("OBJETIVO DE LA EVALUACIÓN", M, oy);
      oy += 32;
      ctx.fillStyle = "#171717";
      ctx.font = "800 27px Arial";
      ctx.fillText("Contexto del proceso", M, oy);
      oy += 38;
      ctx.fillStyle = "#404040";
      ctx.font = "15px Arial";
      oy = wrap(ctx, data.objectiveText, M, oy, CW, 23, 8) + 26;
    }

    if (data.battery && data.battery.length) {
      ctx.fillStyle = "#f97316";
      ctx.font = "700 11px Arial";
      ctx.fillText("BATERÍA APLICADA", M, oy);
      oy += 28;

      for (let index = 0; index < data.battery.length; index += 1) {
        const item = data.battery[index];
        const rowH = Math.max(64, batteryRowHeight(ctx, item, CW) - 8);
        if (oy + rowH > pageBottom) {
          commitPage();
          beginPage("Batería aplicada · continuación");
          oy = 165;
        }
        drawBatteryRow(ctx, item, oy, CW, index + 1);
        oy += rowH + 7;
      }
    }
    commitPage();
  }

  // 4. Comparación con puesto (si existe)
  if (data.jobComparison && data.jobComparison.length) {
    beginPage("Alineación con el perfil objetivo");
    let jy = 165;
    ctx.fillStyle = "#f97316";
    ctx.font = "700 11px Arial";
    ctx.fillText("REFERENCIA DEL PUESTO", M, jy);
    jy += 32;
    ctx.fillStyle = "#171717";
    ctx.font = "800 28px Arial";
    ctx.fillText("Dónde coincide y dónde conviene profundizar", M, jy);
    jy += 42;
    ctx.fillStyle = "#737373";
    ctx.font = "14px Arial";
    jy =
      wrap(
        ctx,
        "La comparación organiza evidencia psicométrica frente a rangos definidos para el perfil objetivo. Es una ayuda para la decisión; no representa una recomendación automática de contratación.",
        M,
        jy,
        CW,
        21,
        4,
      ) + 18;

    for (let index = 0; index < data.jobComparison.length; index += 1) {
      const item = data.jobComparison[index];
      const rowH = 105;
      if (jy + rowH > pageBottom) {
        commitPage();
        beginPage("Alineación con el perfil objetivo · continuación");
        jy = 165;
      }
      drawJobComparisonRow(ctx, item, jy);
      jy += rowH + 8;
    }
    commitPage();
  }

  // 5. Lectura para el jefe + 30/60/90 en un bloque editorial compacto.
  if (data.managerGuidance || (data.onboardingPlan && data.onboardingPlan.length)) {
    beginPage("Lectura para el jefe de la vacante");
    let my = 165;
    ctx.fillStyle = "#f97316";
    ctx.font = "700 11px Arial";
    ctx.fillText("GESTIÓN E INTEGRACIÓN", M, my);
    my += 32;
    ctx.fillStyle = "#171717";
    ctx.font = "800 28px Arial";
    ctx.fillText("Cómo aprovechar y acompañar este perfil", M, my);
    my += 38;

    if (data.managerGuidance) {
      const topGap = 16;
      const half = (CW - topGap) / 2;
      const topH = 175;
      drawGuidanceBox(ctx, M, my, half, topH, "SUPERVISIÓN RECOMENDADA", data.managerGuidance.supervision);
      drawGuidanceBox(ctx, M + half + topGap, my, half, topH, "BAJO PRESIÓN", data.managerGuidance.pressure);
      my += topH + 14;

      const teamH = 145;
      drawGuidanceBox(ctx, M, my, CW, teamH, "INTEGRACIÓN CON EL EQUIPO", data.managerGuidance.team);
      my += teamH + 14;

      if (data.managerGuidance.motivators.length) {
        box(ctx, M, my, CW, 100, "#fff7ed", "#fed7aa");
        ctx.fillStyle = "#9a3412";
        ctx.font = "700 10px Arial";
        ctx.fillText("MOTIVADORES CLAVE", M + 18, my + 26);
        ctx.fillStyle = "#404040";
        ctx.font = "14px Arial";
        wrap(ctx, data.managerGuidance.motivators.join(" · "), M + 18, my + 54, CW - 36, 20, 3);
        my += 114;
      }
    }

    if (data.onboardingPlan && data.onboardingPlan.length && my < 980) {
      ctx.fillStyle = "#f97316";
      ctx.font = "700 11px Arial";
      ctx.fillText("PRIMEROS 90 DÍAS", M, my);
      my += 28;
      const stageGap = 14;
      const stageW = (CW - stageGap * 2) / 3;
      data.onboardingPlan.slice(0, 3).forEach(function (stage, index) {
        drawOnboardingColumn(ctx, stage, M + index * (stageW + stageGap), my, stageW, 300);
      });
    }
    commitPage();

    if (data.managerGuidance?.coaching.length) {
      beginPage("Retroalimentación y coaching");
      let cy = 165;
      ctx.fillStyle = "#f97316";
      ctx.font = "700 11px Arial";
      ctx.fillText("GUÍA DE ACOMPAÑAMIENTO", M, cy);
      cy += 32;
      ctx.fillStyle = "#171717";
      ctx.font = "800 28px Arial";
      ctx.fillText("Temas para trabajar durante la integración", M, cy);
      cy += 42;
      drawCompactListBox(
        ctx,
        M,
        cy,
        CW,
        "Sugerencias de retroalimentación",
        data.managerGuidance.coaching.slice(0, 7),
        "#fafafa",
        "#525252",
        14,
        21,
      );
      commitPage();
    }
  }

  // 6. Una página principal por prueba. El detalle deja de ser un listado enorme.
  data.instruments.forEach(function (instrument, instrumentIndex) {
    beginPage(instrument.name);

    let iy = 160;
    ctx.fillStyle = "#f97316";
    ctx.font = "700 10px Arial";
    ctx.fillText(
      "PRUEBA " + String(instrumentIndex + 1) + " DE " + String(data.instruments.length),
      M,
      iy,
    );
    iy += 30;

    ctx.fillStyle = "#171717";
    ctx.font = "800 29px Arial";
    iy = wrap(ctx, instrument.name, M, iy, CW, 33, 2) + 5;

    if (instrument.subtitle) {
      ctx.fillStyle = "#737373";
      ctx.font = "14px Arial";
      iy = wrap(ctx, instrument.subtitle, M, iy, CW, 20, 2) + 10;
    }

    const topY = Math.max(270, iy + 6);
    const leftW = 585;
    const rightX = M + leftW + 26;
    const rightW = CW - leftW - 26;

    box(ctx, M, topY, leftW, 435, "#ffffff", "#e5e5e5");
    ctx.drawImage(buildChart(instrument, 540, 360), M + 22, topY + 38, 540, 360);

    box(ctx, rightX, topY, rightW, 435, "#fafafa", "#e5e5e5");
    ctx.fillStyle = "#f97316";
    ctx.font = "700 10px Arial";
    ctx.fillText("LECTURA EJECUTIVA", rightX + 20, topY + 30);

    let ry = topY + 64;
    if (instrument.overallDisplay) {
      ctx.fillStyle = "#171717";
      ctx.font = "800 27px Arial";
      ry = wrap(ctx, instrument.overallDisplay, rightX + 20, ry, rightW - 40, 30, 2) + 10;
      ctx.fillStyle = "#737373";
      ctx.font = "700 10px Arial";
      ctx.fillText((instrument.overallLabel || "RESULTADO GLOBAL").toUpperCase(), rightX + 20, ry);
      ry += 28;
    }

    ctx.fillStyle = "#404040";
    ctx.font = "13px Arial";
    (instrument.summary ?? []).slice(0, 3).forEach(function (paragraph) {
      ry = wrap(ctx, paragraph, rightX + 20, ry, rightW - 40, 19, 4) + 10;
    });

    const dimStart = topY + 465;
    ctx.fillStyle = "#f97316";
    ctx.font = "700 10px Arial";
    ctx.fillText("RESULTADOS POR DIMENSIÓN", M, dimStart);

    const maxOnFirstPage = 6;
    const firstDims = instrument.dimensions.slice(0, maxOnFirstPage);
    const gridTop = dimStart + 26;
    const gridGap = 14;
    const gridW = (CW - gridGap) / 2;
    const rowH = 112;

    firstDims.forEach(function (item, index) {
      const col = index % 2;
      const row = Math.floor(index / 2);
      drawDimensionTile(
        ctx,
        item,
        M + col * (gridW + gridGap),
        gridTop + row * (rowH + 10),
        gridW,
        rowH,
      );
    });

    const usedRows = Math.ceil(firstDims.length / 2);
    let insightY = gridTop + usedRows * (rowH + 10) + 6;
    const highlights = instrument.highlights?.slice(0, 3) ?? [];
    const watchouts = instrument.watchouts?.slice(0, 3) ?? [];

    if ((highlights.length || watchouts.length) && insightY < pageBottom - 125) {
      const miniH = 118;
      if (highlights.length) {
        drawInlineInsight(
          ctx,
          M,
          insightY,
          gridW,
          miniH,
          "Elementos destacados",
          highlights,
          "#ecfdf5",
          "#065f46",
        );
      }
      if (watchouts.length) {
        drawInlineInsight(
          ctx,
          M + gridW + gridGap,
          insightY,
          gridW,
          miniH,
          "Puntos para profundizar",
          watchouts,
          "#fff7ed",
          "#92400e",
        );
      }
    }

    commitPage();

    const remaining = instrument.dimensions.slice(maxOnFirstPage);
    if (remaining.length) {
      beginPage(instrument.name + " · dimensiones adicionales");
      let dy = 165;
      ctx.fillStyle = "#f97316";
      ctx.font = "700 10px Arial";
      ctx.fillText("DETALLE COMPLEMENTARIO", M, dy);
      dy += 30;
      ctx.fillStyle = "#171717";
      ctx.font = "800 27px Arial";
      ctx.fillText("Dimensiones adicionales", M, dy);
      dy += 42;

      const detailGap = 14;
      const detailW = (CW - detailGap) / 2;
      const detailH = 135;
      remaining.forEach(function (item, index) {
        const col = index % 2;
        const row = Math.floor(index / 2);
        drawDimensionTile(
          ctx,
          item,
          M + col * (detailW + detailGap),
          dy + row * (detailH + 12),
          detailW,
          detailH,
          true,
        );
      });

      const rows = Math.ceil(remaining.length / 2);
      let extraY = dy + rows * (detailH + 12) + 8;
      if (highlights.length || watchouts.length) {
        if (highlights.length) {
          extraY += drawWideInsight(
            ctx,
            M,
            extraY,
            CW,
            "Qué puede aportar",
            highlights,
            "#ecfdf5",
            "#065f46",
          ) + 12;
        }
        if (watchouts.length && extraY < pageBottom - 130) {
          drawWideInsight(
            ctx,
            M,
            extraY,
            CW,
            "Qué conviene validar",
            watchouts,
            "#fff7ed",
            "#92400e",
          );
        }
      }
      commitPage();
    }
  });

  // 7. Entrevista + cierre
  beginPage("Guía para entrevista y cierre");
  let qy = 165;
  ctx.fillStyle = "#f97316";
  ctx.font = "700 10px Arial";
  ctx.fillText("PROFUNDIZACIÓN", M, qy);
  qy += 30;
  ctx.fillStyle = "#171717";
  ctx.font = "800 28px Arial";
  ctx.fillText("Preguntas para entrevista", M, qy);
  qy += 38;

  const questions = data.interviewQuestions?.slice(0, 8) ?? [];
  ctx.fillStyle = "#404040";
  ctx.font = "14px Arial";
  questions.forEach(function (item, index) {
    const lines = countLines(ctx, item, CW - 54, "14px Arial");
    const itemH = Math.max(46, lines * 20 + 18);
    if (qy + itemH > 1030) return;
    ctx.fillStyle = "#f97316";
    ctx.font = "800 13px Arial";
    ctx.fillText(String(index + 1).padStart(2, "0"), M, qy);
    ctx.fillStyle = "#404040";
    ctx.font = "14px Arial";
    qy = wrap(ctx, item, M + 38, qy, CW - 38, 20, 5) + 15;
  });

  drawCompactClosing(ctx, data, Math.max(qy + 22, 1080));
  commitPage();

  return out;
}

function drawDimensionTile(
  ctx: CanvasRenderingContext2D,
  item: PsychometricExportDimension,
  x: number,
  y: number,
  width: number,
  height: number,
  showNarrative = false,
) {
  box(ctx, x, y, width, height, "#ffffff", "#e5e5e5");

  ctx.fillStyle = "#171717";
  ctx.font = "800 14px Arial";
  ctx.fillText(clip(ctx, item.name, width - 92), x + 16, y + 27);

  ctx.textAlign = "right";
  ctx.font = "800 17px Arial";
  ctx.fillText(
    item.displayValue || String(Math.round(item.value)),
    x + width - 16,
    y + 27,
  );
  ctx.textAlign = "left";

  const barY = y + 47;
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(x + 16, barY, width - 32, 8);
  ctx.fillStyle = "#f97316";
  ctx.fillRect(x + 16, barY, (width - 32) * clamp(item.value) / 100, 8);

  if (item.band) {
    ctx.fillStyle = "#9a3412";
    ctx.font = "700 9px Arial";
    ctx.fillText(item.band.toUpperCase(), x + 16, y + 77);
  }

  const text = showNarrative
    ? item.narrative || item.potential || item.watchout
    : item.narrative;
  if (text) {
    ctx.fillStyle = "#666666";
    ctx.font = showNarrative ? "12px Arial" : "11px Arial";
    wrap(
      ctx,
      text,
      x + 16,
      y + (item.band ? 97 : 82),
      width - 32,
      showNarrative ? 17 : 16,
      showNarrative ? 3 : 2,
    );
  }
}

function drawInlineInsight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  items: string[],
  bg: string,
  fg: string,
) {
  box(ctx, x, y, width, height, bg);
  ctx.fillStyle = fg;
  ctx.font = "800 13px Arial";
  ctx.fillText(title, x + 16, y + 28);

  let ty = y + 54;
  items.slice(0, 3).forEach(function (item) {
    ctx.fillStyle = fg;
    ctx.font = "800 10px Arial";
    ctx.fillText("•", x + 16, ty);
    ctx.fillStyle = "#404040";
    ctx.font = "11px Arial";
    ty = wrap(ctx, item, x + 31, ty, width - 47, 16, 2) + 5;
  });
}

function drawWideInsight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  title: string,
  items: string[],
  bg: string,
  fg: string,
) {
  const height = Math.max(100, 56 + items.slice(0, 4).length * 34);
  box(ctx, x, y, width, height, bg);
  ctx.fillStyle = fg;
  ctx.font = "800 13px Arial";
  ctx.fillText(title, x + 18, y + 30);
  let ty = y + 56;
  items.slice(0, 4).forEach(function (item) {
    ctx.fillStyle = "#404040";
    ctx.font = "12px Arial";
    ty = wrap(ctx, "• " + item, x + 18, ty, width - 36, 18, 2) + 6;
  });
  return height;
}

function drawOnboardingColumn(
  ctx: CanvasRenderingContext2D,
  stage: { period: string; focus: string; actions: string[] },
  x: number,
  y: number,
  width: number,
  height: number,
) {
  box(ctx, x, y, width, height, "#fafafa", "#e5e5e5");
  ctx.fillStyle = "#f97316";
  ctx.font = "700 10px Arial";
  ctx.fillText(stage.period.toUpperCase(), x + 16, y + 27);
  ctx.fillStyle = "#171717";
  ctx.font = "800 15px Arial";
  wrap(ctx, stage.focus, x + 16, y + 55, width - 32, 19, 3);

  let ay = y + 118;
  stage.actions.slice(0, 4).forEach(function (action) {
    ctx.fillStyle = "#f97316";
    ctx.font = "800 10px Arial";
    ctx.fillText("•", x + 16, ay);
    ctx.fillStyle = "#404040";
    ctx.font = "11px Arial";
    ay = wrap(ctx, action, x + 31, ay, width - 47, 16, 3) + 7;
  });
}

function compactListBoxHeight(
  ctx: CanvasRenderingContext2D,
  items: string[],
  width: number,
  fontSize = 13,
  lineHeight = 19,
) {
  const textWidth = width - 62;
  const totalLines = items.reduce(
    (sum, item) =>
      sum + Math.min(3, countLines(ctx, item, textWidth, fontSize + "px Arial")),
    0,
  );
  return Math.max(112, 68 + totalLines * lineHeight + items.length * 8);
}

function drawCompactListBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  title: string,
  items: string[],
  bg: string,
  fg: string,
  fontSize = 13,
  lineHeight = 19,
) {
  const height = compactListBoxHeight(ctx, items, width, fontSize, lineHeight);
  box(ctx, x, y, width, height, bg);
  ctx.fillStyle = fg;
  ctx.font = "800 17px Arial";
  ctx.fillText(title, x + 20, y + 32);

  let ry = y + 62;
  items.forEach(function (item) {
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(x + 26, ry - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#404040";
    ctx.font = fontSize + "px Arial";
    ry =
      wrap(ctx, item, x + 42, ry, width - 62, lineHeight, 3) + 8;
  });
  return height;
}

function batteryRowHeight(
  ctx: CanvasRenderingContext2D,
  item: { name: string; description: string },
  width: number,
) {
  const nameW = 300;
  const descriptionW = width - nameW - 56;
  const nameLines = countLines(ctx, item.name, nameW - 30, "700 14px Arial");
  const descriptionLines = countLines(
    ctx,
    item.description,
    descriptionW,
    "13px Arial",
  );
  return Math.max(74, 34 + Math.max(nameLines * 19, descriptionLines * 18));
}

function drawBatteryRow(
  ctx: CanvasRenderingContext2D,
  item: { name: string; description: string },
  y: number,
  width: number,
  index: number,
) {
  const nameW = 300;
  const rowH = batteryRowHeight(ctx, item, width);
  box(ctx, M, y, width, rowH, index % 2 === 0 ? "#ffffff" : "#fafafa", "#e5e5e5");

  ctx.fillStyle = "#f97316";
  ctx.font = "700 10px Arial";
  ctx.fillText(String(index).padStart(2, "0"), M + 18, y + 25);

  ctx.fillStyle = "#171717";
  ctx.font = "800 14px Arial";
  wrap(ctx, item.name, M + 48, y + 25, nameW - 58, 19, 3);

  ctx.fillStyle = "#525252";
  ctx.font = "13px Arial";
  wrap(
    ctx,
    item.description,
    M + nameW + 20,
    y + 25,
    width - nameW - 42,
    18,
    4,
  );
}

function drawJobComparisonRow(
  ctx: CanvasRenderingContext2D,
  item: {
    name: string;
    referenceMin: number;
    referenceMax: number;
    observed: number | null;
    status: string;
    importance: string;
  },
  y: number,
) {
  box(ctx, M, y, CW, 116, "#ffffff", "#e5e5e5");

  ctx.fillStyle = "#171717";
  ctx.font = "800 15px Arial";
  ctx.fillText(clip(ctx, item.name, 370), M + 18, y + 31);

  ctx.fillStyle = "#737373";
  ctx.font = "700 10px Arial";
  ctx.fillText(item.importance.toUpperCase(), M + 18, y + 55);

  ctx.fillStyle = "#171717";
  ctx.font = "800 14px Arial";
  ctx.fillText(
    "Referencia " +
      Math.round(item.referenceMin) +
      "-" +
      Math.round(item.referenceMax),
    M + 430,
    y + 31,
  );
  ctx.fillText(
    "Evidencia " + (item.observed === null ? "-" : Math.round(item.observed)),
    M + 690,
    y + 31,
  );

  ctx.fillStyle =
    item.status === "Dentro del rango de referencia"
      ? "#065f46"
      : item.status === "Sin evidencia suficiente"
        ? "#737373"
        : "#92400e";
  ctx.font = "700 12px Arial";
  wrap(ctx, item.status, M + 430, y + 62, CW - 450, 18, 2);
}

function guidanceBoxHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
) {
  const lines = countLines(ctx, text, width - 40, "14px Arial");
  return Math.max(118, 76 + Math.min(lines, 6) * 21);
}

function drawGuidanceBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  text: string,
) {
  box(ctx, x, y, width, height, "#fafafa", "#e5e5e5");
  ctx.fillStyle = "#f97316";
  ctx.font = "700 10px Arial";
  ctx.fillText(label, x + 20, y + 27);
  ctx.fillStyle = "#404040";
  ctx.font = "14px Arial";
  wrap(ctx, text, x + 20, y + 56, width - 40, 21, 6);
}

function onboardingBoxHeight(
  ctx: CanvasRenderingContext2D,
  stage: { period: string; focus: string; actions: string[] },
  width: number,
) {
  const actionWidth = width - 70;
  const actionLines = stage.actions.reduce(
    (sum, item) =>
      sum + Math.min(3, countLines(ctx, item, actionWidth, "13px Arial")),
    0,
  );
  return Math.max(190, 116 + actionLines * 19 + stage.actions.length * 7);
}

function drawOnboardingBox(
  ctx: CanvasRenderingContext2D,
  stage: { period: string; focus: string; actions: string[] },
  y: number,
  width: number,
  height: number,
) {
  box(ctx, M, y, width, height, "#fafafa", "#e5e5e5");
  ctx.fillStyle = "#f97316";
  ctx.font = "700 11px Arial";
  ctx.fillText(stage.period.toUpperCase(), M + 20, y + 30);
  ctx.fillStyle = "#171717";
  ctx.font = "800 18px Arial";
  wrap(ctx, stage.focus, M + 20, y + 61, width - 40, 23, 2);

  let ay = y + 102;
  stage.actions.forEach(function (action) {
    ctx.fillStyle = "#f97316";
    ctx.font = "800 12px Arial";
    ctx.fillText("•", M + 22, ay);
    ctx.fillStyle = "#404040";
    ctx.font = "13px Arial";
    ay = wrap(ctx, action, M + 42, ay, width - 68, 19, 3) + 8;
  });
}

function compactDimensionHeight(
  ctx: CanvasRenderingContext2D,
  item: PsychometricExportDimension,
  width: number,
) {
  let height = 112;
  if (item.narrative) {
    height +=
      Math.min(
        3,
        countLines(ctx, item.narrative, width - 40, "13px Arial"),
      ) * 19 + 10;
  }

  if (item.potential || item.watchout) {
    const colW = (width - 58) / 2;
    const potentialLines = item.potential
      ? Math.min(3, countLines(ctx, item.potential, colW - 28, "12px Arial"))
      : 0;
    const watchLines = item.watchout
      ? Math.min(3, countLines(ctx, item.watchout, colW - 28, "12px Arial"))
      : 0;
    height += 48 + Math.max(potentialLines, watchLines) * 18;
  }
  return Math.max(142, Math.min(285, height));
}

function drawCompactDimension(
  ctx: CanvasRenderingContext2D,
  item: PsychometricExportDimension,
  y: number,
  width: number,
  height: number,
) {
  box(ctx, M, y, width, height, "#ffffff", "#e5e5e5");

  ctx.fillStyle = "#171717";
  ctx.font = "800 17px Arial";
  ctx.fillText(item.name, M + 18, y + 31);

  ctx.textAlign = "right";
  ctx.font = "800 20px Arial";
  ctx.fillText(
    item.displayValue || String(Math.round(item.value)),
    W - M - 18,
    y + 31,
  );
  ctx.textAlign = "left";

  if (item.band) {
    ctx.fillStyle = "#9a3412";
    ctx.font = "700 9px Arial";
    ctx.fillText(item.band.toUpperCase(), M + 18, y + 54);
  }

  const barY = y + 70;
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(M + 18, barY, width - 36, 10);
  ctx.fillStyle = "#f97316";
  ctx.fillRect(
    M + 18,
    barY,
    (width - 36) * clamp(item.value) / 100,
    10,
  );

  let ty = y + 104;
  if (item.narrative) {
    ctx.fillStyle = "#525252";
    ctx.font = "13px Arial";
    ty =
      wrap(ctx, item.narrative, M + 18, ty, width - 36, 19, 3) + 8;
  }

  if (item.potential || item.watchout) {
    const gap = 16;
    const colW = (width - gap) / 2;
    if (item.potential) {
      ctx.fillStyle = "#065f46";
      ctx.font = "700 9px Arial";
      ctx.fillText("PUEDE APORTAR", M + 18, ty);
      ctx.fillStyle = "#404040";
      ctx.font = "12px Arial";
      wrap(
        ctx,
        item.potential,
        M + 18,
        ty + 21,
        colW - 36,
        18,
        3,
      );
    }
    if (item.watchout) {
      const x = M + colW + gap;
      ctx.fillStyle = "#92400e";
      ctx.font = "700 9px Arial";
      ctx.fillText("CONVIENE OBSERVAR", x, ty);
      ctx.fillStyle = "#404040";
      ctx.font = "12px Arial";
      wrap(
        ctx,
        item.watchout,
        x,
        ty + 21,
        colW - 18,
        18,
        3,
      );
    }
  }
}

function drawCompactClosing(
  ctx: CanvasRenderingContext2D,
  data: PsychometricExportData,
  y: number,
) {
  const text =
    data.closing ||
    "El resultado debe integrarse con entrevista, experiencia, evidencia de desempeño y requisitos reales del puesto.";
  const lines = countLines(ctx, text, CW - 48, "15px Arial");
  const height = Math.max(190, 122 + Math.min(lines, 7) * 22);

  box(ctx, M, y, CW, height, "#fafafa", "#e5e5e5");
  ctx.fillStyle = "#f97316";
  ctx.font = "700 11px Arial";
  ctx.fillText("CIERRE EJECUTIVO", M + 24, y + 34);
  ctx.fillStyle = "#171717";
  ctx.font = "800 24px Arial";
  ctx.fillText("Conclusión para toma de decisión", M + 24, y + 75);
  ctx.fillStyle = "#404040";
  ctx.font = "15px Arial";
  wrap(ctx, text, M + 24, y + 113, CW - 48, 22, 7);
}

function countLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
) {
  const previous = ctx.font;
  ctx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  let lines = 0;
  let line = "";

  words.forEach(function (word) {
    const candidate = line ? line + " " + word : word;
    if (!line || ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines += 1;
      line = word;
    }
  });

  if (line) lines += 1;
  ctx.font = previous;
  return Math.max(1, lines);
}

function dimensionCard(ctx: CanvasRenderingContext2D, item: PsychometricExportDimension, y: number) {
  const detail = Boolean(item.narrative || item.potential || item.watchout);
  const height = detail ? 410 : 180;
  box(ctx, M, y, CW, height, "#ffffff", "#e5e5e5");
  ctx.fillStyle = "#171717";
  ctx.font = "800 21px Arial";
  ctx.fillText(item.name, M + 24, y + 42);
  ctx.textAlign = "right";
  ctx.font = "800 25px Arial";
  ctx.fillText(item.displayValue || String(Math.round(item.value)), W - M - 24, y + 42);
  ctx.textAlign = "left";
  if (item.band) {
    ctx.fillStyle = "#9a3412";
    ctx.font = "700 11px Arial";
    ctx.fillText(item.band.toUpperCase(), M + 24, y + 78);
  }
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(M + 24, y + 110, CW - 48, 13);
  ctx.fillStyle = "#f97316";
  ctx.fillRect(M + 24, y + 110, (CW - 48) * clamp(item.value) / 100, 13);
  if (detail) {
    let ty = y + 160;
    if (item.narrative) {
      ctx.fillStyle = "#404040";
      ctx.font = "15px Arial";
      ty = wrap(ctx, item.narrative, M + 24, ty, CW - 48, 22, 5) + 14;
    }
    if (item.potential) {
      ctx.fillStyle = "#065f46";
      ctx.font = "700 11px Arial";
      ctx.fillText("PUEDE APORTAR", M + 24, ty);
      ctx.fillStyle = "#404040";
      ctx.font = "14px Arial";
      ty = wrap(ctx, item.potential, M + 24, ty + 24, CW - 48, 21, 3) + 14;
    }
    if (item.watchout) {
      ctx.fillStyle = "#9a3412";
      ctx.font = "700 11px Arial";
      ctx.fillText("CONVIENE OBSERVAR", M + 24, ty);
      ctx.fillStyle = "#404040";
      ctx.font = "14px Arial";
      wrap(ctx, item.watchout, M + 24, ty + 24, CW - 48, 21, 3);
    }
  }
  return y + height;
}

function buildChart(instrument: PsychometricExportInstrument, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = mustContext(canvas);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const chart = instrument.chart || "bars";
  if (chart === "radar") radar(ctx, instrument.dimensions, width, height);
  else if (chart === "columns") columns(ctx, instrument.dimensions, width, height);
  else if (chart === "dots") dots(ctx, instrument.dimensions, width, height);
  else bars(ctx, instrument.dimensions, width, height);
  return canvas;
}

function radar(ctx: CanvasRenderingContext2D, items: PsychometricExportDimension[], width: number, height: number) {
  const cx = width * 0.44;
  const cy = height * 0.49;
  const radius = Math.min(width, height) * 0.29;
  const count = Math.max(1, items.length);
  [25, 50, 75, 100].forEach(function (level) {
    ctx.beginPath();
    items.forEach(function (_, index) {
      const a = -Math.PI / 2 + index * Math.PI * 2 / count;
      const r = radius * level / 100;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  items.forEach(function (_, index) {
    const a = -Math.PI / 2 + index * Math.PI * 2 / count;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.strokeStyle = "#eeeeee";
    ctx.stroke();
  });
  ctx.beginPath();
  items.forEach(function (item, index) {
    const a = -Math.PI / 2 + index * Math.PI * 2 / count;
    const r = radius * clamp(item.value) / 100;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(249,115,22,.18)";
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 5;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#404040";
  ctx.font = "700 13px Arial";
  items.forEach(function (item, index) {
    const a = -Math.PI / 2 + index * Math.PI * 2 / count;
    const lx = cx + Math.cos(a) * (radius + 30);
    const ly = cy + Math.sin(a) * (radius + 30);
    ctx.textAlign = "center";
    ctx.fillText(short(item.name), lx, ly);
  });
  ctx.textAlign = "left";
}

function columns(ctx: CanvasRenderingContext2D, items: PsychometricExportDimension[], width: number, height: number) {
  const left = 42, right = width - 34, top = 55, bottom = height - 90;
  const gap = 12;
  const bw = Math.max(26, (right - left - gap * Math.max(0, items.length - 1)) / Math.max(1, items.length));
  items.forEach(function (item, index) {
    const value = clamp(item.value);
    const x = left + index * (bw + gap);
    const bh = (bottom - top) * value / 100;
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(x, top, bw, bottom - top);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(x, bottom - bh, bw, bh);
    ctx.fillStyle = "#171717";
    ctx.font = "800 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(String(Math.round(value)), x + bw / 2, bottom - bh - 8);
    ctx.fillStyle = "#525252";
    ctx.font = "700 11px Arial";
    ctx.fillText(short(item.name), x + bw / 2, bottom + 25);
  });
  ctx.textAlign = "left";
}

function dots(ctx: CanvasRenderingContext2D, items: PsychometricExportDimension[], width: number, height: number) {
  const left = 220, right = width - 60, top = 60;
  const row = Math.max(52, (height - 100) / Math.max(1, items.length));
  items.forEach(function (item, index) {
    const y = top + index * row;
    const value = clamp(item.value);
    ctx.fillStyle = "#404040";
    ctx.font = "700 13px Arial";
    ctx.fillText(short(item.name), 25, y + 4);
    ctx.beginPath();
    ctx.moveTo(left, y); ctx.lineTo(right, y);
    ctx.strokeStyle = "#e5e5e5"; ctx.stroke();
    const dx = left + (right - left) * value / 100;
    ctx.beginPath(); ctx.arc(dx, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#f97316"; ctx.fill();
    ctx.fillStyle = "#171717"; ctx.font = "800 13px Arial";
    ctx.fillText(String(Math.round(value)) + "%", right + 8, y + 4);
  });
}

function bars(ctx: CanvasRenderingContext2D, items: PsychometricExportDimension[], width: number, height: number) {
  const left = 205, right = width - 55, top = 55;
  const row = Math.max(48, (height - 100) / Math.max(1, items.length));
  items.forEach(function (item, index) {
    const y = top + index * row;
    const value = clamp(item.value);
    ctx.fillStyle = "#404040"; ctx.font = "700 13px Arial";
    ctx.fillText(short(item.name), 24, y + 4);
    ctx.fillStyle = "#f1f5f9"; ctx.fillRect(left, y - 11, right - left, 18);
    ctx.fillStyle = "#f97316"; ctx.fillRect(left, y - 11, (right - left) * value / 100, 18);
    ctx.fillStyle = "#171717"; ctx.font = "800 13px Arial";
    ctx.fillText(String(Math.round(value)), right + 8, y + 4);
  });
}

function buildWordHtml(data: PsychometricExportData, imageNames: string[], integral: boolean) {
  const instruments = data.instruments.map(function (instrument, index) {
    const rows = instrument.dimensions.map(function (item) {
      return "<tr><td><b>" + esc(item.name) + "</b>" + (item.band ? "<br/><span class='muted'>" + esc(item.band) + "</span>" : "") +
        "</td><td class='score'>" + esc(item.displayValue || String(Math.round(item.value))) +
        "</td><td><table class='bar'><tr><td bgcolor='#f97316' style='width:" + String(clamp(item.value)) + "%;height:10px;font-size:1px;'>&nbsp;</td>" +
        "<td bgcolor='#f1f5f9' style='width:" + String(100 - clamp(item.value)) + "%;height:10px;font-size:1px;'>&nbsp;</td></tr></table>" +
        (item.narrative ? "<p>" + esc(item.narrative) + "</p>" : "") +
        (item.potential ? "<p><b>Puede aportar:</b> " + esc(item.potential) + "</p>" : "") +
        (item.watchout ? "<p><b>Conviene observar:</b> " + esc(item.watchout) + "</p>" : "") +
        "</td></tr>";
    }).join("");

    return "<div class='page-break'></div><div class='eyebrow'>RESULTADO INDIVIDUAL " + String(index + 1) + "</div>" +
      "<h1 class='dark'>" + esc(instrument.name) + "</h1>" +
      (instrument.subtitle ? "<p class='lead'>" + esc(instrument.subtitle) + "</p>" : "") +
      (instrument.overallDisplay ? "<div class='metric'><span class='muted'>" + esc(instrument.overallLabel || "Resultado global") + "</span><br/><b>" + esc(instrument.overallDisplay) + "</b></div>" : "") +
      "<div class='chart'><img src='" + imageNames[index] + "' style='width:100%;max-width:650px;height:auto;'/></div>" +
      (instrument.summary && instrument.summary.length ? "<div class='summary'><div class='eyebrow'>INTERPRETACIÓN GENERAL</div>" + instrument.summary.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>" : "") +
      "<h2>Resultados por dimensión</h2><table class='results'><tr><th>Dimensión</th><th>Resultado</th><th>Interpretación</th></tr>" + rows + "</table>" +
      (instrument.highlights && instrument.highlights.length ? "<div class='good'><h2>Elementos destacados</h2>" + instrument.highlights.map(function (p) { return "<p>• " + esc(p) + "</p>"; }).join("") + "</div>" : "") +
      (instrument.watchouts && instrument.watchouts.length ? "<div class='watch'><h2>Puntos para profundizar</h2>" + instrument.watchouts.map(function (p) { return "<p>• " + esc(p) + "</p>"; }).join("") + "</div>" : "");
  }).join("");

  const jobContextHtml =
    (data.objectiveText
      ? "<div class='page-break'></div><div class='eyebrow'>OBJETIVO DE LA EVALUACIÓN</div><h1 class='dark'>Contexto del proceso</h1><p>" +
        esc(data.objectiveText) +
        "</p>"
      : "") +
    (data.battery && data.battery.length
      ? "<h2>Batería aplicada</h2><table class='results'><tr><th>Prueba</th><th>Qué evalúa</th></tr>" +
        data.battery
          .map(function (item) {
            return "<tr><td><b>" + esc(item.name) + "</b></td><td>" + esc(item.description) + "</td></tr>";
          })
          .join("") +
        "</table>"
      : "") +
    (data.jobComparison && data.jobComparison.length
      ? "<div class='page-break'></div><div class='eyebrow'>COMPARACIÓN CONTRA PERFIL OBJETIVO</div><h1 class='dark'>Mapa de competencias de referencia</h1><p class='lead'>La comparación organiza evidencia psicométrica frente a rangos definidos para el perfil objetivo. No constituye una recomendación automática de contratación.</p><table class='results'><tr><th>Competencia</th><th>Referencia</th><th>Evidencia</th><th>Lectura</th></tr>" +
        data.jobComparison
          .map(function (item) {
            return (
              "<tr><td><b>" +
              esc(item.name) +
              "</b><br/><span class='muted'>" +
              esc(item.importance) +
              "</span></td><td>" +
              String(Math.round(item.referenceMin)) +
              "–" +
              String(Math.round(item.referenceMax)) +
              "</td><td>" +
              (item.observed === null ? "—" : String(Math.round(item.observed))) +
              "</td><td>" +
              esc(item.status) +
              "</td></tr>"
            );
          })
          .join("") +
        "</table>"
      : "") +
    (data.managerGuidance
      ? "<div class='page-break'></div><div class='eyebrow'>LECTURA PARA EL JEFE DE LA VACANTE</div><h1 class='dark'>Cómo gestionar e integrar este perfil</h1>" +
        "<div class='summary'><p><b>Estilo de supervisión recomendado:</b> " +
        esc(data.managerGuidance.supervision) +
        "</p><p><b>Qué observar bajo presión:</b> " +
        esc(data.managerGuidance.pressure) +
        "</p><p><b>Integración con el equipo:</b> " +
        esc(data.managerGuidance.team) +
        "</p><p><b>Motivadores clave:</b> " +
        esc(data.managerGuidance.motivators.join(" · ")) +
        "</p></div>" +
        (data.managerGuidance.coaching.length
          ? "<h2>Retroalimentación / coaching</h2>" +
            data.managerGuidance.coaching
              .map(function (item) {
                return "<p>• " + esc(item) + "</p>";
              })
              .join("")
          : "")
      : "") +
    (data.onboardingPlan && data.onboardingPlan.length
      ? "<div class='page-break'></div><div class='eyebrow'>INTEGRACIÓN SUGERIDA 30–60–90</div><h1 class='dark'>Primeros 90 días</h1>" +
        data.onboardingPlan
          .map(function (stage) {
            return (
              "<div class='summary'><div class='eyebrow'>" +
              esc(stage.period) +
              "</div><h2>" +
              esc(stage.focus) +
              "</h2>" +
              stage.actions
                .map(function (item) {
                  return "<p>• " + esc(item) + "</p>";
                })
                .join("") +
              "</div>"
            );
          })
          .join("")
      : "");

  return "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/>" +
    "<style>@page{size:A4;margin:1.35cm}body{font-family:Arial;color:#262626;font-size:10.5pt;line-height:1.45}table{border-collapse:collapse;width:100%}td{vertical-align:top}" +
    ".header{background:#171717;color:#fff}.header td{padding:22px}.brand{font-size:22pt;font-weight:bold}.orange{color:#f97316}.eyebrow{color:#ea580c;font-size:8pt;font-weight:bold;letter-spacing:1.1px}" +
    ".dark{color:#171717;font-size:22pt;margin:4px 0 8px}h2{font-size:15pt;color:#171717}.lead{color:#525252;font-size:11pt}.muted{color:#737373;font-size:8.5pt}.summary{background:#fff7ed;border:1px solid #fed7aa;padding:14px;margin:12px 0}" +
    ".good{background:#ecfdf5;border:1px solid #a7f3d0;padding:12px;margin-top:12px}.watch{background:#fffbeb;border:1px solid #fde68a;padding:12px;margin-top:12px}.results th{background:#171717;color:#fff;padding:8px;text-align:left;font-size:8.5pt}.results td{border-bottom:1px solid #e5e7eb;padding:9px}.results .score{width:12%;text-align:center;font-weight:bold}.bar{width:100%;margin:4px 0 8px}.chart{text-align:center;border:1px solid #e5e7eb;padding:10px;margin:10px 0}.metric{display:inline-block;background:#fafafa;border:1px solid #e5e7eb;padding:10px;font-size:16pt}.page-break{page-break-before:always}.exec{margin-top:14px;background:#fafafa;border:1px solid #e5e7eb;padding:14px}</style></head><body>" +
    "<table class='header'><tr><td style='width:60%'><div class='brand'>Factor<span class='orange'>RH</span></div><div style='color:#a3a3a3;font-size:8pt'>EVALUACIONES PSICOMÉTRICAS</div><div style='font-size:25pt;font-weight:bold;margin-top:16px'>" + esc(data.title) + "</div>" +
    "<div style='color:#d4d4d4;font-size:12pt'>" + esc(data.subtitle || (integral ? "Síntesis ejecutiva y acumulado de resultados individuales" : "Reporte ejecutivo de resultados")) + "</div></td>" +
    "<td style='width:40%'><div style='background:#262626;border:1px solid #404040;padding:12px'><div style='color:#fb923c;font-size:8pt;font-weight:bold'>PERSONA EVALUADA</div><div style='font-size:14pt;font-weight:bold'>" + esc(data.personName) + "</div><div>" + esc([data.jobTitle, data.area].filter(Boolean).join(" · ") || "Sin puesto registrado") + "</div><div>" + esc(data.organizationName) + "</div><div>" + esc(data.reportDate) + "</div></div></td></tr></table>" +
    "<div class='exec'><div class='eyebrow'>" + (integral ? "REPORTE INTEGRAL" : "LECTURA EJECUTIVA") + "</div><h2>Resumen ejecutivo</h2>" + data.executiveSummary.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>" +
    (data.keyFindings && data.keyFindings.length ? "<div class='good'><h2>Hallazgos principales</h2>" + data.keyFindings.map(function (p) { return "<p>• " + esc(p) + "</p>"; }).join("") + "</div>" : "") +
    (data.cautions && data.cautions.length ? "<div class='watch'><h2>Aspectos a validar</h2>" + data.cautions.map(function (p) { return "<p>• " + esc(p) + "</p>"; }).join("") + "</div>" : "") +
    jobContextHtml +
    instruments +
    (data.interviewQuestions && data.interviewQuestions.length ? "<div class='page-break'></div><div class='eyebrow'>GUÍA PARA ENTREVISTA</div><h1 class='dark'>Preguntas de profundización</h1>" + data.interviewQuestions.map(function (p, i) { return "<p><b>" + String(i + 1) + ".</b> " + esc(p) + "</p>"; }).join("") : "") +
    "<div class='page-break'></div><div class='eyebrow'>CIERRE EJECUTIVO</div><h1 class='dark'>Conclusión para toma de decisión</h1><p>" + esc(data.closing || "El resultado debe integrarse con entrevista, experiencia, evidencia de desempeño y requisitos reales del puesto.") + "</p></body></html>";
}

function buildMhtml(html: string, images: Array<{ name: string; base64: string }>) {
  const boundary = "----=_NextPart_FactorRH_Psychometrics";
  const parts = ["MIME-Version: 1.0", "Content-Type: multipart/related; boundary=\"" + boundary + "\"", "", "--" + boundary,
    "Content-Type: text/html; charset=\"utf-8\"", "Content-Transfer-Encoding: 8bit", "Content-Location: report.html", "", html];
  images.forEach(function (image) {
    parts.push("", "--" + boundary, "Content-Type: image/png", "Content-Transfer-Encoding: base64", "Content-Location: " + image.name, "", wrap64(image.base64));
  });
  parts.push("", "--" + boundary + "--");
  return parts.join("\r\n");
}

function makePage() {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = mustContext(canvas);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  return canvas;
}
function mustContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");
  return ctx;
}
function brand(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#ffffff"; ctx.font = "800 36px Arial"; ctx.fillText("Factor", x, y);
  const w = ctx.measureText("Factor").width; ctx.fillStyle = "#f97316"; ctx.fillText("RH", x + w, y);
}
function header(ctx: CanvasRenderingContext2D, data: PsychometricExportData, title: string) {
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, W, 112);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 26px Arial";
  ctx.fillText("Factor", M, 48);
  const brandWidth = ctx.measureText("Factor").width;
  ctx.fillStyle = "#f97316";
  ctx.fillText("RH", M + brandWidth, 48);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 17px Arial";
  ctx.fillText(clip(ctx, title, 590), M, 88);

  ctx.fillStyle = "#a3a3a3";
  ctx.font = "12px Arial";
  ctx.textAlign = "right";
  ctx.fillText(clip(ctx, data.personName, 390), W - M, 47);
  ctx.fillText(clip(ctx, data.organizationName + " · " + data.reportDate, 390), W - M, 80);
  ctx.textAlign = "left";
}
function footer(ctx: CanvasRenderingContext2D, page: number) {
  ctx.strokeStyle = "#e5e5e5"; ctx.beginPath(); ctx.moveTo(M, H - 72); ctx.lineTo(W - M, H - 72); ctx.stroke();
  ctx.fillStyle = "#a3a3a3"; ctx.font = "12px Arial"; ctx.fillText("FactorRH · Reporte psicométrico", M, H - 44);
  ctx.textAlign = "right"; ctx.fillText("Página " + String(page), W - M, H - 44); ctx.textAlign = "left";
}
function metric(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, label: string, value: string) {
  box(ctx, x, y, width, 130, "#ffffff", "#e5e5e5"); ctx.fillStyle = "#a3a3a3"; ctx.font = "700 11px Arial"; ctx.fillText(label.toUpperCase(), x + 20, y + 34);
  ctx.fillStyle = "#171717"; ctx.font = "800 20px Arial"; wrap(ctx, value, x + 20, y + 74, width - 40, 25, 2);
}
function sectionTitle(ctx: CanvasRenderingContext2D, title: string, y: number) {
  ctx.fillStyle = "#f97316"; ctx.font = "700 12px Arial"; ctx.fillText("FACTORRH", M, y);
  ctx.fillStyle = "#171717"; ctx.font = "800 28px Arial"; ctx.fillText(title, M, y + 42); return y + 76;
}
function paragraphs(ctx: CanvasRenderingContext2D, ps: string[], y: number) {
  ctx.fillStyle = "#404040"; ctx.font = "16px Arial"; let cy = y;
  ps.forEach(function (p) { cy = wrap(ctx, p, M, cy, CW, 25, 8) + 20; }); return cy;
}
function callout(ctx: CanvasRenderingContext2D, title: string, items: string[], y: number, bg: string, fg: string) {
  const h = Math.min(650, 100 + items.length * 90); box(ctx, M, y, CW, h, bg);
  ctx.fillStyle = fg; ctx.font = "800 21px Arial"; ctx.fillText(title, M + 24, y + 42);
  let ry = y + 86; ctx.font = "15px Arial";
  items.forEach(function (item) { ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(M + 32, ry - 5, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#404040"; ry = wrap(ctx, item, M + 50, ry, CW - 80, 22, 3) + 18; });
  return y + h;
}
function box(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string, stroke?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, 20); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let line = "";
  words.forEach(function (word) { const test = line ? line + " " + word : word; if (!line || ctx.measureText(test).width <= maxWidth) line = test; else { lines.push(line); line = word; } });
  if (line) lines.push(line); const shown = lines.slice(0, maxLines);
  shown.forEach(function (value, index) { ctx.fillText(value, x, y + index * lineHeight); });
  return y + shown.length * lineHeight;
}
function clip(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text; let v = text;
  while (v.length > 1 && ctx.measureText(v + "…").width > maxWidth) v = v.slice(0, -1);
  return v + "…";
}
function short(value: string) { return value.length <= 15 ? value : value.split(" ").slice(0, 2).join(" "); }
function clamp(value: number) { return Math.max(0, Math.min(100, value)); }
function canvasBytes(canvas: HTMLCanvasElement) { return dataUrlBytes(canvas.toDataURL("image/jpeg", 0.92)); }
function dataUrlBytes(url: string) {
  const raw = atob(url.split(",")[1] || ""); const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i); return out;
}
function buildImagePdf(images: Uint8Array[]) {
  const enc = new TextEncoder(); const objects: Uint8Array[] = []; const pageIds: number[] = []; const imageIds: number[] = []; const contentIds: number[] = [];
  let next = 3; images.forEach(function () { pageIds.push(next++); imageIds.push(next++); contentIds.push(next++); });
  objects[1] = enc.encode("<< /Type /Catalog /Pages 2 0 R >>");
  objects[2] = enc.encode("<< /Type /Pages /Kids [" + pageIds.map(function (id) { return String(id) + " 0 R"; }).join(" ") + "] /Count " + String(images.length) + " >>");
  images.forEach(function (image, index) {
    const iid = imageIds[index], cid = contentIds[index], pid = pageIds[index];
    objects[iid] = concat(enc.encode("<< /Type /XObject /Subtype /Image /Width " + String(W) + " /Height " + String(H) + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + String(image.length) + " >>\nstream\n"), image, enc.encode("\nendstream"));
    const command = "q\n595 0 0 842 0 0 cm\n/Im" + String(index) + " Do\nQ"; const cb = enc.encode(command);
    objects[cid] = enc.encode("<< /Length " + String(cb.length) + " >>\nstream\n" + command + "\nendstream");
    objects[pid] = enc.encode("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im" + String(index) + " " + String(iid) + " 0 R >> >> /Contents " + String(cid) + " 0 R >>");
  });
  const chunks: Uint8Array[] = [enc.encode("%PDF-1.4\n")]; const offsets:number[]=[0]; let off=chunks[0].length;
  for (let id=1; id<objects.length; id+=1) { if (!objects[id]) continue; offsets[id]=off; const p=enc.encode(String(id)+" 0 obj\n"), s=enc.encode("\nendobj\n"); chunks.push(p,objects[id],s); off += p.length + objects[id].length + s.length; }
  const xrefOff=off; let xref="xref\n0 "+String(objects.length)+"\n0000000000 65535 f \n";
  for (let id=1; id<objects.length; id+=1) xref += String(offsets[id] || 0).padStart(10,"0")+" 00000 n \n";
  xref += "trailer\n<< /Size "+String(objects.length)+" /Root 1 0 R >>\nstartxref\n"+String(xrefOff)+"\n%%EOF"; chunks.push(enc.encode(xref));
  return new Blob(chunks.map(function (chunk) { return chunk as unknown as BlobPart; }), { type:"application/pdf" });
}
function concat(...parts: Uint8Array[]) { const len=parts.reduce(function(s,p){return s+p.length;},0); const out=new Uint8Array(len); let o=0; parts.forEach(function(p){out.set(p,o);o+=p.length;}); return out; }
function wrap64(value:string){ return value.match(/.{1,76}/g)?.join("\r\n") || value; }
function esc(value:string){ return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;").replace(/\n/g,"<br/>"); }
function triggerDownload(blob:Blob,name:string){ const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(function(){URL.revokeObjectURL(url);},1500); }
function sanitize(value:string){ return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9-_]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90); }
