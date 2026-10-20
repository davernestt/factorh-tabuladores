"use client";

import FactoRHLogo from "@/components/factorh-logo";
import { useEffect, useState } from "react";

export default function ClientLoginForm({
  organizationName,
  organizationSlug,
}: {
  organizationName: string;
  organizationSlug: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"error" | "success">("error");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const setup = params.get("setup");

    if (setup === "success") {
      setMessageType("success");
      setMessage("Tu contraseña quedó creada. Ya puedes iniciar sesión.");
    } else if (error === "invalid_credentials") {
      setMessageType("error");
      setMessage("Correo o contraseña incorrectos.");
    } else if (error === "wrong_company") {
      setMessageType("error");
      setMessage("Esta cuenta no pertenece a este portal de empresa.");
    } else if (error === "unauthorized") {
      setMessageType("error");
      setMessage("Esta cuenta no tiene acceso activo a este portal.");
    }
  }, []);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-5 text-center">
        <FactoRHLogo className="mx-auto h-14 w-auto" />
        <div className="mt-3 text-xs font-bold uppercase tracking-[.18em] text-neutral-500">
          Acceso de {organizationName}
        </div>
      </div>

      <form
        action="/api/auth/client-login"
        method="post"
        autoComplete="off"
        className="space-y-5"
      >
        <input
          type="hidden"
          name="organization_slug"
          value={organizationSlug}
        />

        {message && (
          <div
            className={
              messageType === "success"
                ? "rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                : "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {message}
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-neutral-900">
            Correo
          </span>
          <input
            type="email"
            name="client_portal_email"
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            required
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            placeholder="tu@empresa.com"
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-neutral-900">
              Contraseña
            </span>
          </div>
          <input
            type="password"
            name="client_portal_password"
            autoComplete="new-password"
            data-lpignore="true"
            data-1p-ignore="true"
            required
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-[#4A4A4A] px-5 py-3 text-sm font-bold text-white hover:bg-[#3F3F3F]"
        >
          Entrar a mi plataforma
        </button>
      </form>

      <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-orange-900">
        <strong>¿Es tu primera vez?</strong> Utiliza la liga de activación que
        te envió FactoRH para crear tu contraseña. Si la liga expiró o se cerró,
        solicita una nueva a tu contacto de FactoRH.
      </div>
    </div>
  );
}
