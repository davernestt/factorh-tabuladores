"use client";

import { useEffect, useMemo, useState } from "react";

type Assignment = {
  id: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  relationship_type: string;
  evaluator_name: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type Dimension = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  weight: number | string;
};

type Question = {
  id: string;
  dimension_id: string | null;
  prompt: string;
  question_type: "scale" | "text";
  sort_order: number;
  required: boolean;
  allow_evidence: boolean;
  min_value: number | string | null;
  max_value: number | string | null;
  allow_not_observed: boolean;
};

type StoredResponse = {
  question_id: string;
  numeric_value: number | string | null;
  text_value: string | null;
  evidence_text: string | null;
  is_not_observed: boolean;
  answered_at: string;
};

type Result = {
  dimension_id: string;
  score: number | string;
  percentage: number | string;
  answered_questions: number;
};

type AssessmentData = {
  assignment: Assignment;
  process: { name: string };
  person: {
    first_name: string;
    last_name: string | null;
    job_title: string | null;
    area: string | null;
  };
  organization: { name: string };
  template: {
    id: string;
    name: string;
    description: string | null;
    version: number;
  };
  dimensions: Dimension[];
  questions: Question[];
  responses: StoredResponse[];
  results: Result[];
};

type LocalResponse = {
  numeric_value: number | null;
  text_value: string;
  is_not_observed: boolean;
};

const scaleLabels = [
  "No lo realizo / necesito desarrollarlo significativamente",
  "Lo realizo ocasionalmente o necesito apoyo",
  "Lo realizo adecuadamente de manera habitual",
  "Lo realizo consistentemente y con autonomía",
  "Es una fortaleza; podría ser referente para otros",
];

