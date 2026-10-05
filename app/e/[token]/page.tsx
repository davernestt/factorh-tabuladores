import { Suspense } from "react";
import AssessmentClient from "./assessment-client";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default function EvaluationPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
          <div className="rounded-3xl bg-white border border-neutral-200 p-10 shadow-sm text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
            <p className="text-neutral-600">Cargando evaluación...</p>
          </div>
        </main>
      }
    >
      <EvaluationContent params={params} />
    </Suspense>
  );
}

async function EvaluationContent({ params }: PageProps) {
  const { token } = await params;

  return <AssessmentClient token={token} />;
}
