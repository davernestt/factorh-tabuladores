"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  assignmentId: string;
  participantName: string;
  templateName: string;
};

export default function DeleteAssessmentButton({
  assignmentId,
  participantName,
  templateName,
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeAssessment() {
    const confirmed = window.confirm(
      `¿Eliminar esta evaluación?\n\n${participantName} · ${templateName}\n\nSe borrarán también sus respuestas y resultados. Esta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/evaluaciones/${assignmentId}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "No fue posible eliminar la evaluación.");
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible eliminar la evaluación.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={deleting}
        onClick={() => void removeAssessment()}
        className="text-left text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
      >
        {deleting ? "Eliminando..." : "Eliminar"}
      </button>
      {error && <div className="mt-1 max-w-48 text-xs text-red-600">{error}</div>}
    </div>
  );
}
