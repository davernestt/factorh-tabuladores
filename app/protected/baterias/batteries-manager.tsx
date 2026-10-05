"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Organization = {
  id: string;
  name: string;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
};

type AccessRow = {
  organization_id: string;
  template_id: string;
  enabled: boolean;
  participant_sendable: boolean;
};

type Battery = {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
};

type BatteryItem = {
  battery_id: string;
  template_id: string;
  sort_order: number;
};

type Props = {
  organizations: Organization[];
  templates: Template[];
  access: AccessRow[];
  batteries: Battery[];
  batteryItems: BatteryItem[];
};

export default function BatteriesManager({
  organizations,
  templates,
  access,
  batteries,
  batteryItems,
}: Props) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const templateById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );

  const allowedTemplateIds = useMemo(
    () =>
      new Set(
        access
          .filter(
            (row) =>
              row.organization_id === organizationId &&
              row.enabled &&
              row.participant_sendable,
          )
          .map((row) => row.template_id),
      ),
    [access, organizationId],
  );

  const availableTemplates = useMemo(
    () => templates.filter((template) => allowedTemplateIds.has(template.id)),
    [templates, allowedTemplateIds],
  );

  const currentBatteries = useMemo(
    () =>
      batteries.filter(
        (battery) =>
          battery.organization_id === null ||
          battery.organization_id === organizationId,
      ),
    [batteries, organizationId],
  );

  function toggleTemplate(templateId: string) {
    setSelectedIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    );
  }

  async function createBattery(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/baterias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          name,
          description,
          template_ids: selectedIds,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible crear la batería.");
      }

      setName("");
      setDescription("");
      setSelectedIds([]);
      setMessage("Batería creada correctamente.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible crear la batería.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteBattery(id: string, batteryName: string) {
    const confirmed = window.confirm(
      `¿Eliminar la batería "${batteryName}"?\n\nEsto no elimina evaluaciones ya asignadas.`,
    );
    if (!confirmed) return;

    setDeletingId(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/baterias/${id}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "No fue posible eliminar la batería.");
      }

      setMessage("Batería eliminada.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible eliminar la batería.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
          Nueva batería
        </div>
        <h2 className="mt-2 text-xl font-black text-neutral-900">
          Crear combinación predeterminada
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Guarda una combinación para reutilizarla cuando asignes evaluaciones.
        </p>

        <form onSubmit={createBattery} className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Empresa">
              <select
                value={organizationId}
                onChange={(event) => {
                  setOrganizationId(event.target.value);
                  setSelectedIds([]);
                }}
                className="input"
                required
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nombre de la batería">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="input"
                placeholder="Ej. Batería de ingreso · Ventas"
                required
              />
            </Field>
          </div>

          <Field label="Descripción (opcional)">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="input"
              placeholder="Ej. Evaluaciones iniciales para posiciones comerciales"
            />
          </Field>

          <div>
            <div className="mb-3 text-sm font-semibold text-neutral-800">
              Pruebas incluidas
            </div>

            {availableTemplates.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Esta empresa todavía no tiene pruebas habilitadas para enviarse
                a participantes.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {availableTemplates.map((template) => {
                  const selected = selectedIds.includes(template.id);
                  return (
                    <label
                      key={template.id}
                      className={
                        selected
                          ? "cursor-pointer rounded-2xl border border-orange-400 bg-orange-50 p-4"
                          : "cursor-pointer rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                      }
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleTemplate(template.id)}
                          className="mt-1 h-4 w-4 accent-orange-500"
                        />
                        <div>
                          <div className="font-bold text-neutral-900">
                            {template.name}
                          </div>
                          {template.description && (
                            <p className="mt-1 text-xs text-neutral-500">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {message && (
            <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                saving ||
                !organizationId ||
                !name.trim() ||
                selectedIds.length === 0
              }
              className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-40"
            >
              {saving ? "Guardando..." : "Guardar batería"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
          Guardadas
        </div>
        <h2 className="mt-2 text-xl font-black text-neutral-900">
          Baterías predeterminadas
        </h2>

        <div className="mt-5 space-y-3">
          {currentBatteries.length === 0 ? (
            <p className="rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-500">
              Esta empresa todavía no tiene baterías guardadas.
            </p>
          ) : (
            currentBatteries.map((battery) => {
              const itemIds = batteryItems
                .filter((item) => item.battery_id === battery.id)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((item) => item.template_id);
              const itemNames = itemIds
                .map((id) => templateById.get(id)?.name)
                .filter((value): value is string => Boolean(value));

              return (
                <div
                  key={battery.id}
                  className="rounded-2xl border border-neutral-200 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-black text-neutral-900">
                        {battery.name}
                      </div>
                      {battery.description && (
                        <p className="mt-1 text-sm text-neutral-500">
                          {battery.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {itemNames.map((itemName) => (
                          <span
                            key={itemName}
                            className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600"
                          >
                            {itemName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={deletingId === battery.id}
                      onClick={() => void deleteBattery(battery.id, battery.name)}
                      className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
                    >
                      {deletingId === battery.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgb(212 212 212);
          border-radius: 0.75rem;
          background: white;
          padding: 0.75rem 0.875rem;
          color: rgb(23 23 23);
          outline: none;
        }
        .input:focus {
          border-color: rgb(249 115 22);
          box-shadow: 0 0 0 3px rgb(255 237 213);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-neutral-800">
        {label}
      </span>
      {children}
    </label>
  );
}
