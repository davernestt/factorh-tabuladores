"use client";

import { useState } from "react";

type Props = {
  token: string;
  personName: string;
  templateName: string;
  organizationName: string;
  email?: string | null;
  phone?: string | null;
};

export default function CopyAssessmentLink({
  token,
  personName,
  templateName,
  organizationName,
  email,
  phone,
}: Props) {
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  function assessmentUrl() {
    return `${window.location.origin}/e/${token}`;
  }

  function invitationMessage() {
    return `Hola ${personName}, te comparto la liga para realizar tu evaluación "${templateName}" asignada por ${organizationName} a través de FactorRH.

Ingresa aquí:
${assessmentUrl()}

Te recomendamos responderla en un espacio tranquilo y contestar con honestidad.

Gracias.`;
  }

  function normalizedWhatsAppPhone() {
    const digits = (phone ?? "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length === 10) return `52${digits}`;
    return digits;
  }

  async function copyText(value: string, type: "link" | "message") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(type);
      window.setTimeout(() => setCopied(null), 1800);
    }
  }

  function openWhatsApp() {
    const number = normalizedWhatsAppPhone();
    const base = number ? `https://wa.me/${number}` : "https://wa.me/";
    window.open(
      `${base}?text=${encodeURIComponent(invitationMessage())}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function openEmail() {
    const subject = `Invitación a evaluación FactorRH · ${templateName}`;
    const recipient = email?.trim() ?? "";
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(invitationMessage())}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void copyText(assessmentUrl(), "link")}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:border-orange-300 hover:text-orange-600"
      >
        {copied === "link" ? "Liga copiada ✓" : "Copiar liga"}
      </button>

      <button
        type="button"
        onClick={openWhatsApp}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:border-orange-300 hover:text-orange-600"
        title={phone ? `Enviar por WhatsApp a ${phone}` : "Abrir WhatsApp para elegir contacto"}
      >
        WhatsApp
      </button>

      <button
        type="button"
        onClick={openEmail}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:border-orange-300 hover:text-orange-600"
        title={email ? `Preparar correo para ${email}` : "Abrir correo para elegir destinatario"}
      >
        Correo
      </button>

      <button
        type="button"
        onClick={() => void copyText(invitationMessage(), "message")}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:border-orange-300 hover:text-orange-600"
      >
        {copied === "message" ? "Mensaje copiado ✓" : "Copiar mensaje"}
      </button>
    </div>
  );
}
