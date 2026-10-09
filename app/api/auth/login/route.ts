import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(
      new URL("/auth/login?error=invalid_credentials", request.url),
      { status: 303 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    const code =
      error?.code === "invalid_credentials"
        ? "invalid_credentials"
        : "login_failed";
    return NextResponse.redirect(
      new URL(`/auth/login?error=${code}`, request.url),
      { status: 303 },
    );
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("role,organization_id,active")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (appUserError || !appUser || !appUser.active) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/auth/login?error=unauthorized", request.url),
      { status: 303 },
    );
  }

  if (appUser.role === "client") {
    if (!appUser.organization_id) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/auth/login?error=unauthorized", request.url),
        { status: 303 },
      );
    }
    return NextResponse.redirect(
      new URL("/protected/psicometrias", request.url),
      { status: 303 },
    );
  }

  if (appUser.role === "super_admin") {
    return NextResponse.redirect(
      new URL("/protected/evaluaciones", request.url),
      { status: 303 },
    );
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(
    new URL("/auth/login?error=unauthorized", request.url),
    { status: 303 },
  );
}
