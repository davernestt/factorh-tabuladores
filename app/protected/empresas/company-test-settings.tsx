"use client";

import { useState } from "react";

type CatalogItem = {
  name: string;
  description: string | null;
  variants: Array<{
    id: string;
    organization_id: string | null;
  }>;
};

type AccessRow = {
  template_id: string;
  enabled: boolean;
  participant_sendable: boolean;
};

type Props = {
  organizationId: string;
  catalog: CatalogItem[];
  access: AccessRow[];
};

export default function CompanyTestSettings({
  organizationId,
  catalog,
  access,
}: Props) {
  const initial = new Map(access.map((row) => [row.template_id, row]));
  const [state, setState] = useState(() => {
    const values: Record<string, { enabled: boolean; participant: boolean; templateId: string }> = {};

    for (const item of catalog) {
      const ownVariant =
        item.variants.find((variant) => variant.organization_id === organizationId) ??
        item.variants[0];

      const mapped = item.variants
        .map((variant) => initial.get(variant.id))
        .find(Boolean);

      values[item.name] = {
        enabled: mapped?.enabled ?? false,
        participant: mapped?.participant_sendable ?? false,
        templateId:
          item.variants.find((variant) => initial.has(variant.id))?.id ??
          ownVariant.id,
      };
    }

    return values;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(
    item: CatalogItem,
    next: { enabled: boolean; participant: boolean; templateId: string },
  ) {
    setSaving(item.name);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/empresas/${organizationId}/pruebas`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_id: next.templateId,
            enabled: next.enabled,
            participant_sendable: next.enabled ? next.participant : false,
          }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible guardar.");
      }

      setState((current) => ({
        ...current,
        [item.name]: {
          ...next,
          participant: next.enabled ? next.participant : false,
        },
      }));
      setMessage(`Guardado: ${item.name}`);
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible guardar.",
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-3">
      {catalog.map((item) => {
        const current = state[item.name];
        const busy = saving === item.name;

        return (
          <div
            key={item.name}
            className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="font-bold text-neutral-900">{item.name}</div>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-500">
                  {item.description ?? "Instrumento del catálogo FactorRH."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={current.enabled}
                    disabled={busy}
                    onChange={(event) =>
                      void save(item, {
                        ...current,
                        enabled: event.target.checked,
                        participant: event.target.checked
                          ? current.participant
                          : false,
                      })
                    }
                    className="h-4 w-4 accent-orange-500"
                  />
                  Disponible para empresa
                </label>

                <label
                  className={
                    current.enabled
                      ? "flex items-center gap-2 text-sm font-semibold text-neutral-700"
                      : "flex items-center gap-2 text-sm font-semibold text-neutral-400"
                  }
                >
                  <input
                    type="checkbox"
                    checked={current.participant}
                    disabled={!current.enabled || busy}
                    onChange={(event) =>
                      void save(item, {
                        ...current,
                        participant: event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-orange-500"
                  />
                  Se puede enviar al participante
                </label>

                {busy && (
                  <span className="text-xs font-semibold text-orange-600">
                    Guardando...
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {message && (
        <div className="text-right text-xs font-semibold text-neutral-500">
          {message}
        </div>
      )}
    </div>
  );
}
