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

  let canvas = makePage();
  let ctx = mustContext(canvas);
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, W, 550);
  brand(ctx, 74, 92);
  ctx.fillStyle = "#a3a3a3";
  ctx.font = "700 14px Arial";
  ctx.fillText("EVALUACIONES PSICOMÉTRICAS", 74, 128);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 48px Arial";
  wrap(ctx, data.title, 74, 245, 700, 54, 3);
  ctx.fillStyle = "#d4d4d4";
  ctx.font = "20px Arial";
  wrap(ctx, data.subtitle || (integral ? "Síntesis ejecutiva y acumulado de resultados individuales" : "Reporte ejecutivo de resultados"), 74, 420, 700, 30, 3);
  box(ctx, 850, 90, 320, 300, "#1f1f1f", "#404040");
  ctx.fillStyle = "#fb923c";
  ctx.font = "700 12px Arial";
  ctx.fillText("PERSONA EVALUADA", 880, 130);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 24px Arial";
  wrap(ctx, data.personName, 880, 170, 260, 29, 3);
  ctx.fillStyle = "#d4d4d4";
  ctx.font = "15px Arial";
  wrap(ctx, [data.jobTitle, data.area].filter(Boolean).join(" · ") || "Sin puesto registrado", 880, 255, 260, 22, 3);
  ctx.fillText(data.organizationName, 880, 335);
  metric(ctx, M, 650, 330, "Pruebas incluidas", String(data.instruments.length));
  metric(ctx, M + 350, 650, 430, "Proceso", data.processName || "Evaluación psicométrica");
  metric(ctx, M + 800, 650, 312, "Fecha", data.reportDate);
  box(ctx, M, 835, CW, 430, "#fff7ed", "#fed7aa");
  ctx.fillStyle = "#c2410c";
  ctx.font = "700 13px Arial";
  ctx.fillText(integral ? "REPORTE INTEGRAL" : "LECTURA EJECUTIVA", M + 28, 880);
  ctx.fillStyle = "#171717";
  ctx.font = "800 28px Arial";
  ctx.fillText(integral ? "Síntesis general + resultados por prueba" : "Interpretación del instrumento", M + 28, 930);
  ctx.fillStyle = "#404040";
  ctx.font = "17px Arial";
  wrap(ctx, data.executiveSummary[0] || "Resumen del proceso psicométrico.", M + 28, 985, CW - 56, 27, 8);
  footer(ctx, page++);
  out.push(canvasBytes(canvas));

  canvas = makePage();
  ctx = mustContext(canvas);
  header(ctx, data, integral ? "Síntesis ejecutiva integral" : "Lectura ejecutiva");
  let y = 220;
  y = sectionTitle(ctx, "Resumen ejecutivo", y);
  y = paragraphs(ctx, data.executiveSummary, y);
  if (data.keyFindings && data.keyFindings.length) {
    y += 20;
    y = callout(ctx, "Hallazgos principales", data.keyFindings, y, "#ecfdf5", "#065f46");
  }
  if (data.cautions && data.cautions.length && y < 1230) {
    y += 20;
    callout(ctx, "Aspectos a validar", data.cautions, y, "#fffbeb", "#92400e");
  }
  footer(ctx, page++);
  out.push(canvasBytes(canvas));

  if (data.objectiveText || (data.battery && data.battery.length)) {
    canvas = makePage();
    ctx = mustContext(canvas);
    header(ctx, data, "Objetivo y batería aplicada");
    let oy = 220;
    if (data.objectiveText) {
      oy = sectionTitle(ctx, "Objetivo de la evaluación", oy);
      ctx.fillStyle = "#404040";
      ctx.font = "16px Arial";
      oy = wrap(ctx, data.objectiveText, M, oy, CW, 25, 12) + 28;
    }
    if (data.battery && data.battery.length) {
      ctx.fillStyle = "#f97316";
      ctx.font = "700 12px Arial";
      ctx.fillText("BATERÍA APLICADA", M, oy);
      oy += 40;
      data.battery.slice(0, 9).forEach(function (item) {
        box(ctx, M, oy, CW, 108, "#fafafa", "#e5e5e5");
        ctx.fillStyle = "#171717";
        ctx.font = "800 15px Arial";
        ctx.fillText(clip(ctx, item.name, 360), M + 20, oy + 32);
        ctx.fillStyle = "#525252";
        ctx.font = "13px Arial";
        wrap(ctx, item.description, M + 330, oy + 26, CW - 350, 19, 4);
        oy += 120;
      });
    }
    footer(ctx, page++);
    out.push(canvasBytes(canvas));
  }

  if (data.jobComparison && data.jobComparison.length) {
    for (let start = 0; start < data.jobComparison.length; start += 7) {
      canvas = makePage();
      ctx = mustContext(canvas);
      header(ctx, data, "Comparación contra perfil objetivo");
      let jy = 220;
      jy = sectionTitle(ctx, start === 0 ? "Mapa de competencias de referencia" : "Mapa de competencias · continuación", jy);
      ctx.fillStyle = "#737373";
      ctx.font = "14px Arial";
      jy = wrap(
        ctx,
        "La comparación organiza evidencia psicométrica frente a rangos definidos para el perfil objetivo. No constituye una recomendación automática de contratación.",
        M,
        jy,
        CW,
        22,
        5,
      ) + 24;

      data.jobComparison.slice(start, start + 7).forEach(function (item) {
        box(ctx, M, jy, CW, 148, "#ffffff", "#e5e5e5");
        ctx.fillStyle = "#171717";
        ctx.font = "800 16px Arial";
        ctx.fillText(clip(ctx, item.name, 410), M + 20, jy + 34);
        ctx.fillStyle = "#737373";
        ctx.font = "11px Arial";
        ctx.fillText(item.importance.toUpperCase(), M + 20, jy + 60);
        ctx.fillStyle = "#171717";
        ctx.font = "800 15px Arial";
        ctx.fillText(
          "Referencia " +
            Math.round(item.referenceMin) +
            "–" +
            Math.round(item.referenceMax),
          M + 470,
          jy + 34,
        );
        ctx.fillText(
          "Evidencia " + (item.observed === null ? "—" : Math.round(item.observed)),
          M + 720,
          jy + 34,
        );
        ctx.fillStyle =
          item.status === "Dentro del rango de referencia"
            ? "#065f46"
            : item.status === "Sin evidencia suficiente"
              ? "#737373"
              : "#92400e";
        ctx.font = "700 13px Arial";
        wrap(ctx, item.status, M + 20, jy + 100, CW - 40, 20, 2);
        jy += 162;
      });
      footer(ctx, page++);
      out.push(canvasBytes(canvas));
    }
  }

  if (data.managerGuidance || (data.onboardingPlan && data.onboardingPlan.length)) {
    canvas = makePage();
    ctx = mustContext(canvas);
    header(ctx, data, "Lectura para el jefe de la vacante");
    let my = 220;
    if (data.managerGuidance) {
      my = sectionTitle(ctx, "Cómo gestionar e integrar este perfil", my);
      const managerItems = [
        ["SUPERVISIÓN RECOMENDADA", data.managerGuidance.supervision],
        ["BAJO PRESIÓN", data.managerGuidance.pressure],
        ["INTEGRACIÓN CON EL EQUIPO", data.managerGuidance.team],
      ];
      managerItems.forEach(function (item) {
        box(ctx, M, my, CW, 160, "#fafafa", "#e5e5e5");
        ctx.fillStyle = "#f97316";
        ctx.font = "700 11px Arial";
        ctx.fillText(item[0], M + 20, my + 30);
        ctx.fillStyle = "#404040";
        ctx.font = "14px Arial";
        wrap(ctx, item[1], M + 20, my + 60, CW - 40, 21, 4);
        my += 176;
      });
      if (data.managerGuidance.motivators.length) {
        box(ctx, M, my, CW, 135, "#fff7ed", "#fed7aa");
        ctx.fillStyle = "#9a3412";
        ctx.font = "700 11px Arial";
        ctx.fillText("MOTIVADORES CLAVE", M + 20, my + 30);
        ctx.fillStyle = "#404040";
        ctx.font = "15px Arial";
        wrap(ctx, data.managerGuidance.motivators.join(" · "), M + 20, my + 62, CW - 40, 22, 3);
        my += 150;
      }
    }
    footer(ctx, page++);
    out.push(canvasBytes(canvas));

    if (data.onboardingPlan && data.onboardingPlan.length) {
      canvas = makePage();
      ctx = mustContext(canvas);
      header(ctx, data, "Integración sugerida 30–60–90");
      let py = sectionTitle(ctx, "Primeros 90 días", 220);
      data.onboardingPlan.forEach(function (stage) {
        box(ctx, M, py, CW, 340, "#fafafa", "#e5e5e5");
        ctx.fillStyle = "#f97316";
        ctx.font = "700 12px Arial";
        ctx.fillText(stage.period.toUpperCase(), M + 22, py + 35);
        ctx.fillStyle = "#171717";
        ctx.font = "800 20px Arial";
        ctx.fillText(clip(ctx, stage.focus, CW - 44), M + 22, py + 72);
        let ay = py + 112;
        ctx.font = "14px Arial";
        stage.actions.forEach(function (action) {
          ctx.fillStyle = "#404040";
          ctx.fillText("•", M + 24, ay);
          ay = wrap(ctx, action, M + 45, ay, CW - 70, 21, 4) + 12;
        });
        py += 365;
      });
      footer(ctx, page++);
      out.push(canvasBytes(canvas));
    }
  }

  data.instruments.forEach(function (instrument) {
    canvas = makePage();
    ctx = mustContext(canvas);
    header(ctx, data, instrument.name);
    ctx.fillStyle = "#171717";
    ctx.font = "800 28px Arial";
    ctx.fillText(instrument.name, M, 218);
    if (instrument.subtitle) {
      ctx.fillStyle = "#737373";
      ctx.font = "15px Arial";
      wrap(ctx, instrument.subtitle, M, 254, CW, 22, 3);
    }
    if (instrument.overallDisplay) {
      box(ctx, M, 325, 280, 105, "#fff7ed", "#fed7aa");
      ctx.fillStyle = "#9a3412";
      ctx.font = "700 11px Arial";
      ctx.fillText((instrument.overallLabel || "Resultado global").toUpperCase(), M + 20, 356);
      ctx.fillStyle = "#171717";
      ctx.font = "800 30px Arial";
      ctx.fillText(instrument.overallDisplay, M + 20, 402);
    }
    ctx.drawImage(buildChart(instrument, 650, 480), 470, 300, 650, 480);
    if (instrument.summary && instrument.summary.length) {
      ctx.fillStyle = "#f97316";
      ctx.font = "700 12px Arial";
      ctx.fillText("INTERPRETACIÓN GENERAL", M, 865);
      ctx.fillStyle = "#404040";
      ctx.font = "15px Arial";
      let sy = 905;
      instrument.summary.slice(0, 4).forEach(function (p) {
        sy = wrap(ctx, p, M, sy, CW, 22, 5) + 14;
      });
    }
    footer(ctx, page++);
    out.push(canvasBytes(canvas));

    for (let i = 0; i < instrument.dimensions.length; i += 3) {
      canvas = makePage();
      ctx = mustContext(canvas);
      header(ctx, data, instrument.name + " · detalle");
      let dy = 210;
      instrument.dimensions.slice(i, i + 3).forEach(function (item) {
        dy = dimensionCard(ctx, item, dy) + 18;
      });
      footer(ctx, page++);
      out.push(canvasBytes(canvas));
    }

    if ((instrument.highlights && instrument.highlights.length) || (instrument.watchouts && instrument.watchouts.length)) {
      canvas = makePage();
      ctx = mustContext(canvas);
      header(ctx, data, instrument.name + " · lectura aplicada");
      let iy = 220;
      if (instrument.highlights && instrument.highlights.length) {
        iy = callout(ctx, "Elementos destacados", instrument.highlights, iy, "#ecfdf5", "#065f46") + 24;
      }
      if (instrument.watchouts && instrument.watchouts.length) {
        callout(ctx, "Puntos para profundizar", instrument.watchouts, iy, "#fff7ed", "#92400e");
      }
      footer(ctx, page++);
      out.push(canvasBytes(canvas));
    }
  });

  if (data.interviewQuestions && data.interviewQuestions.length) {
    canvas = makePage();
    ctx = mustContext(canvas);
    header(ctx, data, "Guía para entrevista");
    let qy = sectionTitle(ctx, "Preguntas de profundización", 220);
    ctx.fillStyle = "#404040";
    ctx.font = "15px Arial";
    data.interviewQuestions.slice(0, 12).forEach(function (item, index) {
      ctx.fillStyle = "#171717";
      ctx.font = "800 14px Arial";
      ctx.fillText(String(index + 1) + ".", M, qy);
      ctx.fillStyle = "#404040";
      ctx.font = "15px Arial";
      qy = wrap(ctx, item, M + 34, qy, CW - 34, 22, 5) + 24;
    });
    footer(ctx, page++);
    out.push(canvasBytes(canvas));
  }

  canvas = makePage();
  ctx = mustContext(canvas);
  header(ctx, data, "Cierre del reporte");
  box(ctx, M, 250, CW, 360, "#fafafa", "#e5e5e5");
  ctx.fillStyle = "#f97316";
  ctx.font = "700 13px Arial";
  ctx.fillText("CIERRE EJECUTIVO", M + 28, 295);
  ctx.fillStyle = "#171717";
  ctx.font = "800 30px Arial";
  ctx.fillText("Conclusión para toma de decisión", M + 28, 345);
  ctx.fillStyle = "#404040";
  ctx.font = "17px Arial";
  wrap(ctx, data.closing || "El resultado debe integrarse con entrevista, experiencia, evidencia de desempeño y requisitos reales del puesto.", M + 28, 400, CW - 56, 27, 8);
  footer(ctx, page++);
  out.push(canvasBytes(canvas));

  return out;
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
