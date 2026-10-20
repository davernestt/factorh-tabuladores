import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = clean(formData.get("client_portal_email")).toLowerCase();
  const password = String(formData.get("client_portal_password") ?? "");
  const slug = clean(formData.get("organization_slug"));

  const portal = new URL("/cliente/" + encodeURIComponent(slug), request.url);

  if (!email || !password || !slug) {
    portal.searchParams.set("error", "invalid_credentials");
    return NextResponse.redirect(portal, { status: 303 });
  }

  const db = createAdminClient();
  const { data: organization, error: organizationError } = await db
    .from("organizations")
    .select("id,active")
    .eq("slug", slug)
    .maybeSingle();

  if (organizationError || !organization || !organization.active) {
    portal.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(portal, { status: 303 });
  }

  const { data: appUser, error: appUserError } = await db
    .from("app_users")
    .select("user_id,email,role,organization_id,active")
    .eq("email", email)
    .maybeSingle();

  if (
    appUserError ||
    !appUser ||
    appUser.role !== "client" ||
    !appUser.active
  ) {
    portal.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(portal, { status: 303 });
  }

  if (appUser.organization_id !== organization.id) {
    portal.searchParams.set("error", "wrong_company");
    return NextResponse.redirect(portal, { status: 303 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || data.user.id !== appUser.user_id) {
    if (data.user) await supabase.auth.signOut();
    portal.searchParams.set("error", "invalid_credentials");
    return NextResponse.redirect(portal, { status: 303 });
  }

  return NextResponse.redirect(
    new URL("/protected/psicometrias", request.url),
    { status: 303 },
  );
}
