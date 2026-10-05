import AssessmentClient from "./assessment-client";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function EvaluationPage({ params }: PageProps) {
  const { token } = await params;

  return <AssessmentClient token={token} />;
}
