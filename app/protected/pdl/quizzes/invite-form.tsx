'use client';
import { useState } from 'react';
import { createQuizInvite, revokeQuizInvite } from './actions';
export default function InviteForm({organizations,quizzes}:{organizations:{id:string;name:string}[];quizzes:{id:string;title:string}[]}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[url,setUrl]=useState(''),[copied,setCopied]=useState(false);
 return <form className="space-y-4 rounded-xl border bg-white p-5" onSubmit={async e=>{e.preventDefault();const form=new FormData(e.currentTarget);setBusy(true);setError('');setUrl('');setCopied(false);try{const result=await createQuizInvite(form);if(result.error)setError(result.error);else if(result.path)setUrl(new URL(result.path,window.location.origin).href);}catch{setError('No se pudo crear la liga. Intenta nuevamente.');}finally{setBusy(false);}}}>
  <h2 className="text-xl font-bold">Asignar quiz</h2><div className="grid gap-4 md:grid-cols-2">
  <label>Empresa<select name="organizationId" required disabled={busy} className="mt-1 block w-full rounded border p-2"><option value="">Selecciona una empresa</option>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
  <label>Tema<select name="quizId" required disabled={busy} className="mt-1 block w-full rounded border p-2">{quizzes.map(q=><option key={q.id} value={q.id}>{q.title}</option>)}</select></label>
  <label>Nombre del participante<input name="name" required maxLength={150} disabled={busy} className="mt-1 block w-full rounded border p-2"/></label>
  <label>Correo (opcional)<input name="email" type="email" maxLength={254} disabled={busy} className="mt-1 block w-full rounded border p-2"/></label></div>
  <p className="text-sm text-neutral-600">La liga es personal, vence en 30 días y permite dos intentos. Copia y comparte la liga al crearla; no se envían correos automáticamente.</p>
  <button disabled={busy} className="rounded bg-orange-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy?'Creando…':'Crear liga'}</button>
  {error?<p role="alert" className="text-red-700">{error}</p>:null}
  {url?<div className="rounded bg-orange-50 p-4"><label className="block font-bold">Liga para el participante<input readOnly value={url} onFocus={e=>e.target.select()} className="my-2 w-full rounded border bg-white p-2 text-sm font-normal"/></label><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setError('Selecciona la liga y cópiala manualmente.');}}} className="font-bold text-orange-800">{copied?'Copiada':'Copiar liga'}</button></div>:null}
 </form>;
}
export function RevokeButton({id}:{id:string}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <><button disabled={busy} className="text-sm text-red-700 underline" onClick={async()=>{setBusy(true);try{const r=await revokeQuizInvite(id);if(r.error)setError(r.error);}catch{setError('No se pudo desactivar.');}finally{setBusy(false);}}}>{busy?'Desactivando…':'Desactivar liga'}</button>{error?<p role="alert">{error}</p>:null}</>;
}
