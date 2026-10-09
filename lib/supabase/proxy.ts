import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const isPublicAssessment =
    pathname.startsWith("/e/") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/360/") ||
    pathname.startsWith("/api/evaluacion/") ||
    pathname.startsWith("/api/360/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/cliente/");

  if (isPublicAssessment) return supabaseResponse;
  if (!hasEnvVars) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (pathname.startsWith("/protected")) {
    if (!user?.sub) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    const { data: appUser } = await supabase
      .from("app_users")
      .select("role,organization_id,active")
      .eq("user_id", String(user.sub))
      .maybeSingle();

    if (!appUser?.active) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }

    if (appUser.role === "client") {
      if (!appUser.organization_id) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        url.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(url);
      }

      if (pathname === "/protected") {
        const url = request.nextUrl.clone();
        url.pathname = "/protected/psicometrias";
        return NextResponse.redirect(url);
      }

      if (!pathname.startsWith("/protected/psicometrias")) {
        const url = request.nextUrl.clone();
        url.pathname = "/protected/psicometrias";
        return NextResponse.redirect(url);
      }
    } else if (appUser.role !== "super_admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
  }

  if (
    pathname !== "/" &&
    !user &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/protected")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
