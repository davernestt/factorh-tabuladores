import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ token: string }>;
};

type AnswerInput={
 question_id?:string;numeric_value?:number|string|null;text_value?:string|null;
 evidence_text?:string|null;is_not_observed?:boolean;
};
type SaveBody=AnswerInput&{action?:string;answers?:AnswerInput[]};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const db = createAdminClient();

  const { data: assignment, error: assignmentError } = await db
    .from("assessment_assignments")
    .select(
      "id,status,relationship_type,evaluator_name,evaluator_email,evaluator_phone,due_date,started_at,completed_at,process_id,template_id",
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
        .select("id,name,description,version,organization_id,assessment_type")
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
          "id,dimension_id,prompt,question_type,sort_order,required,allow_evidence,min_value,max_value,allow_not_observed,options",
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
      assessment_type: templateResult.data.assessment_type,
    },
    dimensions: (dimensionsResult.data ?? []).map((dimension) => ({
      ...dimension,
      description: adaptText(dimension.description),
    })),
    questions: (questionsResult.data ?? [])
      .filter((question)=>templateResult.data.assessment_type!=="leadership_cases"||question.question_type==="text")
      .map((question) => ({
        ...question,
        prompt: adaptText(question.prompt) ?? question.prompt,
      })),
    responses: templateResult.data.assessment_type==="leadership_cases"
      ? (responsesResult.data ?? []).filter(row=>(questionsResult.data??[]).some(q=>q.id===row.question_id&&q.question_type==="text"))
      : responsesResult.data ?? [],
    results: [],
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  if(!UUID.test(token))return errorResponse("Liga de evaluación inválida.",400);
  const origin=request.headers.get("origin");
  if(origin&&origin!==request.nextUrl.origin)return errorResponse("Origen no autorizado.",403);
  if(Number(request.headers.get("content-length")||"0")>180000)
    return errorResponse("La solicitud excede el tamaño permitido.",413);
  let body:SaveBody;
  try{body=await request.json() as SaveBody;}catch{return errorResponse("No pudimos leer las respuestas. Intenta nuevamente.",400);}
  const db = createAdminClient();

  const { data: assignment, error: assignmentError } = await db
    .from("assessment_assignments")
    .select("id,status,started_at,template_id,process_id")
    .eq("public_token", token)
    .maybeSingle();

  if (assignmentError) return errorResponse(assignmentError.message, 500);
  if (!assignment) return errorResponse("Evaluación no encontrada.", 404);
  const {data:assignmentTemplate,error:templateError}=await db.from("assessment_templates")
    .select("assessment_type").eq("id",assignment.template_id).single();
  if(templateError||!assignmentTemplate)return errorResponse("No se pudo validar el instrumento.",500);
  const isLeadershipCases=assignmentTemplate.assessment_type==="leadership_cases";

  // Enviar las respuestas de la evaluación en una sola operación permite
  // recuperar selecciones realizadas cuando falló el guardado individual.
  // No crea asignaciones, no consume créditos y nunca altera pruebas cerradas.
  if(body.action==="sync"){
    if(!["pending","in_progress"].includes(assignment.status))
      return errorResponse("Esta evaluación ya terminó y sus respuestas están protegidas.",409);
    const answers=body.answers;
    if(!Array.isArray(answers)||answers.length<1||answers.length>200)
      return errorResponse("Se requieren entre 1 y 200 respuestas para sincronizar.",400);
    const ids=answers.map(a=>a?.question_id);
    if(ids.some(id=>typeof id!=="string"||!UUID.test(id))||new Set(ids).size!==ids.length)
      return errorResponse("Las preguntas enviadas no son válidas.",400);
    const {data:questions,error:questionsError}=await db.from("assessment_questions")
      .select("id,question_type,required,allow_evidence,allow_not_observed,min_value,max_value,options")
      .eq("template_id",assignment.template_id).in("id",ids as string[]);
    if(questionsError)return errorResponse("No se pudo verificar la lista de preguntas.",500);
    const byId=new Map((questions??[]).map(q=>[q.id,q]));
    if(byId.size!==ids.length)return errorResponse("Algunas preguntas no pertenecen a esta evaluación.",400);
    const records=[];
    for(const answer of answers){
      const question=byId.get(answer.question_id!);
      if(!question)return errorResponse("Pregunta no reconocida.",400);
      if(isLeadershipCases&&question.question_type!=="text")
        return errorResponse("Las rúbricas profesionales no pueden contestarse desde esta liga.",403);
      if(answer.is_not_observed===true&&!question.allow_not_observed)
        return errorResponse("Esta pregunta no admite 'No observado'.",400);
      const notObserved=answer.is_not_observed===true;
      const textValue=typeof answer.text_value==="string"?answer.text_value.trim():"";
      if(textValue.length>12000)return errorResponse("Una respuesta de texto es demasiado extensa.",413);
      const evidenceValue=typeof answer.evidence_text==="string"?answer.evidence_text.trim():"";
      if(evidenceValue.length>12000)return errorResponse("Una evidencia es demasiado extensa.",413);
      let numeric:number|null=null;
      if(question.question_type==="choice"&&!notObserved){
        numeric=Number(answer.numeric_value);
        const optionCount=Array.isArray(question.options)?question.options.length:0;
        if(!Number.isInteger(numeric)||numeric<1||numeric>optionCount)
          return errorResponse("Una opción seleccionada no es válida.",400);
      }else if(question.question_type==="scale"&&!notObserved){
        numeric=Number(answer.numeric_value);
        if(answer.numeric_value===null||answer.numeric_value===undefined||!Number.isFinite(numeric)||
           question.min_value!==null&&numeric<Number(question.min_value)||
           question.max_value!==null&&numeric>Number(question.max_value))
          return errorResponse("Una puntuación está fuera del rango permitido.",400);
      }else if(question.question_type==="text"){
        if(question.required&&!textValue)return errorResponse("Falta una respuesta de texto obligatoria.",400);
        if(!textValue)continue; // No borrar respuestas opcionales ya guardadas.
      }else if(!notObserved)return errorResponse("Tipo de respuesta no reconocido.",400);
      records.push({
        assignment_id:assignment.id,question_id:question.id,
        numeric_value:numeric,text_value:question.question_type==="text"?textValue:null,
        evidence_text:question.allow_evidence?evidenceValue||null:null,
        is_not_observed:notObserved,answered_at:new Date().toISOString()
      });
    }
    if(!records.length)return errorResponse("No hay respuestas válidas para guardar.",400);
    const {error:saveError}=await db.from("assessment_responses").upsert(records,{
      onConflict:"assignment_id,question_id"
    });
    if(saveError)return errorResponse("No pudimos confirmar el guardado. Tus respuestas siguen en pantalla; vuelve a intentar.",503);
    if(assignment.status==="pending"||!assignment.started_at){
      const {error:startError}=await db.from("assessment_assignments").update({
        status:"in_progress",started_at:assignment.started_at??new Date().toISOString()
      }).eq("id",assignment.id).in("status",["pending","in_progress"]);
      if(startError)return errorResponse("Se guardaron las respuestas, pero no se actualizó el estado. Intenta continuar.",503);
    }
    return NextResponse.json({ok:true,savedQuestionIds:records.map(r=>r.question_id),count:records.length});
  }

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
        "id,question_type,required,allow_evidence,min_value,max_value,allow_not_observed,options",
      )
      .eq("id", body.question_id)
      .eq("template_id", assignment.template_id)
      .maybeSingle();

    if (questionError) return errorResponse(questionError.message, 500);
    if (!question) return errorResponse("La pregunta no pertenece a esta evaluación.", 400);
    if(isLeadershipCases&&question.question_type!=="text")
      return errorResponse("La rúbrica de estos casos sólo puede ser calificada por FactoRH.",403);

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

    if (question.question_type === "choice") {
      numericValue = Number(body.numeric_value);
      const optionCount = Array.isArray(question.options)
        ? question.options.length
        : 0;

      if (
        !Number.isInteger(numericValue) ||
        numericValue < 1 ||
        numericValue > optionCount
      ) {
        return errorResponse("Selecciona una opción válida.", 400);
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

    const { data: savedRow, error: saveError } = await db.from("assessment_responses").upsert(
      {
        assignment_id: assignment.id,
        question_id: question.id,
        numeric_value:
          ["scale", "choice"].includes(question.question_type) && !isNotObserved
            ? numericValue
            : null,
        text_value: question.question_type === "text" ? textValue : null,
        evidence_text: question.allow_evidence ? evidenceText || null : null,
        is_not_observed: isNotObserved,
        answered_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id,question_id" },
    ).select("question_id,numeric_value,text_value,is_not_observed").single();

    if (saveError || !savedRow)
      return errorResponse("La respuesta todavía no fue confirmada por el servidor. Intenta de nuevo.", 503);
    const expectedNumeric = ["scale", "choice"].includes(question.question_type) && !isNotObserved
      ? numericValue : null;
    const numericMatched = expectedNumeric === null
      ? savedRow.numeric_value === null
      : savedRow.numeric_value !== null && Number(savedRow.numeric_value) === expectedNumeric;
    if (savedRow.question_id !== question.id || !numericMatched ||
        (savedRow.text_value ?? "").trim() !== (question.question_type === "text" ? textValue : "") ||
        savedRow.is_not_observed !== isNotObserved)
      return errorResponse("La respuesta guardada no coincide con la selección. Intenta de nuevo.", 503);

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

    return NextResponse.json({ ok: true, confirmedAnswer: savedRow });
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
      if(isLeadershipCases&&question.question_type!=="text")return false;
      const response = responseMap.get(question.id);
      if (!response) return true;

      if (question.question_type === "scale") {
        return !(
          response.numeric_value !== null ||
          (response.is_not_observed && question.allow_not_observed)
        );
      }

      if (question.question_type === "choice") {
        return response.numeric_value === null;
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

    // Para los casos no existe auto-calificación: la realiza FactoRH en su
    // pantalla privada después de que el participante entrega sus respuestas.
    if(!isLeadershipCases){
      const {error:calculateError}=await db.rpc("calculate_assessment_results",
        {p_assignment_id:assignment.id});
      if(calculateError)return errorResponse(calculateError.message,500);
    }

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
