import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";

type RouteContext = { params: Promise<{ id: string }> };
type Body = {
  module_key?: string;
  status?: "requested" | "trial" | "active" | "paused" | "expired" | "cancelled";
  plan_name?: string;
  starts_on?: string;
  ends_on?: string;
  requested_on?: string;
  requested_notes?: string;
  reminder_days?: number;
  client_notice?: boolean;
};

function dateOrNull(value: unknown) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentAppUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Body;
  const moduleKey = String(body.module_key ?? "").trim();
  const allowedStatuses = [
    "requested",
    "trial",
    "active",
    "paused",
    "expired",
    "cancelled",
  ];
  const status = allowedStatuses.includes(String(body.status))
    ? (body.status as Body["status"])
    : "requested";

  if (!moduleKey) {
    return NextResponse.json({ error: "Selecciona un módulo." }, { status: 400 });
  }

  const db = createAdminClient();
  const [{ data: organization }, { data: module, error: moduleError }] =
    await Promise.all([
      db.from("organizations").select("id").eq("id", id).maybeSingle(),
      db
        .from("platform_modules")
        .select("module_key,name,client_available")
        .eq("module_key", moduleKey)
        .eq("active", true)
        .maybeSingle(),
    ]);

  if (!organization) {
    return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  }
  if (moduleError) {
    return NextResponse.json({ error: moduleError.message }, { status: 500 });
  }
  if (!module) {
    return NextResponse.json({ error: "Módulo no encontrado." }, { status: 404 });
  }

  if (
    ["trial", "active"].includes(String(status)) &&
    !module.client_available
  ) {
    return NextResponse.json(
      {
        error:
          module.name +
          " todavía no está habilitado como módulo autónomo en el portal de empresa. Puedes registrarlo como Solicitado para darle seguimiento comercial.",
      },
      { status: 400 },
    );
  }

  const reminderDays = Math.max(
    1,
    Math.min(120, Number(body.reminder_days ?? 30) || 30),
  );

  const payload = {
    organization_id: id,
    module_key: moduleKey,
    status,
    plan_name: String(body.plan_name ?? "").trim() || null,
    starts_on: dateOrNull(body.starts_on),
    ends_on: dateOrNull(body.ends_on),
    requested_on: dateOrNull(body.requested_on),
    requested_notes: String(body.requested_notes ?? "").trim() || null,
    reminder_days: reminderDays,
    client_notice: body.client_notice !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("organization_module_subscriptions")
    .upsert(payload, { onConflict: "organization_id,module_key" })
    .select(
      "id,organization_id,module_key,status,plan_name,starts_on,ends_on,requested_on,requested_notes,reminder_days,client_notice",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await db.rpc("refresh_module_expiry_reminders");

  return NextResponse.json({ ok: true, subscription: data });
}
