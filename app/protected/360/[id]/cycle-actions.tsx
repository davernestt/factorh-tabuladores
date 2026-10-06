'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function CycleActions({id,status}:{id:string;status:string}){
  const [working,setWorking]=useState(false);const [error,setError]=useState('');const router=useRouter();
  async function change(){if(!window.confirm('¿Cerrar definitivamente este ciclo? Ya no se recibirán respuestas.'))return;setWorking(true);setError('');try{
    const res=await fetch(`/api/admin/360/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'closed'})});const data=await res.json();if(!res.ok)throw Error(data.error||'Error al guardar.');router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Error desconocido.')}finally{setWorking(false)}}
  if(status!=='open')return <span className="no-print rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-600">Ciclo cerrado</span>;
  return <div className="no-print"><button type="button" disabled={working} onClick={change} className="rounded-xl border border-neutral-300 bg-white px-4 py-2 font-bold text-neutral-700 hover:border-orange-500 disabled:opacity-50">{working?'Guardando…':'Cerrar y consolidar resultados'}</button>{error&&<p className="mt-2 text-xs text-red-700">{error}</p>}</div>
}
