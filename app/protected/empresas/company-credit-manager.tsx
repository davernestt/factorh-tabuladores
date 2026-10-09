"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type CreditPlan = {
  organization_id: string;
  plan_type: "trial" | "package" | "internal";
  plan_name: string;
  credits_total: number;
  credits_used: number;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
  trial_single_test_only: boolean;
};

export default function CompanyCreditManager({
  organizationId,
  organizationName,
  plan,
}: {
  organizationId: string;
  organizationName: string;
  plan?: CreditPlan | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"trial" | "package">(
    plan?.plan_type === "package" ? "package" : "trial",
  );
  const [planName, setPlanName] = useState(
    plan?.plan_type === "package" ? plan.plan_name : "Paquete anual",
  );
  const [credits, setCredits] = useState(
    plan?.plan_type === "package" ? String(plan.credits_total) : "50",
  );
  const defaultAnnual = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  }, []);
  const [validUntil, setValidUntil] = useState(
    plan?.plan_type === "package" && plan.valid_until
      ? plan.valid_until
      : defaultAnnual,
  );

  useEffect(() => {
    if (!open) return;
    if (plan?.plan_type === "package") {
      setMode("package");
      setPlanName(plan.plan_name || "Paquete anual");
      setCredits(String(plan.credits_total));
      setValidUntil(plan.valid_until || defaultAnnual);
    } else {
      setMode("trial");
      setPlanName("Paquete anual");
      setCredits("50");
      setValidUntil(defaultAnnual);
    }
    setMessage(null);
  }, [open, plan, defaultAnnual]);

  const remaining = plan
    ? Math.max(0, Number(plan.credits_total) - Number(plan.credits_used))
    : 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/empresas/${organizationId}/creditos`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            plan_name: mode === "package" ? planName : "Prueba gratuita",
            credits_total: mode === "package" ? Number(credits) : 2,
            valid_until: mode === "package" ? validUntil : null,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible actualizar el plan.");
      }
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "No fue posible actualizar el plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={
            plan?.plan_type === "package"
              ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
              : "rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3"
          }
        >
          <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
            {plan?.plan_type === "package" ? plan.plan_name : "Prueba gratuita"}
          </div>
          <div className="mt-1 text-sm font-black text-neutral-900">
            {plan ? `${remaining} de ${plan.credits_total} créditos disponibles` : "Sin plan configurado"}
          </div>
          {plan?.valid_until && (
            <div className="mt-1 text-[11px] text-neutral-500">
              Vigencia hasta {new Date(plan.valid_until + "T12:00:00").toLocaleDateString("es-MX")}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
        >
          Créditos / plan
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
                  Licencia psicométrica
                </div>
                <h2 className="mt-2 text-2xl font-black text-neutral-900">
                  {organizationName}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  La prueba gratuita permite 2 aplicaciones, una prueba por liga. Los paquetes consumen 1 crédito por instrumento aplicado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-bold text-neutral-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="space-y-6 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("trial")}
                  className={
                    mode === "trial"
                      ? "rounded-2xl border border-orange-400 bg-orange-50 p-5 text-left"
                      : "rounded-2xl border border-neutral-200 p-5 text-left hover:bg-neutral-50"
                  }
                >
                  <div className="text-sm font-black text-neutral-900">Prueba gratuita</div>
                  <div className="mt-1 text-xs leading-5 text-neutral-500">
                    2 créditos · máximo una psicometría por liga · 30 días.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("package")}
                  className={
                    mode === "package"
                      ? "rounded-2xl border border-orange-400 bg-orange-50 p-5 text-left"
                      : "rounded-2xl border border-neutral-200 p-5 text-left hover:bg-neutral-50"
                  }
                >
                  <div className="text-sm font-black text-neutral-900">Paquete contratado</div>
                  <div className="mt-1 text-xs leading-5 text-neutral-500">
                    Créditos configurables · permite baterías · vigencia anual o personalizada.
                  </div>
                </button>
              </div>

              {mode === "package" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Nombre del paquete
                    </span>
                    <input
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      placeholder="Ej. Profesional 100"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Créditos incluidos
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={credits}
                      onChange={(e) => setCredits(e.target.value)}
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Vigencia hasta
                    </span>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      required
                    />
                  </label>
                </div>
              )}

              <div className="rounded-2xl bg-neutral-50 p-4 text-xs leading-5 text-neutral-600">
                Al activar o renovar un plan, el contador inicia nuevamente desde cero. Una batería de 5 instrumentos consume 5 créditos aunque el candidato reciba una sola liga.
              </div>

              {message && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {message}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-100 pt-5">
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
                  className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Guardando..."
                    : mode === "trial"
                      ? "Reiniciar prueba gratuita"
                      : "Activar / renovar paquete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
