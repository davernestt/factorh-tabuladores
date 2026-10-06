import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

type AppRole =
  | "super_admin"
  | "commercial"
  | "recruiter"
  | "ese_operator"
  | "consultant"
  | "client";

function roleCanAccess(pathname: string, role: AppRole) {
  if (role === "super_admin") return true;
  if (role === "client") return false;

  if (pathname.startsWith("/protected/comercial")) {
    return role === "commercial";
  }

  if (
    pathname.startsWith("/protected/evaluaciones") ||
    pathname.startsWith("/protected/nueva-evaluacion") ||
    pathname.startsWith("/protected/candidatos") ||
    pathname.startsWith("/protected/catalogo") ||
    pathname.startsWith("/protected/empresas") ||
    pathname.startsWith("/protected/baterias")
  ) {
    return role === "recruiter" || role === "consultant";
  }

  if (pathname.startsWith("/protected/operacion/reclutamiento")) {
    return role === "recruiter";
  }

  if (pathname.startsWith("/protected/operacion/ese")) {
    return role === "ese_operator";
  }

  if (pathname.startsWith("/protected/operacion/consultoria")) {
    return role === "consultant";
  }

  if (pathname === "/protected/operacion") {
    return ["recruiter", "ese_operator", "consultant"].includes(role);
  }

  if (/^\/protected\/operacion\/[^/]+$/.test(pathname)) {
    return ["recruiter", "ese_operator", "consultant"].includes(role);
  }

  if (pathname === "/protected" || pathname === "/protected/dashboard") {
    return false;
  }

  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const isPublicAssessment =
    pathname.startsWith("/e/") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/api/evaluacion/");

  if (isPublicAssessment) {
    return supabaseResponse;
  }

  if (!hasEnvVars) {
    return supabaseResponse;
  }

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
  const email = String(user?.email ?? "").trim().toLowerCase();

  if (pathname.startsWith("/protected")) {
    if (!user || typeof user.sub !== "string") {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    let role: AppRole | null = ADMIN_EMAILS.includes(email)
      ? "super_admin"
      : null;

    if (!role) {
      const { data: profile } = await supabase
        .from("app_users")
        .select("role,active")
        .eq("user_id", user.sub)
        .eq("active", true)
        .maybeSingle();

      role = (profile?.role as AppRole | undefined) ?? null;
    }

    if (!role || !roleCanAccess(pathname, role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set(
        "error",
        role === "client" ? "client_portal_pending" : "unauthorized",
      );
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
