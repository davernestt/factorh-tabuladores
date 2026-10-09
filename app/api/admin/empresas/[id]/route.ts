import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

type Body = {
  name?: string;
  slug?: string;
  lifecycle_stage?: "prospect" | "client" | "inactive";
  website?: string;
  phone?: string;
  commercial_email?: string;
  notes?: string;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clean(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();
  const email = String(authData?.claims?.email ?? "").trim().toLowerCase();

  if (authError || !authData?.claims || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Body;
  const name = String(body.name ?? "").trim();
  const lifecycleStage = ["prospect", "client", "inactive"].includes(
    String(body.lifecycle_stage),
  )
    ? (body.lifecycle_stage as "prospect" | "client" | "inactive")
    : "client";

  if (!name) {
    return NextResponse.json(
      { error: "El nombre de la empresa es obligatorio." },
      { status: 400 },
    );
  }

  const slug = slugify(String(body.slug ?? "") || name) || "empresa";
  const db = createAdminClient();

  const existing = await db
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }

  if (existing.data) {
    return NextResponse.json(
      { error: "Ese identificador ya pertenece a otra empresa." },
      { status: 409 },
    );
  }

  const updateResult = await db
    .from("organizations")
    .update({
      name,
      slug,
      active: lifecycleStage !== "inactive",
      lifecycle_stage: lifecycleStage,
      website: clean(body.website),
      phone: clean(body.phone),
      commercial_email: clean(body.commercial_email),
      notes: clean(body.notes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,name,slug,active,lifecycle_stage")
    .single();

  if (updateResult.error) {
    return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, company: updateResult.data });
}
