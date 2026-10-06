import { Suspense } from 'react';
import Participant360 from './participant-360';

type PageProps = { params: Promise<{ token: string }> };

export default function AnonymousFeedbackPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-100 flex items-center justify-center p-6">
          <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
            <p className="text-neutral-600">Cargando evaluación 360°...</p>
          </div>
        </main>
      }
    >
      <Feedback360Content {...props} />
    </Suspense>
  );
}

async function Feedback360Content({ params }: PageProps) {
  const { token } = await params;
  return <Participant360 token={token} />;
}
