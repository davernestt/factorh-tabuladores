'use client';
import {useState} from 'react';
const PUBLIC_360_ORIGIN=process.env.NEXT_PUBLIC_360_BASE_URL||'https://factorh-evaluaciones-git-feedback360-v1-davidcarrillorh-5996.vercel.app';
export default function InviteActions({id, raterId}:{id:string;raterId:string}){
  const [loading,setLoading]=useState(false);const [url,setUrl]=useState('');const [error,setError]=useState('');
  async function regenerate(){if(!window.confirm('Esta acción invalida la liga anterior. ¿Deseas generar otra?'))return;setLoading(true);setError('');setUrl('');try{
    const res=await fetch(`/api/admin/360/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rater_id:raterId})});const json=await res.json();if(!res.ok)throw Error(json.error||'Error al reexpedir.');setUrl(`${PUBLIC_360_ORIGIN}${json.path}`);
  }catch(e){setError(e instanceof Error?e.message:'No disponible')}finally{setLoading(false)}}
  return <div className="text-xs"><button type="button" disabled={loading} onClick={regenerate} className="rounded-xl border border-neutral-300 px-3 py-2 font-bold text-neutral-700 hover:border-orange-500 disabled:opacity-50">{loading?'Generando…':'Reexpedir liga'}</button>{url&&<div className="mt-2 max-w-xs"><p className="break-all text-neutral-600">{url}</p><button type="button" className="mt-1 font-bold text-orange-600" onClick={()=>void navigator.clipboard.writeText(url)}>Copiar nueva liga</button></div>}{error&&<p className="mt-1 text-red-600">{error}</p>}</div>;
}
