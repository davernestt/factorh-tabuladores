import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

type Body = {
  organization_id?: string;
  name?: string;
  description?: string;
  template_ids?: string[];
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();
  const email = String(authData?.claims?.email ?? "").trim().toLowerCase();

  if (authError || !authData?.claims || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = (await request.json()) as Body;
  const organizationId = clean(body.organization_id);
  const name = clean(body.name);
  const description = clean(body.description) || null;
  const templateIds = Array.from(
    new Set(
      Array.isArray(body.template_ids)
        ? body.template_ids.map(clean).filter(Boolean)
        : [],
    ),
  );

  if (!organizationId || !name || templateIds.length === 0) {
    return NextResponse.json(
      { error: "Selecciona empresa, nombre y al menos una prueba." },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  const [organizationResult, accessResult] = await Promise.all([
    db
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .eq("active", true)
      .maybeSingle(),
    db
      .from("organization_assessment_templates")
      .select("template_id,enabled,participant_sendable")
      .eq("organization_id", organizationId)
      .in("template_id", templateIds),
  ]);

  if (organizationResult.error || accessResult.error) {
    return NextResponse.json(
      {
        error:
          organizationResult.error?.message ??
          accessResult.error?.message ??
          "No fue posible validar.",
      },
      { status: 500 },
    );
  }

  if (!organizationResult.data) {
    return NextResponse.json(
      { error: "La empresa no está disponible." },
      { status: 404 },
    );
  }

  const allowed = new Set(
    (accessResult.data ?? [])
      .filter((item) => item.enabled && item.participant_sendable)
      .map((item) => item.template_id),
  );

  if (templateIds.some((id) => !allowed.has(id))) {
    return NextResponse.json(
      {
        error:
          "La batería contiene una prueba que no está habilitada para participantes de esta empresa.",
      },
      { status: 400 },
    );
  }

  const { data: battery, error: batteryError } = await db
    .from("assessment_batteries")
    .insert({
      organization_id: organizationId,
      name,
      description,
      active: true,
    })
    .select("id")
    .single();

  if (batteryError) {
    return NextResponse.json({ error: batteryError.message }, { status: 500 });
  }

  const { error: itemsError } = await db
    .from("assessment_battery_items")
    .insert(
      templateIds.map((templateId, index) => ({
        battery_id: battery.id,
        template_id: templateId,
        sort_order: index + 1,
        required: true,
      })),
    );

  if (itemsError) {
    await db.from("assessment_batteries").delete().eq("id", battery.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: battery.id });
}
