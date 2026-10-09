"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type PlatformModule = {
  module_key: string;
  name: string;
  description: string | null;
  route: string | null;
  client_available: boolean;
};

export type ModuleSubscription = {
  id: string;
  organization_id: string;
  module_key: string;
  status: "requested" | "trial" | "active" | "paused" | "expired" | "cancelled";
  plan_name: string | null;
  starts_on: string | null;
  ends_on: string | null;
  requested_on: string | null;
  requested_notes: string | null;
  reminder_days: number;
  client_notice: boolean;
};

const statusLabel: Record<ModuleSubscription["status"], string> = {
  requested: "Solicitado",
  trial: "Demo / prueba",
  active: "Activo",
  paused: "Pausado",
  expired: "Vencido",
  cancelled: "Cancelado",
};

export default function CompanyModuleManager({
  organizationId,
  module,
  subscription,
  psychometricsManagedSeparately = false,
}: {
  organizationId: string;
  module: PlatformModule;
  subscription?: ModuleSubscription | null;
  psychometricsManagedSeparately?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    status: subscription?.status ?? ("requested" as ModuleSubscription["status"]),
    plan_name: subscription?.plan_name ?? "",
    starts_on: subscription?.starts_on ?? "",
    ends_on: subscription?.ends_on ?? "",
    requested_on: subscription?.requested_on ?? new Date().toISOString().slice(0, 10),
    requested_notes: subscription?.requested_notes ?? "",
    reminder_days: subscription?.reminder_days ?? 30,
    client_notice: subscription?.client_notice ?? true,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      status: subscription?.status ?? "requested",
      plan_name: subscription?.plan_name ?? "",
      starts_on: subscription?.starts_on ?? "",
      ends_on: subscription?.ends_on ?? "",
      requested_on:
        subscription?.requested_on ?? new Date().toISOString().slice(0, 10),
      requested_notes: subscription?.requested_notes ?? "",
      reminder_days: subscription?.reminder_days ?? 30,
      client_notice: subscription?.client_notice ?? true,
    });
    setMessage(null);
  }, [open, subscription]);

  const daysRemaining =
    subscription?.ends_on
      ? Math.ceil(
          (new Date(subscription.ends_on + "T23:59:59").getTime() - Date.now()) /
            86400000,
        )
      : null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/empresas/${organizationId}/modulos`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module_key: module.module_key, ...form }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible guardar el módulo.");
      }
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "No fue posible guardar el módulo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <article className="rounded-2xl border border-neutral-200 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black text-neutral-900">{module.name}</h3>
              <span
                className={
                  subscription?.status === "active"
                    ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
                    : subscription?.status === "trial"
                      ? "rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700"
                      : subscription?.status === "requested"
                        ? "rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700"
                        : "rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-500"
                }
              >
                {subscription ? statusLabel[subscription.status] : "No solicitado"}
              </span>
              {!module.client_available && (
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-500">
                  Portal cliente pendiente
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              {module.description}
            </p>
            {subscription && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-500">
                {subscription.plan_name && <span>Plan: <strong>{subscription.plan_name}</strong></span>}
                {subscription.starts_on && <span>Inicio: <strong>{subscription.starts_on}</strong></span>}
                {subscription.ends_on && <span>Vence: <strong>{subscription.ends_on}</strong></span>}
                {daysRemaining !== null && (
                  <span className={daysRemaining <= 30 ? "font-bold text-amber-700" : ""}>
                    {daysRemaining >= 0 ? `${daysRemaining} días restantes` : `Vencido hace ${Math.abs(daysRemaining)} días`}
                  </span>
                )}
              </div>
            )}
            {subscription?.requested_notes && (
              <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Solicitud / nota: {subscription.requested_notes}
              </div>
            )}
          </div>

          {psychometricsManagedSeparately ? (
            <div className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-600">
              Se administra desde Créditos / plan
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              {subscription ? "Editar módulo" : "Registrar solicitud"}
            </button>
          )}
        </div>
      </article>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
                  Módulo de plataforma
                </div>
                <h2 className="mt-2 text-2xl font-black text-neutral-900">
                  {module.name}
                </h2>
                {!module.client_available && (
                  <p className="mt-2 text-sm text-amber-700">
                    Puedes registrar que el cliente lo solicitó, pero todavía no está habilitado como módulo autónomo en el portal de empresa.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-bold text-neutral-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5 p-6">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Estado
                </span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      status: e.target.value as ModuleSubscription["status"],
                    }))
                  }
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                >
                  <option value="requested">Solicitado</option>
                  <option value="trial" disabled={!module.client_available}>Demo / prueba</option>
                  <option value="active" disabled={!module.client_available}>Activo</option>
                  <option value="paused">Pausado</option>
                  <option value="expired">Vencido</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                    Plan / modalidad
                  </span>
                  <input
                    value={form.plan_name}
                    onChange={(e) => setForm((current) => ({ ...current, plan_name: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm"
                    placeholder="Ej. Licencia anual"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                    Inicio
                  </span>
                  <input
                    type="date"
                    value={form.starts_on}
                    onChange={(e) => setForm((current) => ({ ...current, starts_on: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                    Vencimiento
                  </span>
                  <input
                    type="date"
                    value={form.ends_on}
                    onChange={(e) => setForm((current) => ({ ...current, ends_on: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                    Fecha de solicitud
                  </span>
                  <input
                    type="date"
                    value={form.requested_on}
                    onChange={(e) => setForm((current) => ({ ...current, requested_on: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                    Recordar con anticipación
                  </span>
                  <select
                    value={form.reminder_days}
                    onChange={(e) => setForm((current) => ({ ...current, reminder_days: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value={30}>30 días antes</option>
                    <option value={45}>45 días antes</option>
                    <option value={60}>60 días antes</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Qué pidió / notas comerciales
                </span>
                <textarea
                  value={form.requested_notes}
                  onChange={(e) => setForm((current) => ({ ...current, requested_notes: e.target.value }))}
                  className="min-h-28 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm"
                  placeholder="Ej. Pidió demo para 5 líderes; dar seguimiento la próxima semana..."
                />
              </label>

              <label className="flex items-start gap-3 rounded-2xl bg-neutral-50 p-4">
                <input
                  type="checkbox"
                  checked={form.client_notice}
                  onChange={(e) => setForm((current) => ({ ...current, client_notice: e.target.checked }))}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <span className="text-sm text-neutral-700">
                  Mostrar al cliente el aviso de vencimiento y cuenta regresiva.
                </span>
              </label>

              {message && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {message}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-neutral-100 pt-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#4A4A4A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar módulo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
