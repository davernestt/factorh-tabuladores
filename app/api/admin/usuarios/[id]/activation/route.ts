import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentAppUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const db = createAdminClient();

  const { data: appUser, error: userError } = await db
    .from("app_users")
    .select("user_id,email,organization_id,active")
    .eq("user_id", id)
    .eq("role", "client")
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }
  if (!appUser || !appUser.active || !appUser.organization_id) {
    return NextResponse.json(
      { error: "El usuario de empresa no está disponible." },
      { status: 404 },
    );
  }

  const { data: organization, error: organizationError } = await db
    .from("organizations")
    .select("slug,name,active")
    .eq("id", appUser.organization_id)
    .maybeSingle();

  if (organizationError) {
    return NextResponse.json(
      { error: organizationError.message },
      { status: 500 },
    );
  }
  if (!organization || !organization.active) {
    return NextResponse.json(
      { error: "La empresa no está activa." },
      { status: 400 },
    );
  }

  const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
    type: "recovery",
    email: appUser.email,
  });

  if (linkError || !linkData.user || !linkData.properties?.hashed_token) {
    return NextResponse.json(
      { error: linkError?.message ?? "No fue posible generar la liga." },
      { status: 400 },
    );
  }

  const returnTo = "/cliente/" + organization.slug;
  const next =
    "/auth/update-password?return_to=" + encodeURIComponent(returnTo);
  const origin = request.nextUrl.origin;
  const activationUrl =
    origin +
    "/auth/confirm?token_hash=" +
    encodeURIComponent(linkData.properties.hashed_token) +
    "&type=recovery&next=" +
    encodeURIComponent(next);

  return NextResponse.json({
    ok: true,
    activation_url: activationUrl,
    portal_url: origin + returnTo,
    organization_name: organization.name,
    email: appUser.email,
  });
}
