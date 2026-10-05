import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ token: string }>;
};

type SaveBody = {
  action?: string;
  question_id?: string;
  numeric_value?: number | string | null;
  text_value?: string | null;
  evidence_text?: string | null;
  is_not_observed?: boolean;
};

function errorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const db = createAdminClient();

  const { data: assignment, error: assignmentError } = await db
    .from("assessment_assignments")
    .select(
      "id,status,relationship_type,evaluator_name,due_date,started_at,completed_at,process_id,template_id",
    )
    .eq("public_token", token)
    .neq("status", "cancelled")
    .maybeSingle();

  if (assignmentError) return errorResponse(assignmentError.message, 500);
  if (!assignment) return errorResponse("Evaluación no encontrada.", 404);

  const [processResult, templateResult, dimensionsResult, questionsResult, responsesResult] =
    await Promise.all([
      db
        .from("assessment_processes")
        .select("id,name,person_id,organization_id,public_token")
        .eq("id", assignment.process_id)
        .single(),
      db
        .from("assessment_templates")
        .select("id,name,description,version,organization_id")
        .eq("id", assignment.template_id)
        .single(),
      db
        .from("assessment_dimensions")
        .select("id,name,description,sort_order,weight")
        .eq("template_id", assignment.template_id)
        .order("sort_order"),
      db
        .from("assessment_questions")
        .select(
          "id,dimension_id,prompt,question_type,sort_order,required,allow_evidence,min_value,max_value,allow_not_observed",
        )
        .eq("template_id", assignment.template_id)
        .order("sort_order"),
      db
        .from("assessment_responses")
        .select(
          "question_id,numeric_value,text_value,evidence_text,is_not_observed,answered_at",
        )
        .eq("assignment_id", assignment.id),
    ]);

  const firstError =
    processResult.error ||
    templateResult.error ||
    dimensionsResult.error ||
    questionsResult.error ||
    responsesResult.error;

  if (firstError) return errorResponse(firstError.message, 500);

  const processData = processResult.data;

  const [personResult, organizationResult] = await Promise.all([
    db
      .from("people")
      .select("first_name,last_name,job_title,area")
      .eq("id", processData.person_id)
      .single(),
    db
      .from("organizations")
      .select("name")
      .eq("id", processData.organization_id)
      .single(),
  ]);

  if (personResult.error) return errorResponse(personResult.error.message, 500);
  if (organizationResult.error) {
    return errorResponse(organizationResult.error.message, 500);
  }

  let sourceOrganizationName: string | null = null;
  if (templateResult.data.organization_id) {
    const { data: sourceOrganization } = await db
      .from("organizations")
      .select("name")
      .eq("id", templateResult.data.organization_id)
      .maybeSingle();

    sourceOrganizationName = sourceOrganization?.name ?? null;
  }

  const targetOrganizationName = organizationResult.data.name;
  const adaptText = (value: string | null) => {
    if (
      !value ||
      !sourceOrganizationName ||
      sourceOrganizationName === targetOrganizationName
    ) {
      return value;
    }

    return value.split(sourceOrganizationName).join(targetOrganizationName);
  };

  return NextResponse.json({
    assignment,
    process: {
      name: processData.name,
      public_token: processData.public_token,
    },
    person: personResult.data,
    organization: organizationResult.data,
    template: {
      id: templateResult.data.id,
      name: templateResult.data.name,
      description: adaptText(templateResult.data.description),
      version: templateResult.data.version,
    },
    dimensions: (dimensionsResult.data ?? []).map((dimension) => ({
      ...dimension,
      description: adaptText(dimension.description),
    })),
    questions: (questionsResult.data ?? []).map((question) => ({
      ...question,
      prompt: adaptText(question.prompt) ?? question.prompt,
    })),
    responses: responsesResult.data ?? [],
    results: [],
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const body = (await request.json()) as SaveBody;
  const db = createAdminClient();

  const { data: assignment, error: assignmentError } = await db
    .from("assessment_assignments")
    .select("id,status,started_at,template_id,process_id")
    .eq("public_token", token)
    .maybeSingle();

  if (assignmentError) return errorResponse(assignmentError.message, 500);
  if (!assignment) return errorResponse("Evaluación no encontrada.", 404);

  if (body.action === "save") {
    if (!["pending", "in_progress"].includes(assignment.status)) {
      return errorResponse("La evaluación ya no admite cambios.", 409);
    }

    if (!body.question_id) {
      return errorResponse("Falta la pregunta.", 400);
    }

    const { data: question, error: questionError } = await db
      .from("assessment_questions")
      .select(
        "id,question_type,required,allow_evidence,min_value,max_value,allow_not_observed",
      )
      .eq("id", body.question_id)
      .eq("template_id", assignment.template_id)
      .maybeSingle();

    if (questionError) return errorResponse(questionError.message, 500);
    if (!question) return errorResponse("La pregunta no pertenece a esta evaluación.", 400);

    const isNotObserved = body.is_not_observed === true;
    const textValue =
      typeof body.text_value === "string" ? body.text_value.trim() : "";
    const evidenceText =
      typeof body.evidence_text === "string" ? body.evidence_text.trim() : "";

    let numericValue: number | null = null;

    if (question.question_type === "scale") {
      if (isNotObserved) {
        if (!question.allow_not_observed) {
          return errorResponse("Esta pregunta no permite 'No observado'.", 400);
        }
      } else {
        numericValue = Number(body.numeric_value);
        if (!Number.isFinite(numericValue)) {
          return errorResponse("Selecciona una respuesta válida.", 400);
        }

        if (
          question.min_value !== null &&
          numericValue < Number(question.min_value)
        ) {
          return errorResponse("La respuesta está debajo del mínimo permitido.", 400);
        }

        if (
          question.max_value !== null &&
          numericValue > Number(question.max_value)
        ) {
          return errorResponse("La respuesta está arriba del máximo permitido.", 400);
        }
      }
    }

    if (question.question_type === "text" && question.required && !textValue) {
      return errorResponse("Esta respuesta es obligatoria.", 400);
    }

    if (question.question_type === "text" && !textValue && !question.required) {
      const { error: deleteError } = await db
        .from("assessment_responses")
        .delete()
        .eq("assignment_id", assignment.id)
        .eq("question_id", question.id);

      if (deleteError) return errorResponse(deleteError.message, 500);

      return NextResponse.json({ ok: true, cleared: true });
    }

    const { error: saveError } = await db.from("assessment_responses").upsert(
      {
        assignment_id: assignment.id,
        question_id: question.id,
        numeric_value:
          question.question_type === "scale" && !isNotObserved
            ? numericValue
            : null,
        text_value: question.question_type === "text" ? textValue : null,
        evidence_text: question.allow_evidence ? evidenceText || null : null,
        is_not_observed: isNotObserved,
        answered_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id,question_id" },
    );

    if (saveError) return errorResponse(saveError.message, 500);

    if (assignment.status === "pending" || !assignment.started_at) {
      const { error: startError } = await db
        .from("assessment_assignments")
        .update({
          status: "in_progress",
          started_at: assignment.started_at ?? new Date().toISOString(),
        })
        .eq("id", assignment.id);

      if (startError) return errorResponse(startError.message, 500);
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "complete") {
    if (!["pending", "in_progress"].includes(assignment.status)) {
      return errorResponse("La evaluación no puede finalizarse.", 409);
    }

    const [requiredResult, responsesResult] = await Promise.all([
      db
        .from("assessment_questions")
        .select("id,question_type,allow_not_observed")
        .eq("template_id", assignment.template_id)
        .eq("required", true),
      db
        .from("assessment_responses")
        .select("question_id,numeric_value,text_value,is_not_observed")
        .eq("assignment_id", assignment.id),
    ]);

    if (requiredResult.error) return errorResponse(requiredResult.error.message, 500);
    if (responsesResult.error) {
      return errorResponse(responsesResult.error.message, 500);
    }

    const responseMap = new Map(
      (responsesResult.data ?? []).map((response) => [
        response.question_id,
        response,
      ]),
    );

    const missing = (requiredResult.data ?? []).filter((question) => {
      const response = responseMap.get(question.id);
      if (!response) return true;

      if (question.question_type === "scale") {
        return !(
          response.numeric_value !== null ||
          (response.is_not_observed && question.allow_not_observed)
        );
      }

      return !(
        typeof response.text_value === "string" &&
        response.text_value.trim().length > 0
      );
    });

    if (missing.length > 0) {
      return errorResponse(
        "Aún faltan respuestas obligatorias.",
        400,
        { missing: missing.length },
      );
    }

    const { error: calculateError } = await db.rpc(
      "calculate_assessment_results",
      { p_assignment_id: assignment.id },
    );

    if (calculateError) return errorResponse(calculateError.message, 500);

    const { error: completeError } = await db
      .from("assessment_assignments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", assignment.id);

    if (completeError) return errorResponse(completeError.message, 500);

    const { data: siblings, error: siblingsError } = await db
      .from("assessment_assignments")
      .select("status")
      .eq("process_id", assignment.process_id);

    if (!siblingsError && (siblings ?? []).length > 0) {
      const processFinished = (siblings ?? []).every((item) =>
        ["completed", "cancelled"].includes(item.status),
      );

      if (processFinished) {
        await db
          .from("assessment_processes")
          .update({ status: "completed" })
          .eq("id", assignment.process_id);
      }
    }

    return NextResponse.json({ ok: true });
  }

  return errorResponse("Acción no válida.", 400);
}
