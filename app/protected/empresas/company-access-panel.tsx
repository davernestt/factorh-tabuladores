"use client";

import { useMemo, useState } from "react";

type ClientUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  active: boolean;
};

export default function CompanyAccessPanel({
  organizationSlug,
  users,
}: {
  organizationId: string;
  organizationSlug: string;
  users: ClientUser[];
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const portalUrl = useMemo(
    () =>
      typeof window === "undefined"
        ? `/cliente/${organizationSlug}`
        : `${window.location.origin}/cliente/${organizationSlug}`,
    [organizationSlug],
  );

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
        Acceso del cliente
      </div>
      <h2 className="mt-2 text-2xl font-black text-neutral-900">
        Portal permanente y usuarios
      </h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Esta liga es permanente para la empresa. Cada persona entra con su propio correo y contraseña.
      </p>

      <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
          Liga permanente
        </div>
        <div className="mt-2 break-all text-sm font-semibold text-neutral-800">
          {portalUrl}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy(portalUrl, "portal")}
            className="rounded-xl bg-[#4A4A4A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#3F3F3F]"
          >
            {copied === "portal" ? "Copiada" : "Copiar liga"}
          </button>
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
          >
            Ver portal
          </a>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <strong>Contraseñas:</strong> por seguridad no son visibles para FactoRH ni para el administrador.
        Puedes ver el usuario de acceso y, si necesita cambiar su contraseña, se hace mediante el flujo de restablecimiento.
      </div>

      <div className="mt-6 space-y-3">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-500">
            Aún no hay usuarios de empresa. Créalo desde la sección Usuarios.
          </div>
        ) : (
          users.map((user) => (
            <article
              key={user.user_id}
              className="rounded-2xl border border-neutral-200 p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-black text-neutral-900">
                    {user.display_name || "Usuario de empresa"}
                  </div>
                  <div className="mt-1 text-sm text-neutral-600">{user.email}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {user.active ? "Acceso activo" : "Acceso inactivo"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void copy(user.email, "email:" + user.user_id)}
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-700"
                >
                  {copied === "email:" + user.user_id ? "Correo copiado" : "Copiar usuario"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
