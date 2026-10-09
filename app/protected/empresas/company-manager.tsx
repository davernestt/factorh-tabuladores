"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Organization = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  lifecycle_stage: "prospect" | "client" | "inactive";
  website: string | null;
  phone: string | null;
  commercial_email: string | null;
  notes: string | null;
};

type Props = {
  organization?: Organization;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CompanyManager({ organization }: Props) {
  const router = useRouter();
  const editing = Boolean(organization);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [form, setForm] = useState({
    name: organization?.name ?? "",
    slug: organization?.slug ?? "",
    lifecycle_stage: organization?.lifecycle_stage ?? ("client" as "prospect" | "client" | "inactive"),
    website: organization?.website ?? "",
    phone: organization?.phone ?? "",
    commercial_email: organization?.commercial_email ?? "",
    notes: organization?.notes ?? "",
    enable_psychometrics: true,
  });

  useEffect(() => {
    if (!open || !organization) return;
    setForm({
      name: organization.name,
      slug: organization.slug,
      lifecycle_stage: organization.lifecycle_stage,
      website: organization.website ?? "",
      phone: organization.phone ?? "",
      commercial_email: organization.commercial_email ?? "",
      notes: organization.notes ?? "",
      enable_psychometrics: true,
    });
    setSlugTouched(true);
    setMessage(null);
  }, [open, organization]);

  function updateName(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug: slugTouched ? current.slug : slugify(name),
    }));
  }

  function close() {
    if (saving) return;
    setOpen(false);
    setMessage(null);
    if (!editing) {
      setForm({
        name: "",
        slug: "",
        lifecycle_stage: "client",
        website: "",
        phone: "",
        commercial_email: "",
        notes: "",
        enable_psychometrics: true,
      });
      setSlugTouched(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setMessage("Escribe el nombre de la empresa.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        editing ? `/api/admin/empresas/${organization!.id}` : "/api/admin/empresas",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible guardar la empresa.");
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible guardar la empresa.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          editing
            ? "rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            : "rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        }
      >
        {editing ? "Editar empresa" : "+ Nueva empresa"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
                  Administración de empresas
                </div>
                <h2 className="mt-2 text-2xl font-black text-neutral-900">
                  {editing ? "Editar empresa" : "Nueva empresa"}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {editing
                    ? "Actualiza datos comerciales y estatus. No se elimina el historial de la empresa."
                    : "Al crearla puedes dejar listas las psicometrías FactoRH desde el primer momento."}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-bold text-neutral-500 hover:bg-neutral-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre de la empresa *">
                  <input
                    value={form.name}
                    onChange={(event) => updateName(event.target.value)}
                    className="input-company"
                    placeholder="Ej. Industrias Acme"
                  />
                </Field>

                <Field label="Identificador / slug">
                  <input
                    value={form.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setForm((current) => ({
                        ...current,
                        slug: slugify(event.target.value),
                      }));
                    }}
                    className="input-company"
                    placeholder="industrias-acme"
                  />
                </Field>

                <Field label="Estatus">
                  <select
                    value={form.lifecycle_stage}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lifecycle_stage: event.target.value as "prospect" | "client" | "inactive",
                      }))
                    }
                    className="input-company bg-white"
                  >
                    <option value="client">Cliente activo</option>
                    <option value="prospect">Prospecto</option>
                    <option value="inactive">Inactiva</option>
                  </select>
                </Field>

                <Field label="Correo comercial">
                  <input
                    type="email"
                    value={form.commercial_email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, commercial_email: event.target.value }))
                    }
                    className="input-company"
                    placeholder="rh@empresa.com"
                  />
                </Field>

                <Field label="Teléfono">
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    className="input-company"
                    placeholder="33 0000 0000"
                  />
                </Field>

                <Field label="Sitio web">
                  <input
                    value={form.website}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, website: event.target.value }))
                    }
                    className="input-company"
                    placeholder="https://empresa.com"
                  />
                </Field>
              </div>

              <Field label="Notas">
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="input-company min-h-28 resize-y"
                  placeholder="Datos comerciales, condiciones, observaciones..."
                />
              </Field>

              {!editing && (
                <label className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <input
                    type="checkbox"
                    checked={form.enable_psychometrics}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        enable_psychometrics: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 accent-orange-500"
                  />
                  <span>
                    <span className="block text-sm font-bold text-neutral-900">
                      Habilitar psicometrías FactoRH
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-neutral-600">
                      Deja disponibles automáticamente las pruebas psicométricas generales para esta empresa. Después puedes encender o apagar instrumentos desde esta misma pantalla.
                    </span>
                  </span>
                </label>
              )}

              {message && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {message}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-100 pt-5">
                <button
                  type="button"
                  onClick={close}
                  disabled={saving}
                  className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {saving
                    ? "Guardando..."
                    : editing
                      ? "Guardar cambios"
                      : "Crear empresa"}
                </button>
              </div>
            </form>
          </div>

          <style jsx>{`
            .input-company {
              width: 100%;
              border-radius: 0.75rem;
              border: 1px solid rgb(212 212 212);
              padding: 0.75rem 1rem;
              font-size: 0.875rem;
              outline: none;
            }
            .input-company:focus {
              border-color: rgb(251 146 60);
              box-shadow: 0 0 0 4px rgb(255 237 213);
            }
          `}</style>
        </div>
      )}
    </>
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
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}
