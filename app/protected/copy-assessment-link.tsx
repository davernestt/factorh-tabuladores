"use client";

import { useState } from "react";

type Props = {
  token: string;
  personName: string;
  templateName: string;
  organizationName: string;
};

export default function CopyAssessmentLink({
  token,
  personName,
  templateName,
  organizationName,
}: Props) {
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  function assessmentUrl() {
    return `${window.location.origin}/e/${token}`;
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

  return (
    <>
      <button
        type="button"
        onClick={() => void copyText(assessmentUrl(), "link")}
        className="text-left text-xs font-semibold text-neutral-600 hover:text-orange-600"
      >
        {copied === "link" ? "Liga copiada ✓" : "Copiar liga"}
      </button>

      <button
        type="button"
        onClick={() =>
          void copyText(
            `Hola ${personName}. Te comparto tu liga para responder ${templateName} de ${organizationName}: ${assessmentUrl()}`,
            "message",
          )
        }
        className="text-left text-xs font-semibold text-neutral-600 hover:text-orange-600"
      >
        {copied === "message" ? "Mensaje copiado ✓" : "Copiar mensaje"}
      </button>
    </>
  );
}
