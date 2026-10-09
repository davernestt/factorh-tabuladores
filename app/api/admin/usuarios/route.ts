import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";

type Body = {
  display_name?: string;
  email?: string;
  organization_id?: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentAppUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = (await request.json()) as Body;
  const displayName = clean(body.display_name);
  const email = clean(body.email).toLowerCase();
  const organizationId = clean(body.organization_id);

  if (!displayName || !email || !organizationId) {
    return NextResponse.json(
      { error: "Captura nombre, correo y empresa." },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  const { data: organization, error: organizationError } = await db
    .from("organizations")
    .select("id,name,active")
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

  const { data: existing } = await db
    .from("app_users")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario de plataforma con ese correo." },
      { status: 409 },
    );
  }

  const origin = request.nextUrl.origin;
  const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
    type: "invite",
    email,
  });

  if (linkError || !linkData.user) {
    return NextResponse.json(
      { error: linkError?.message ?? "No fue posible crear la invitación." },
      { status: 400 },
    );
  }

  const { error: appUserError } = await db.from("app_users").insert({
    user_id: linkData.user.id,
    email,
    display_name: displayName,
    role: "client",
    organization_id: organizationId,
    active: true,
    updated_at: new Date().toISOString(),
  });

  if (appUserError) {
    await db.auth.admin.deleteUser(linkData.user.id);
    return NextResponse.json({ error: appUserError.message }, { status: 500 });
  }

  const hashedToken = linkData.properties?.hashed_token;
  const inviteUrl = hashedToken
    ? `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=invite&next=${encodeURIComponent("/auth/update-password")}`
    : linkData.properties?.action_link ?? null;

  return NextResponse.json({
    ok: true,
    user_id: linkData.user.id,
    organization_name: organization.name,
    invite_url: inviteUrl,
  });
}
