import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AppRole =
  | "super_admin"
  | "commercial"
  | "recruiter"
  | "ese_operator"
  | "consultant"
  | "client";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

export async function getCurrentAppUser() {
  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims || typeof claims.sub !== "string") return null;

  const email = String(claims.email ?? "").trim().toLowerCase();

  if (ADMIN_EMAILS.includes(email)) {
    return {
      userId: claims.sub,
      email,
      role: "super_admin" as AppRole,
      organizationId: null as string | null,
      active: true,
      bootstrap: true,
    };
  }

  const db = createAdminClient();
  const { data: profile } = await db
    .from("app_users")
    .select("user_id,email,role,organization_id,active")
    .eq("user_id", claims.sub)
    .eq("active", true)
    .maybeSingle();

  if (!profile) return null;

  return {
    userId: profile.user_id,
    email: profile.email,
    role: profile.role as AppRole,
    organizationId: profile.organization_id as string | null,
    active: profile.active,
    bootstrap: false,
  };
}

export function canManageService(role: AppRole, serviceType: string) {
  return (
    role === "super_admin" ||
    (role === "recruiter" && serviceType === "recruitment") ||
    (role === "ese_operator" && serviceType === "ese") ||
    (role === "consultant" && serviceType === "hr_consulting")
  );
}

export function landingForRole(role: AppRole) {
  if (role === "commercial") return "/protected/comercial";
  if (["recruiter", "ese_operator", "consultant"].includes(role)) {
    return "/protected/operacion";
  }
  if (role === "client") return "/auth/login?error=client_portal_pending";
  return "/protected/dashboard";
}
