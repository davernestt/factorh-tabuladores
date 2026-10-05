import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

type Body = {
  template_id?: string;
  enabled?: boolean;
  participant_sendable?: boolean;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();
  const email = String(authData?.claims?.email ?? "").trim().toLowerCase();

  if (authError || !authData?.claims || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id: organizationId } = await context.params;
  const body = (await request.json()) as Body;
  const templateId = String(body.template_id ?? "").trim();
  const enabled = body.enabled === true;
  const participantSendable = enabled && body.participant_sendable === true;

  if (!templateId) {
    return NextResponse.json({ error: "Falta la prueba." }, { status: 400 });
  }

  const db = createAdminClient();

  const [organizationResult, templateResult] = await Promise.all([
    db
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .eq("active", true)
      .maybeSingle(),
    db
      .from("assessment_templates")
      .select("id,name")
      .eq("id", templateId)
      .eq("active", true)
      .maybeSingle(),
  ]);

  if (organizationResult.error || templateResult.error) {
    return NextResponse.json(
      {
        error:
          organizationResult.error?.message ??
          templateResult.error?.message ??
          "No fue posible validar.",
      },
      { status: 500 },
    );
  }

  if (!organizationResult.data || !templateResult.data) {
    return NextResponse.json(
      { error: "Empresa o prueba no disponible." },
      { status: 404 },
    );
  }

  const { data: sameNameTemplates, error: sameNameError } = await db
    .from("assessment_templates")
    .select("id")
    .eq("name", templateResult.data.name);

  if (sameNameError) {
    return NextResponse.json({ error: sameNameError.message }, { status: 500 });
  }

  const sameIds = (sameNameTemplates ?? []).map((item) => item.id);

  if (sameIds.length > 0) {
    const { error: cleanupError } = await db
      .from("organization_assessment_templates")
      .delete()
      .eq("organization_id", organizationId)
      .in("template_id", sameIds)
      .neq("template_id", templateId);

    if (cleanupError) {
      return NextResponse.json({ error: cleanupError.message }, { status: 500 });
    }
  }

  const { error: upsertError } = await db
    .from("organization_assessment_templates")
    .upsert(
      {
        organization_id: organizationId,
        template_id: templateId,
        enabled,
        participant_sendable: participantSendable,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,template_id" },
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    enabled,
    participant_sendable: participantSendable,
  });
}
