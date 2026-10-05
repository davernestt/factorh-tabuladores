import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();
  const email = String(authData?.claims?.email ?? "").trim().toLowerCase();

  if (authError || !authData?.claims || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const db = createAdminClient();

  const { error } = await db
    .from("assessment_batteries")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
