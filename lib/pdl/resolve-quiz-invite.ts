import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolve the original link and any extra links created by RH to the same invite.
 * Extra links never replace the original hash, so existing links keep working.
 * Attempt counters remain associated with the original invite_id.
 */
export async function resolvePdlQuizInvite(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const db = createAdminClient();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const fields = "id,quiz_id,quiz_version,participant_name,max_attempts,active,expires_at";
  const original = await db.from("pdl_quiz_invites").select(fields).eq("token_hash",tokenHash).maybeSingle();
  if (original.error) throw new Error("No se pudo comprobar la invitación");
  if (original.data) return original.data;
  const extra = await db.from("pdl_quiz_invite_links").select("invite_id").eq("token_hash",tokenHash).maybeSingle();
  if (extra.error) throw new Error("No se pudo comprobar el enlace alternativo");
  if (!extra.data) return null;
  const invite = await db.from("pdl_quiz_invites").select(fields).eq("id",extra.data.invite_id).maybeSingle();
  if (invite.error) throw new Error("No se pudo comprobar la invitación");
  return invite.data;
}