export default function AssessmentClient({ token }: { token: string }) {
  const [data, setData] = useState<AssessmentData | null>(null);
  const [responses, setResponses] = useState<Record<string, LocalResponse>>({});
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  async function loadAssessment() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/evaluacion/${token}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "No fue posible cargar la evaluación.");
      }

      const assessment = payload as AssessmentData;
      setData(assessment);

      const initial: Record<string, LocalResponse> = {};
      for (const stored of assessment.responses) {
        initial[stored.question_id] = {
          numeric_value:
            stored.numeric_value === null ? null : Number(stored.numeric_value),
          text_value: stored.text_value ?? "",
          is_not_observed: stored.is_not_observed,
        };
      }
      setResponses(initial);
      setStarted(
        assessment.assignment.status === "in_progress" ||
          assessment.assignment.status === "completed",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssessment();
  }, [token]);

  const scaleQuestions = useMemo(
    () => data?.questions.filter((question) => question.question_type === "scale") ?? [],
    [data],
  );

  const answeredScale = useMemo(
    () =>
      scaleQuestions.filter((question) => {
        const response = responses[question.id];
        return Boolean(
          response &&
            (response.numeric_value !== null || response.is_not_observed),
        );
      }).length,
    [responses, scaleQuestions],
  );

  const progress =
    scaleQuestions.length === 0
      ? 0
      : Math.round((answeredScale / scaleQuestions.length) * 100);

  async function saveAnswer(
    question: Question,
    next: LocalResponse,
  ) {
    setResponses((current) => ({ ...current, [question.id]: next }));
    setSavingQuestion(question.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/evaluacion/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          question_id: question.id,
          numeric_value: next.numeric_value,
          text_value: next.text_value,
          is_not_observed: next.is_not_observed,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible guardar la respuesta.");
      }

      setData((current) =>
        current
          ? {
              ...current,
              assignment: {
                ...current.assignment,
                status:
                  current.assignment.status === "pending"
                    ? "in_progress"
                    : current.assignment.status,
              },
            }
          : current,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible guardar.",
      );
    } finally {
      setSavingQuestion(null);
    }
  }

  async function completeAssessment() {
    if (answeredScale < scaleQuestions.length) {
      setMessage(
        `Aún faltan ${scaleQuestions.length - answeredScale} respuestas de escala.`,
      );
      return;
    }

    setFinishing(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/evaluacion/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "No fue posible finalizar la evaluación.");
      }

      await loadAssessment();
      setStarted(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible finalizar.",
      );
    } finally {
      setFinishing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
        <div className="rounded-3xl bg-white border border-neutral-200 p-10 shadow-sm text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando evaluación...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-3xl bg-white border border-neutral-200 p-10 shadow-sm">
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            FactorRH Evaluaciones
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            No pudimos abrir esta evaluación
          </h1>
          <p className="mt-3 text-neutral-600">
            {message ?? "Verifica que el enlace sea correcto o solicita uno nuevo."}
          </p>
        </div>
      </main>
    );
  }

  if (data.assignment.status === "completed") {
    return (
      <main className="min-h-screen bg-neutral-100 px-5 py-10">
        <div className="mx-auto max-w-3xl">
          <BrandHeader />
          <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-700">
              ✓
            </div>
            <div className="mt-5 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              Evaluación finalizada
            </div>
            <h1 className="mt-5 text-3xl font-bold text-neutral-900">
              Gracias, {data.person.first_name.trim()}.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-neutral-600">
              Tus respuestas quedaron registradas correctamente. El equipo
              responsable revisará los resultados dentro del proceso
              correspondiente.
            </p>
            <div className="mx-auto mt-8 max-w-xl rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-600">
              Ya no necesitas realizar ninguna acción. Puedes cerrar esta ventana.
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="min-h-screen bg-neutral-100 px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <BrandHeader />
          <section className="mt-8 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-900 px-7 py-9 text-white md:px-10">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
                {data.organization.name}
              </div>
              <h1 className="mt-3 text-3xl font-bold md:text-4xl">
                {data.template.name}
              </h1>
              <p className="mt-3 max-w-2xl text-neutral-300">
                {data.template.description}
              </p>
            </div>

            <div className="p-7 md:p-10">
              <div className="grid gap-4 rounded-2xl bg-neutral-50 p-5 md:grid-cols-2">
                <Info label="Participante" value={`${data.person.first_name.trim()} ${data.person.last_name ?? ""}`.trim()} />
                <Info label="Puesto" value={data.person.job_title ?? "No especificado"} />
                <Info label="Área" value={data.person.area ?? "No especificada"} />
                <Info label="Reactivos calificables" value={String(scaleQuestions.length)} />
              </div>

              <div className="mt-8">
                <h2 className="text-xl font-bold text-neutral-900">
                  Antes de comenzar
                </h2>
                <p className="mt-2 text-neutral-600">
                  Responde con la opción que mejor describa tu comportamiento
                  habitual. No busques la respuesta ideal; buscamos una lectura
                  útil y honesta para tu desarrollo.
                </p>
              </div>

              <div className="mt-6 grid gap-2">
                {scaleLabels.map((label, index) => (
                  <div
                    key={label}
                    className="flex gap-3 rounded-xl border border-neutral-200 px-4 py-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm text-neutral-700">{label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStarted(true)}
                className="mt-8 w-full rounded-xl bg-orange-500 px-6 py-4 font-bold text-white transition hover:bg-orange-600"
              >
                Iniciar evaluación
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const finalQuestions = data.questions.filter(
    (question) => question.dimension_id === null,
  );

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-7 md:px-6 md:py-10">
      <div className="mx-auto max-w-5xl">
        <BrandHeader />

        <section className="sticky top-3 z-20 mt-6 rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-neutral-900">
                {data.template.name}
              </div>
              <div className="text-xs text-neutral-500">
                {data.person.first_name.trim()} · {data.organization.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-neutral-900">
                {answeredScale}/{scaleQuestions.length}
              </div>
              <div className="text-xs text-neutral-500">{progress}% completado</div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {message && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {message}
          </div>
        )}

        <div className="mt-6 space-y-6">
          {data.dimensions.map((dimension) => {
            const questions = data.questions.filter(
              (question) => question.dimension_id === dimension.id,
            );

            return (
              <section
                key={dimension.id}
                className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-8"
              >
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 font-bold text-white">
                    {dimension.sort_order}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">
                      {dimension.name}
                    </h2>
                    {dimension.description && (
                      <p className="mt-1 text-sm text-neutral-500">
                        {dimension.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-5">
                  {questions.map((question) => {
                    const response = responses[question.id] ?? {
                      numeric_value: null,
                      text_value: "",
                      is_not_observed: false,
                    };

                    if (question.question_type === "text") {
                      return (
                        <div
                          key={question.id}
                          className="rounded-2xl bg-neutral-50 p-5"
                        >
                          <label
                            htmlFor={question.id}
                            className="font-medium text-neutral-900"
                          >
                            {question.prompt}
                          </label>
                          <textarea
                            id={question.id}
                            rows={4}
                            value={response.text_value}
                            onChange={(event) =>
                              setResponses((current) => ({
                                ...current,
                                [question.id]: {
                                  ...response,
                                  text_value: event.target.value,
                                },
                              }))
                            }
                            onBlur={() =>
                              void saveAnswer(question, {
                                ...response,
                                text_value:
                                  responses[question.id]?.text_value ?? "",
                              })
                            }
                            placeholder="Escribe tu reflexión..."
                            className="mt-3 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                          />
                          {savingQuestion === question.id && (
                            <div className="mt-2 text-xs text-neutral-400">
                              Guardando...
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={question.id}
                        className="border-b border-neutral-100 pb-5 last:border-0 last:pb-0"
                      >
                        <p className="font-medium leading-relaxed text-neutral-900">
                          {question.prompt}
                        </p>
                        <div className="mt-3 grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map((value) => {
                            const selected = response.numeric_value === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                title={scaleLabels[value - 1]}
                                onClick={() =>
                                  void saveAnswer(question, {
                                    numeric_value: value,
                                    text_value: "",
                                    is_not_observed: false,
                                  })
                                }
                                className={
                                  selected
                                    ? "rounded-xl border border-orange-500 bg-orange-500 px-2 py-3 font-bold text-white"
                                    : "rounded-xl border border-neutral-300 bg-white px-2 py-3 font-bold text-neutral-700 transition hover:border-orange-400 hover:bg-orange-50"
                                }
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-2 text-right text-xs text-neutral-400">
                          {savingQuestion === question.id ? "Guardando..." : " "}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {finalQuestions.length > 0 && (
            <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-8">
              <div className="mb-6">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Cierre
                </div>
                <h2 className="mt-2 text-2xl font-bold text-neutral-900">
                  Reflexión final
                </h2>
                <p className="mt-2 text-neutral-600">
                  Estas respuestas no afectan tu puntuación. Nos ayudan a construir
                  un plan de desarrollo más útil.
                </p>
              </div>

              <div className="space-y-5">
                {finalQuestions.map((question) => {
                  const response = responses[question.id] ?? {
                    numeric_value: null,
                    text_value: "",
                    is_not_observed: false,
                  };

                  return (
                    <div key={question.id}>
                      <label
                        htmlFor={question.id}
                        className="font-medium text-neutral-900"
                      >
                        {question.prompt}
                      </label>
                      <textarea
                        id={question.id}
                        rows={4}
                        value={response.text_value}
                        onChange={(event) =>
                          setResponses((current) => ({
                            ...current,
                            [question.id]: {
                              ...response,
                              text_value: event.target.value,
                            },
                          }))
                        }
                        onBlur={() =>
                          void saveAnswer(question, {
                            ...response,
                            text_value:
                              responses[question.id]?.text_value ?? "",
                          })
                        }
                        placeholder="Escribe tu respuesta..."
                        className="mt-3 w-full rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <section className="mt-6 rounded-3xl bg-neutral-900 p-6 text-white md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Finalizar evaluación</h2>
              <p className="mt-1 text-sm text-neutral-300">
                Debes responder los {scaleQuestions.length} reactivos calificables.
              </p>
            </div>
            <button
              type="button"
              disabled={finishing || answeredScale < scaleQuestions.length}
              onClick={() => void completeAssessment()}
              className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {finishing ? "Finalizando..." : "Enviar evaluación"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandHeader() {
  return (
    <header className="flex items-center justify-between">
      <div>
        <div className="text-2xl font-black tracking-tight text-neutral-900">
          Factor<span className="text-orange-500">RH</span>
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Evaluaciones
        </div>
      </div>
      <div className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-500 shadow-sm">
        Plataforma de Desarrollo
      </div>
    </header>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-1 font-semibold text-neutral-900">{value}</div>
    </div>
  );
}
