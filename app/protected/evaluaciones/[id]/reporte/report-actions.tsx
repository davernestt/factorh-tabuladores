"use client";

type Props = {
  fileName: string;
};

export default function ReportActions({ fileName }: Props) {
  function downloadPdf() {
    window.print();
  }

  function downloadWord() {
    const report = document.getElementById("leadership-report");
    if (!report) return;

    const styles = `
      body { font-family: Arial, sans-serif; color: #171717; margin: 32px; }
      h1 { font-size: 28px; margin-bottom: 6px; }
      h2 { font-size: 20px; margin-top: 24px; }
      h3 { font-size: 16px; margin-top: 18px; }
      p, li { font-size: 11pt; line-height: 1.45; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0 22px; }
      th, td { border: 1px solid #d4d4d4; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f5f5f5; }
      svg { max-width: 520px; height: auto; }
      .no-print, button, a { display: none !important; }
    `;

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>${styles}</style>
        </head>
        <body>
          ${report.innerHTML}
        </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", html], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sanitize(fileName)}.doc`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="no-print flex flex-wrap gap-3">
      <button
        type="button"
        onClick={downloadPdf}
        className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-800"
      >
        Descargar PDF
      </button>
      <button
        type="button"
        onClick={downloadWord}
        className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-50"
      >
        Descargar Word
      </button>
    </div>
  );
}

function sanitize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
