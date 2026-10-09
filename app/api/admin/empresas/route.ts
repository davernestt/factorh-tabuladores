import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

type Body = {
  name?: string;
  slug?: string;
  lifecycle_stage?: "prospect" | "client" | "inactive";
  website?: string;
  phone?: string;
  commercial_email?: string;
  notes?: string;
  enable_psychometrics?: boolean;
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

async function requireAdmin() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();
  const email = String(authData?.claims?.email ?? "").trim().toLowerCase();
  if (authError || !authData?.claims || !ADMIN_EMAILS.includes(email)) {
    return null;
  }
  return email;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

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

  const db = createAdminClient();
  const baseSlug = slugify(String(body.slug ?? "") || name) || "empresa";
  let slug = baseSlug;

  const existingSlug = await db
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlug.error) {
    return NextResponse.json({ error: existingSlug.error.message }, { status: 500 });
  }

  if (existingSlug.data) {
    slug = baseSlug + "-" + Date.now().toString().slice(-6);
  }

  const insertResult = await db
    .from("organizations")
    .insert({
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
    .select("id,name,slug,active,lifecycle_stage")
    .single();

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  if (body.enable_psychometrics !== false && lifecycleStage !== "inactive") {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    const { error: creditError } = await db
      .from("organization_psychometric_credits")
      .upsert(
        {
          organization_id: insertResult.data.id,
          plan_type: "trial",
          plan_name: "Prueba gratuita",
          credits_total: 2,
          credits_used: 0,
          valid_from: new Date().toISOString().slice(0, 10),
          valid_until: trialEnd.toISOString().slice(0, 10),
          active: true,
          trial_single_test_only: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" },
      );

    if (creditError) {
      return NextResponse.json(
        {
          error:
            "La empresa se creó, pero no fue posible configurar la prueba gratuita: " +
            creditError.message,
          company: insertResult.data,
        },
        { status: 500 },
      );
    }


    const templatesResult = await db
      .from("assessment_templates")
      .select("id")
      .eq("active", true)
      .is("organization_id", null)
      .like("assessment_type", "psychometric_%");

    if (templatesResult.error) {
      return NextResponse.json(
        {
          error:
            "La empresa se creó, pero no fue posible habilitar las psicometrías: " +
            templatesResult.error.message,
          company: insertResult.data,
        },
        { status: 500 },
      );
    }

    const rows = (templatesResult.data ?? []).map((template) => ({
      organization_id: insertResult.data.id,
      template_id: template.id,
      enabled: true,
      participant_sendable: true,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length) {
      const accessResult = await db
        .from("organization_assessment_templates")
        .upsert(rows, { onConflict: "organization_id,template_id" });

      if (accessResult.error) {
        return NextResponse.json(
          {
            error:
              "La empresa se creó, pero no fue posible habilitar las psicometrías: " +
              accessResult.error.message,
            company: insertResult.data,
          },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ ok: true, company: insertResult.data });
}
