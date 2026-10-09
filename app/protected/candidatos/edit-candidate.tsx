"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Candidate = {
  id: string; organization_id: string; first_name: string; last_name: string | null;
  email: string | null; phone: string | null; job_title: string | null; area: string | null;
};
type Org = { id: string; name: string };

export default function EditCandidate({ candidate, organizations, locked }: {
  candidate: Candidate; organizations: Org[]; locked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    organization_id: candidate.organization_id, first_name: candidate.first_name,
    last_name: candidate.last_name ?? "", email: candidate.email ?? "",
    phone: candidate.phone ?? "", job_title: candidate.job_title ?? "", area: candidate.area ?? ""
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/candidatos/${candidate.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se guardaron los cambios.");
      setOpen(false); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ocurrió un error."); }
    finally { setBusy(false); }
  }
  return (
    <div className="text-sm">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="rounded-xl border border-orange-300 px-4 py-2 font-bold text-orange-700 hover:bg-orange-50">
        {open ? "Cancelar edición" : "Editar candidato"}
      </button>
      {open && <form onSubmit={save} className="mt-4 grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 font-semibold">Empresa
          <select value={form.organization_id} onChange={e => update("organization_id", e.target.value)}
            disabled={locked} className="rounded-lg border border-neutral-300 bg-white p-2">
            {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-semibold">Nombre
          <input required value={form.first_name} onChange={e => update("first_name", e.target.value)} className="rounded-lg border border-neutral-300 p-2"/>
        </label>
        {([["last_name","Apellidos"],["job_title","Puesto"],["area","Área"],["email","Correo"],["phone","Teléfono"]] as const).map(([key,label]) =>
          <label key={key} className="flex flex-col gap-1 font-semibold">{label}
            <input value={form[key]} onChange={e => update(key,e.target.value)} className="rounded-lg border border-neutral-300 p-2"/>
          </label>
        )}
        {locked && <p className="sm:col-span-2 text-amber-700">El cambio de empresa está bloqueado porque alguna evaluación ya no está pendiente. Puedes editar los demás datos.</p>}
        {message && <p role="alert" className="sm:col-span-2 text-red-700">{message}</p>}
        <button disabled={busy} className="rounded-xl bg-orange-500 px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? "Guardando..." : "Guardar cambios"}</button>
      </form>}
    </div>
  );
}
