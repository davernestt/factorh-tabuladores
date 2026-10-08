"use client";

type Props={fileName:string;elementId:string};

export default function ReportActions({fileName,elementId}:Props){
  function downloadPdf(){window.print();}
  function downloadWord(){
    const report=document.getElementById(elementId); if(!report)return;
    const styles=`
      body{font-family:Arial,sans-serif;color:#262626;margin:28px}
      h1{font-size:26px} h2{font-size:20px;margin-top:22px} h3{font-size:15px;margin-top:16px}
      p,li{font-size:10.5pt;line-height:1.5} table{width:100%;border-collapse:collapse;margin:12px 0 20px}
      th,td{border:1px solid #d4d4d4;padding:7px;text-align:left;vertical-align:top}
      th{background:#f5f5f5} svg{max-width:640px;height:auto}.no-print,button,a{display:none!important}
      .bg-neutral-800,.bg-neutral-900{background:#262626!important;color:#fff!important}
    `;
    const html=`<html><head><meta charset="utf-8"/><style>${styles}</style></head><body>${report.innerHTML}</body></html>`;
    const blob=new Blob(["\ufeff",html],{type:"application/msword"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url;a.download=`${sanitize(fileName)}.doc`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  return <div className="no-print flex flex-wrap gap-3">
    <button type="button" onClick={downloadPdf} className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-800">Descargar PDF</button>
    <button type="button" onClick={downloadWord} className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-50">Descargar Word</button>
  </div>
}
function sanitize(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9-_]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90)}
