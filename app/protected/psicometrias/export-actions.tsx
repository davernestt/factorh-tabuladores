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
  const pageBottom = H - 118;

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

  // Portada
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, W, 535);
  brand(ctx, 74, 92);
  ctx.fillStyle = "#a3a3a3";
  ctx.font = "700 14px Arial";
  ctx.fillText("EVALUACIONES PSICOMÉTRICAS", 74, 128);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 48px Arial";
  wrap(
    ctx,
    data.title,
    74,
    238,
    710,
    54,
    3,
  );
  ctx.fillStyle = "#d4d4d4";
  ctx.font = "20px Arial";
  wrap(
    ctx,
    data.subtitle ||
      (integral
        ? "Síntesis ejecutiva y resultados individuales"
        : "Reporte ejecutivo de resultados"),
    74,
    407,
    710,
    30,
    3,
  );

  box(ctx, 850, 90, 320, 286, "#1f1f1f", "#404040");
  ctx.fillStyle = "#fb923c";
  ctx.font = "700 12px Arial";
  ctx.fillText("PERSONA EVALUADA", 880, 130);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 24px Arial";
  wrap(ctx, data.personName, 880, 170, 260, 29, 3);
  ctx.fillStyle = "#d4d4d4";
  ctx.font = "15px Arial";
  wrap(
    ctx,
    [data.jobTitle, data.area].filter(Boolean).join(" · ") ||
      "Sin puesto registrado",
    880,
    248,
    260,
    22,
    3,
  );
  ctx.fillText(data.organizationName, 880, 322);
  ctx.fillStyle = "#a3a3a3";
  ctx.font = "13px Arial";
  ctx.fillText(data.reportDate, 880, 354);

  metric(ctx, M, 620, 330, "Pruebas incluidas", String(data.instruments.length));
  metric(
    ctx,
    M + 350,
    620,
    430,
    "Proceso",
    data.processName || "Evaluación psicométrica",
  );
  metric(ctx, M + 800, 620, 312, "Fecha", data.reportDate);

  box(ctx, M, 795, CW, 330, "#fff7ed", "#fed7aa");
  ctx.fillStyle = "#c2410c";
  ctx.font = "700 13px Arial";
  ctx.fillText(integral ? "REPORTE INTEGRAL" : "LECTURA EJECUTIVA", M + 28, 840);
  ctx.fillStyle = "#171717";
  ctx.font = "800 28px Arial";
  ctx.fillText(
    integral
      ? "Síntesis ejecutiva + anexo por prueba"
      : "Interpretación del instrumento",
    M + 28,
    892,
  );
  ctx.fillStyle = "#404040";
  ctx.font = "17px Arial";
  wrap(
    ctx,
    data.executiveSummary[0] || "Resumen del proceso psicométrico.",
    M + 28,
    945,
    CW - 56,
    27,
    6,
  );
  commitPage();

  // Resumen ejecutivo compacto
  beginPage(integral ? "Síntesis ejecutiva integral" : "Lectura ejecutiva");
  let y = sectionTitle(ctx, "Resumen ejecutivo", 210);
  ctx.fillStyle = "#404040";
  ctx.font = "15px Arial";
  data.executiveSummary.slice(0, 6).forEach(function (paragraph) {
    y = wrap(ctx, paragraph, M, y, CW, 23, 7) + 15;
  });

  const findingItems = data.keyFindings?.slice(0, 6) ?? [];
  const cautionItems = data.cautions?.slice(0, 6) ?? [];
  if (findingItems.length || cautionItems.length) {
    y += 12;
    const gap = 18;
    const colW = (CW - gap) / 2;
    const leftH = findingItems.length
      ? compactListBoxHeight(ctx, findingItems, colW, 13, 19)
      : 0;
    const rightH = cautionItems.length
      ? compactListBoxHeight(ctx, cautionItems, colW, 13, 19)
      : 0;
    const maxH = Math.max(leftH, rightH);
    if (y + maxH > pageBottom) {
      commitPage();
      beginPage("Síntesis ejecutiva · hallazgos");
      y = 205;
    }
    if (findingItems.length) {
      drawCompactListBox(
        ctx,
        M,
        y,
        colW,
        "Hallazgos principales",
        findingItems,
        "#ecfdf5",
        "#065f46",
      );
    }
    if (cautionItems.length) {
      drawCompactListBox(
        ctx,
        M + colW + gap,
        y,
        colW,
        "Aspectos a validar",
        cautionItems,
        "#fffbeb",
        "#92400e",
      );
    }
  }
  commitPage();

  // Objetivo + batería, con alturas reales para evitar empalmes
  if (data.objectiveText || (data.battery && data.battery.length)) {
    beginPage("Objetivo y batería aplicada");
    let oy = 205;

    if (data.objectiveText) {
      oy = sectionTitle(ctx, "Objetivo de la evaluación", oy);
      ctx.fillStyle = "#404040";
      ctx.font = "15px Arial";
      oy = wrap(ctx, data.objectiveText, M, oy, CW, 23, 10) + 26;
    }

    if (data.battery && data.battery.length) {
      ctx.fillStyle = "#f97316";
      ctx.font = "700 12px Arial";
      ctx.fillText("BATERÍA APLICADA", M, oy);
      oy += 28;

      for (let index = 0; index < data.battery.length; index += 1) {
        const item = data.battery[index];
        const rowH = batteryRowHeight(ctx, item, CW);

        if (oy + rowH > pageBottom) {
          commitPage();
          beginPage("Batería aplicada · continuación");
          oy = 205;
        }

        drawBatteryRow(ctx, item, oy, CW, index + 1);
        oy += rowH + 10;
      }
    }
    commitPage();
  }

  // Comparación con puesto
  if (data.jobComparison && data.jobComparison.length) {
    beginPage("Comparación contra perfil objetivo");
    let jy = sectionTitle(ctx, "Mapa de competencias de referencia", 205);
    ctx.fillStyle = "#737373";
    ctx.font = "14px Arial";
    jy =
      wrap(
        ctx,
        "La comparación organiza evidencia psicométrica frente a rangos definidos para el perfil objetivo. No constituye una recomendación automática de contratación.",
        M,
        jy,
        CW,
        21,
        4,
      ) + 18;

    for (let index = 0; index < data.jobComparison.length; index += 1) {
      const item = data.jobComparison[index];
      const rowH = 116;
      if (jy + rowH > pageBottom) {
        commitPage();
        beginPage("Comparación contra perfil objetivo · continuación");
        jy = 205;
      }
      drawJobComparisonRow(ctx, item, jy);
      jy += rowH + 10;
    }
    commitPage();
  }

  // Lectura para el jefe de la vacante
  if (data.managerGuidance) {
    beginPage("Lectura para el jefe de la vacante");
    let my = sectionTitle(ctx, "Cómo gestionar e integrar este perfil", 205);
    const gap = 18;
    const colW = (CW - gap) / 2;

    const supervisionH = guidanceBoxHeight(
      ctx,
      data.managerGuidance.supervision,
      colW,
    );
    const pressureH = guidanceBoxHeight(
      ctx,
      data.managerGuidance.pressure,
      colW,
    );
    const topH = Math.max(supervisionH, pressureH);

    drawGuidanceBox(
      ctx,
      M,
      my,
      colW,
      topH,
      "SUPERVISIÓN RECOMENDADA",
      data.managerGuidance.supervision,
    );
    drawGuidanceBox(
      ctx,
      M + colW + gap,
      my,
      colW,
      topH,
      "BAJO PRESIÓN",
      data.managerGuidance.pressure,
    );
    my += topH + 18;

    const teamH = guidanceBoxHeight(ctx, data.managerGuidance.team, CW);
    drawGuidanceBox(
      ctx,
      M,
      my,
      CW,
      teamH,
      "INTEGRACIÓN CON EL EQUIPO",
      data.managerGuidance.team,
    );
    my += teamH + 18;

    if (data.managerGuidance.motivators.length) {
      const motivatorText = data.managerGuidance.motivators.join(" · ");
      const motivatorLines = countLines(ctx, motivatorText, CW - 40, "15px Arial");
      const motivatorH = 76 + motivatorLines * 22;
      box(ctx, M, my, CW, motivatorH, "#fff7ed", "#fed7aa");
      ctx.fillStyle = "#9a3412";
      ctx.font = "700 11px Arial";
      ctx.fillText("MOTIVADORES CLAVE", M + 20, my + 28);
      ctx.fillStyle = "#404040";
      ctx.font = "15px Arial";
      wrap(ctx, motivatorText, M + 20, my + 58, CW - 40, 22, 5);
      my += motivatorH + 18;
    }

    if (data.managerGuidance.coaching.length) {
      const coachingH = compactListBoxHeight(
        ctx,
        data.managerGuidance.coaching.slice(0, 5),
        CW,
        13,
        19,
      );
      if (my + coachingH <= pageBottom) {
        drawCompactListBox(
          ctx,
          M,
          my,
          CW,
          "Retroalimentación / coaching",
          data.managerGuidance.coaching.slice(0, 5),
          "#fafafa",
          "#525252",
        );
      }
    }
    commitPage();
  }

  // 30-60-90 más compacto
  if (data.onboardingPlan && data.onboardingPlan.length) {
    beginPage("Integración sugerida 30-60-90");
    let py = sectionTitle(ctx, "Primeros 90 días", 205);

    data.onboardingPlan.forEach(function (stage) {
      const stageH = onboardingBoxHeight(ctx, stage, CW);
      if (py + stageH > pageBottom) {
        commitPage();
        beginPage("Integración sugerida 30-60-90 · continuación");
        py = 205;
      }
      drawOnboardingBox(ctx, stage, py, CW, stageH);
      py += stageH + 16;
    });
    commitPage();
  }

  // Resultados por instrumento
  data.instruments.forEach(function (instrument, instrumentIndex) {
    beginPage(instrument.name);

    let iy = 205;
    ctx.fillStyle = "#f97316";
    ctx.font = "700 11px Arial";
    ctx.fillText(
      "RESULTADO INDIVIDUAL " + String(instrumentIndex + 1) + " DE " + String(data.instruments.length),
      M,
      iy,
    );
    iy += 32;

    ctx.fillStyle = "#171717";
    ctx.font = "800 28px Arial";
    iy = wrap(ctx, instrument.name, M, iy, CW, 33, 2) + 7;

    if (instrument.subtitle) {
      ctx.fillStyle = "#737373";
      ctx.font = "14px Arial";
      iy = wrap(ctx, instrument.subtitle, M, iy, CW, 21, 3) + 12;
    }

    const chartY = Math.max(330, iy + 8);
    if (instrument.overallDisplay) {
      box(ctx, M, chartY + 20, 285, 112, "#fff7ed", "#fed7aa");
      ctx.fillStyle = "#9a3412";
      ctx.font = "700 11px Arial";
      ctx.fillText(
        (instrument.overallLabel || "Resultado global").toUpperCase(),
        M + 20,
        chartY + 50,
      );
      ctx.fillStyle = "#171717";
      ctx.font = "800 27px Arial";
      wrap(ctx, instrument.overallDisplay, M + 20, chartY + 88, 245, 30, 2);
      ctx.drawImage(buildChart(instrument, 780, 500), M + 315, chartY, 780, 500);
    } else {
      ctx.drawImage(buildChart(instrument, 820, 500), 210, chartY, 820, 500);
    }

    let sy = chartY + 525;
    if (instrument.summary && instrument.summary.length) {
      ctx.fillStyle = "#f97316";
      ctx.font = "700 11px Arial";
      ctx.fillText("INTERPRETACIÓN GENERAL", M, sy);
      sy += 32;
      ctx.fillStyle = "#404040";
      ctx.font = "14px Arial";
      instrument.summary.slice(0, 3).forEach(function (paragraph) {
        sy = wrap(ctx, paragraph, M, sy, CW, 21, 4) + 10;
      });
    }

    const highlights = instrument.highlights?.slice(0, 4) ?? [];
    const watchouts = instrument.watchouts?.slice(0, 4) ?? [];
    if (highlights.length || watchouts.length) {
      sy += 4;
      const gap = 18;
      const colW = (CW - gap) / 2;
      const h1 = highlights.length
        ? compactListBoxHeight(ctx, highlights, colW, 12, 18)
        : 0;
      const h2 = watchouts.length
        ? compactListBoxHeight(ctx, watchouts, colW, 12, 18)
        : 0;
      const boxH = Math.max(h1, h2);
      if (sy + boxH <= pageBottom) {
        if (highlights.length) {
          drawCompactListBox(
            ctx,
            M,
            sy,
            colW,
            "Elementos destacados",
            highlights,
            "#ecfdf5",
            "#065f46",
            12,
            18,
          );
        }
        if (watchouts.length) {
          drawCompactListBox(
            ctx,
            M + colW + gap,
            sy,
            colW,
            "Puntos para profundizar",
            watchouts,
            "#fff7ed",
            "#92400e",
            12,
            18,
          );
        }
      }
    }
    commitPage();

    // Detalle por dimensión con paginación dinámica.
    if (instrument.dimensions.length) {
      beginPage(instrument.name + " · detalle");
      let dy = 205;
      ctx.fillStyle = "#f97316";
      ctx.font = "700 11px Arial";
      ctx.fillText("RESULTADOS POR DIMENSIÓN", M, dy);
      dy += 30;

      for (let index = 0; index < instrument.dimensions.length; index += 1) {
        const item = instrument.dimensions[index];
        const rowH = compactDimensionHeight(ctx, item, CW);

        if (dy + rowH > pageBottom) {
          commitPage();
          beginPage(instrument.name + " · detalle");
          dy = 205;
          ctx.fillStyle = "#f97316";
          ctx.font = "700 11px Arial";
          ctx.fillText("RESULTADOS POR DIMENSIÓN · CONTINUACIÓN", M, dy);
          dy += 30;
        }

        drawCompactDimension(ctx, item, dy, CW, rowH);
        dy += rowH + 12;
      }
      commitPage();
    }
  });

  // Entrevista y cierre, aprovechando la misma página cuando existe espacio.
  if (data.interviewQuestions && data.interviewQuestions.length) {
    beginPage("Guía para entrevista");
    let qy = sectionTitle(ctx, "Preguntas de profundización", 205);
    ctx.fillStyle = "#404040";
    ctx.font = "14px Arial";

    data.interviewQuestions.slice(0, 12).forEach(function (item, index) {
      const lines = countLines(ctx, item, CW - 52, "14px Arial");
      const itemH = Math.max(42, lines * 21 + 18);
      if (qy + itemH > pageBottom - 250) {
        commitPage();
        beginPage("Guía para entrevista · continuación");
        qy = 210;
      }

      ctx.fillStyle = "#171717";
      ctx.font = "800 13px Arial";
      ctx.fillText(String(index + 1) + ".", M, qy);
      ctx.fillStyle = "#404040";
      ctx.font = "14px Arial";
      qy = wrap(ctx, item, M + 34, qy, CW - 34, 21, 6) + 15;
    });

    if (qy + 230 <= pageBottom) {
      drawCompactClosing(ctx, data, qy + 18);
      commitPage();
    } else {
      commitPage();
      beginPage("Cierre del reporte");
      drawCompactClosing(ctx, data, 245);
      commitPage();
    }
  } else {
    beginPage("Cierre del reporte");
    drawCompactClosing(ctx, data, 245);
    commitPage();
  }

  return out;
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
  ctx.fillStyle = "#111111"; ctx.fillRect(0, 0, W, 150); brand(ctx, M, 62);
  ctx.fillStyle = "#ffffff"; ctx.font = "800 22px Arial"; ctx.fillText(clip(ctx, title, 540), M, 112);
  ctx.fillStyle = "#a3a3a3"; ctx.font = "14px Arial"; ctx.textAlign = "right";
  ctx.fillText(clip(ctx, data.personName, 420), W - M, 70);
  ctx.fillText(clip(ctx, data.organizationName + " · " + data.reportDate, 420), W - M, 104);
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
