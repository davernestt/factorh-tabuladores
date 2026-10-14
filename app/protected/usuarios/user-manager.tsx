"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildCompanyWelcome } from "@/lib/client-invitation";

type Organization = { id: string; name: string; active: boolean };
type AppUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  organization_id: string | null;
  active: boolean;
};

export default function UserManager({
  organizations,
  user,
}: {
  organizations: Organization[];
  user?: AppUser;
}) {
  const router = useRouter();
  const editing = Boolean(user);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [invite, setInvite] = useState<{
    url: string;
    email: string;
    companyName: string;
  } | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const [form, setForm] = useState({
    display_name: user?.display_name ?? "",
    email: user?.email ?? "",
    organization_id: user?.organization_id ?? organizations[0]?.id ?? "",
    active: user?.active ?? true,
  });

  useEffect(() => {
    if (!open || !user) return;
    setForm({
      display_name: user.display_name ?? "",
      email: user.email,
      organization_id: user.organization_id ?? organizations[0]?.id ?? "",
      active: user.active,
    });
    setMessage(null);
    setInvite(null);
    setWelcomeMessage("");
  }, [open, user, organizations]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.display_name.trim() || !form.email.trim() || !form.organization_id) {
      setMessage("Captura nombre, correo y empresa.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setInvite(null);
    setWelcomeMessage("");

    try {
      const response = await fetch(
        editing ? `/api/admin/usuarios/${user!.user_id}` : "/api/admin/usuarios",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible guardar el usuario.");
      }

      if (!editing && payload.invite_url) {
        const invitation = {
          url: String(payload.invite_url),
          email: form.email.trim(),
          companyName: String(payload.organization_name || organizations.find(
            (organization) => organization.id === form.organization_id,
          )?.name || "tu empresa"),
        };
        setInvite(invitation);
        setWelcomeMessage(buildCompanyWelcome({
          personName: form.display_name,
          organizationName: invitation.companyName,
          email: invitation.email,
          inviteUrl: invitation.url,
        }));
        setMessage("Usuario creado. Revisa el mensaje de bienvenida y elige cómo compartir su invitación.");
        router.refresh();
      } else if (!editing) {
        setMessage("Usuario creado, pero no se obtuvo el enlace. Cierra esta ventana y usa Recuperar acceso en el directorio de usuarios.");
        router.refresh();
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "No fue posible guardar el usuario.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyInvite(kind: "link" | "message") {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(kind === "link" ? invite.url : welcomeMessage);
      setCopied(kind);
    } catch {
      setMessage("No se pudo copiar automáticamente. Selecciona el texto y cópialo manualmente.");
    }
  }

  const shareByWhatsApp = invite
    ? `https://wa.me/?text=${encodeURIComponent(welcomeMessage)}`
    : "";
  const shareByEmail = invite
    ? `mailto:${invite.email}?subject=${encodeURIComponent("Bienvenida a FactoRH · Acceso a tu plataforma")}&body=${encodeURIComponent(welcomeMessage)}`
    : "";

  function close() {
    setOpen(false);
    setMessage(null);
    setInvite(null);
    setWelcomeMessage("");
    setCopied(null);
    if (!editing) {
      setForm({
        display_name: "",
        email: "",
        organization_id: organizations[0]?.id ?? "",
        active: true,
      });
    }
    router.refresh();
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
        {editing ? "Editar usuario" : "+ Crear usuario"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
                  Acceso de empresa
                </div>
                <h2 className="mt-2 text-2xl font-black text-neutral-900">
                  {editing ? "Editar usuario" : "Crear usuario de empresa"}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-bold text-neutral-500 hover:bg-neutral-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5 p-6">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Nombre de la persona
                </span>
                <input
                  value={form.display_name}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, display_name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Ej. Ana López"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Correo de acceso
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, email: e.target.value }))
                  }
                  disabled={editing}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-neutral-100 disabled:text-neutral-500"
                  placeholder="rh@empresa.com"
                  required
                />
                {editing && (
                  <span className="mt-1 block text-xs text-neutral-400">
                    El correo no se modifica desde esta pantalla para proteger el acceso.
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Empresa
                </span>
                <select
                  value={form.organization_id}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, organization_id: e.target.value }))
                  }
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="">Selecciona empresa</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>

              {editing && (
                <label className="flex items-start gap-3 rounded-2xl bg-neutral-50 p-4">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, active: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 accent-orange-500"
                  />
                  <span>
                    <span className="block text-sm font-bold text-neutral-900">
                      Usuario activo
                    </span>
                    <span className="mt-1 block text-xs text-neutral-500">
                      Si lo desactivas ya no podrá entrar, pero se conserva su historial.
                    </span>
                  </span>
                </label>
              )}

              {message && (
                <div
                  className={
                    invite
                      ? "rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                      : "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                  }
                >
                  {message}
                </div>
              )}

              {invite && (
                <div className="space-y-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                      Enlace personal de activación
                    </p>
                    <div className="mt-2 break-all rounded-xl bg-white p-3 text-xs text-neutral-600">
                      {invite.url}
                    </div>
                    <button type="button" onClick={() => void copyInvite("link")}
                      className="mt-3 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-neutral-800 hover:bg-neutral-50">
                      {copied === "link" ? "Enlace copiado" : "Copiar solo enlace"}
                    </button>
                  </div>
                  <div className="border-t border-orange-200 pt-4">
                    <label htmlFor="company-welcome-text" className="block text-xs font-bold uppercase tracking-wide text-orange-700">
                      Mensaje de bienvenida · Editable
                    </label>
                    <p className="mt-2 text-xs leading-6 text-neutral-600">
                      El mensaje es general para cualquier servicio de FactoRH y contiene el
                      enlace de activación. Puedes personalizarlo antes de compartirlo.
                    </p>
                    <textarea id="company-welcome-text" value={welcomeMessage}
                      onChange={(event) => { setWelcomeMessage(event.target.value); setCopied(null); }}
                      rows={11}
                      className="mt-3 w-full resize-y rounded-xl border border-neutral-300 bg-white p-4 text-sm leading-6 text-neutral-800 outline-none focus:border-orange-500"/>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void copyInvite("message")}
                      disabled={!welcomeMessage.trim()}
                      className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
                      {copied === "message" ? "Mensaje copiado" : "Copiar mensaje completo"}
                    </button>
                    <a href={shareByWhatsApp} target="_blank" rel="noopener noreferrer"
                      aria-label="Preparar bienvenida por WhatsApp"
                      className="rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800">
                      Enviar por WhatsApp
                    </a>
                    <a href={shareByEmail} aria-label="Preparar correo de bienvenida"
                      className="rounded-xl border border-orange-300 bg-white px-4 py-3 text-sm font-bold text-orange-700 hover:bg-orange-100">
                      Preparar correo
                    </a>
                  </div>
                  <p className="text-xs leading-6 text-neutral-600">
                    WhatsApp abre el mensaje listo para elegir un contacto; el correo se
                    abre en tu aplicación de correo. <strong>No se envía nada automáticamente.</strong>
                    Revisa al destinatario antes de enviarlo. Comparte el enlace solo por un
                    canal privado: permite establecer la contraseña de la cuenta.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-100 pt-5">
                <button
                  type="button"
                  onClick={close}
                  disabled={saving}
                  className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  {invite ? "Cerrar" : "Cancelar"}
                </button>
                {!invite && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {saving
                      ? "Guardando..."
                      : editing
                        ? "Guardar cambios"
                        : "Crear usuario e invitación"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
