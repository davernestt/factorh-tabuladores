import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";

type RouteContext = { params: Promise<{ id: string }> };
type Body = {
  display_name?: string;
  organization_id?: string;
  active?: boolean;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentAppUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Body;
  const displayName = clean(body.display_name);
  const organizationId = clean(body.organization_id);

  if (!displayName || !organizationId) {
    return NextResponse.json(
      { error: "Captura nombre y empresa." },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  const { data: organization, error: organizationError } = await db
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .eq("active", true)
    .maybeSingle();

  if (organizationError) {
    return NextResponse.json({ error: organizationError.message }, { status: 500 });
  }
  if (!organization) {
    return NextResponse.json(
      { error: "La empresa seleccionada no está disponible." },
      { status: 400 },
    );
  }

  const { data: target, error: targetError } = await db
    .from("app_users")
    .select("user_id,role")
    .eq("user_id", id)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }
  if (!target || target.role !== "client") {
    return NextResponse.json(
      { error: "Sólo puedes editar usuarios de empresa desde esta pantalla." },
      { status: 400 },
    );
  }

  const { error } = await db
    .from("app_users")
    .update({
      display_name: displayName,
      organization_id: organizationId,
      active: body.active !== false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
