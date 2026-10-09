import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AppUserRole =
  | "super_admin"
  | "commercial"
  | "recruiter"
  | "ese_operator"
  | "consultant"
  | "client";

export type CurrentAppUser = {
  userId: string;
  email: string;
  displayName: string | null;
  role: AppUserRole;
  organizationId: string | null;
  organizationName: string | null;
  active: boolean;
};

export async function getCurrentAppUser(): Promise<CurrentAppUser | null> {
  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) return null;

  const db = createAdminClient();
  const { data: appUser, error: userError } = await db
    .from("app_users")
    .select("user_id,email,display_name,role,organization_id,active")
    .eq("user_id", String(claims.sub))
    .maybeSingle();

  if (userError || !appUser || !appUser.active) return null;

  let organizationName: string | null = null;
  if (appUser.organization_id) {
    const { data: organization } = await db
      .from("organizations")
      .select("name")
      .eq("id", appUser.organization_id)
      .maybeSingle();
    organizationName = organization?.name ?? null;
  }

  return {
    userId: appUser.user_id,
    email: String(appUser.email ?? claims.email ?? "").trim().toLowerCase(),
    displayName: appUser.display_name,
    role: appUser.role as AppUserRole,
    organizationId: appUser.organization_id,
    organizationName,
    active: appUser.active,
  };
}

export function isSuperAdmin(user: CurrentAppUser | null) {
  return user?.role === "super_admin";
}

export function isClientUser(user: CurrentAppUser | null) {
  return user?.role === "client" && Boolean(user.organizationId);
}
