import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";

type RouteContext = { params: Promise<{ id: string }> };
type Body = {
  mode?: "trial" | "package";
  plan_name?: string;
  credits_total?: number;
  valid_until?: string | null;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentAppUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Body;
  const mode = body.mode === "package" ? "package" : "trial";
  const db = createAdminClient();

  const { data: organization, error: orgError } = await db
    .from("organizations")
    .select("id,name")
    .eq("id", id)
    .maybeSingle();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }
  if (!organization) {
    return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  }

  const today = new Date();
  const trialEnd = new Date(today);
  trialEnd.setDate(trialEnd.getDate() + 30);

  let creditsTotal = 2;
  let planName = "Prueba gratuita";
  let validUntil = trialEnd.toISOString().slice(0, 10);
  let trialSingle = true;

  if (mode === "package") {
    creditsTotal = Number(body.credits_total ?? 0);
    planName = String(body.plan_name ?? "").trim() || "Paquete anual";
    validUntil = String(body.valid_until ?? "").trim();
    trialSingle = false;

    if (!Number.isInteger(creditsTotal) || creditsTotal < 1 || creditsTotal > 10000) {
      return NextResponse.json(
        { error: "Indica una cantidad válida de créditos." },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) {
      return NextResponse.json(
        { error: "Indica la fecha de vigencia del paquete." },
        { status: 400 },
      );
    }
  }

  const { data, error } = await db
    .from("organization_psychometric_credits")
    .upsert(
      {
        organization_id: id,
        plan_type: mode,
        plan_name: planName,
        credits_total: creditsTotal,
        credits_used: 0,
        valid_from: today.toISOString().slice(0, 10),
        valid_until: validUntil,
        active: true,
        trial_single_test_only: trialSingle,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    )
    .select(
      "organization_id,plan_type,plan_name,credits_total,credits_used,valid_from,valid_until,active,trial_single_test_only",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: moduleError } = await db
    .from("organization_module_subscriptions")
    .upsert(
      {
        organization_id: id,
        module_key: "psychometrics",
        status: mode === "trial" ? "trial" : "active",
        plan_name: planName,
        starts_on: today.toISOString().slice(0, 10),
        ends_on: validUntil,
        requested_on: today.toISOString().slice(0, 10),
        reminder_days: 30,
        client_notice: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,module_key" },
    );

  if (moduleError) {
    return NextResponse.json(
      {
        error:
          "El plan se actualizó, pero no fue posible sincronizar la vigencia del módulo: " +
          moduleError.message,
      },
      { status: 500 },
    );
  }

  await db.rpc("refresh_module_expiry_reminders");

  return NextResponse.json({ ok: true, plan: data });
}
