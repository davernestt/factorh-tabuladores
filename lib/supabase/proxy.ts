import {isPublic360Path,isAllowedClientPath,isAllowedStaffPath} from "@/lib/feedback360-route-policy";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // Only valid token-shaped 360 pages and submission APIs are anonymous.
  const isPublicAssessment =
    pathname.startsWith("/e/") ||
    pathname.startsWith("/p/") ||
    isPublic360Path(pathname) ||
    pathname.startsWith("/c3/") ||
    pathname.startsWith("/api/c3/submit") ||
    pathname.startsWith("/api/evaluacion/") ||
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

      // Page and API handlers must still enforce subscription and tenant boundaries.
      if (pathname === "/protected" || !isAllowedClientPath(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/protected/catalogo";
        return NextResponse.redirect(url);
      }
    } else if (appUser.role !== "super_admin") {
      // Staff must not inherit administrator permissions merely by signing in.
      if (pathname === "/protected" || !isAllowedStaffPath(pathname, appUser.role)) {
        const url = request.nextUrl.clone();
        url.pathname = "/protected/mi-acceso";
        return NextResponse.redirect(url);
      }
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
