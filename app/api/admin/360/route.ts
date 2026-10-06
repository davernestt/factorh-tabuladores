import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { authorized360Admin } from '@/lib/feedback360-auth';
import type { FeedbackRole } from '@/lib/feedback360';

type Rater = { role: FeedbackRole; name: string; email?: string };
type RequestBody = { organization_id?: string; person_id?: string; name?: string; due_date?: string; raters?: Rater[] };
const VALID_ROLES = new Set(['self','manager','peer','report']);
const clean = (s: unknown) => typeof s === 'string' ? s.trim() : '';
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(request: NextRequest) {
  if (!await authorized360Admin()) return fail('Sin permisos para administrar el 360°.', 403);
  let body: RequestBody;
  try { body = await request.json(); } catch { return fail('Datos inválidos.'); }
  const organization_id = clean(body.organization_id);
  const person_id = clean(body.person_id);
  const name = clean(body.name) || 'Evaluación 360°';
  const due_date = clean(body.due_date) || null;
  if (!organization_id || !person_id || name.length > 150) return fail('Selecciona empresa y persona evaluada.');
  if (due_date && (!/^\d{4}-\d{2}-\d{2}$/.test(due_date) || Number.isNaN(Date.parse(due_date)))) return fail('Fecha límite incorrecta.');
  if (!Array.isArray(body.raters) || body.raters.length < 1 || body.raters.length > 40) return fail('Añade entre 1 y 40 evaluadores externos.');
  const raters = body.raters.map(r => ({ role: clean(r.role) as FeedbackRole, name: clean(r.name), email: clean(r.email).toLowerCase() || null }));
  if (raters.some(r => !VALID_ROLES.has(r.role) || !r.name || r.name.length > 120 || (r.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) || r.email.length > 254)))) return fail('Revisa nombre, correo o relación de los evaluadores.');
  if (raters.filter(r => r.role === 'self').length !== 1 || raters.filter(r => r.role === 'manager').length > 1) return fail('Debe haber una autoevaluación y como máximo un jefe.');
  const db = createAdminClient();
  const { data: person, error: personError } = await db.from('people').select('id,first_name,last_name,organization_id,active').eq('id',person_id).eq('organization_id',organization_id).eq('active',true).maybeSingle();
  if (personError) return fail('Error al validar a la persona.', 500);
  if (!person) return fail('La persona no pertenece a la empresa seleccionada.');
  const self = raters.find(r => r.role === 'self')!;
  const personName = `${person.first_name} ${person.last_name ?? ''}`.trim();
  if (self.name.localeCompare(personName,'es',{sensitivity:'base'}) !== 0) return fail('El evaluador AUTO debe ser la misma persona evaluada.');
  const { data: cycle, error: createError } = await db.from('feedback360_cycles').insert({ organization_id, person_id, name, due_date, status:'open' }).select('id').single();
  if (createError || !cycle) return fail(createError?.message ?? 'No se pudo abrir el ciclo.',500);
  const invitations = raters.map(r => {
    const token = randomBytes(32).toString('base64url');
    return { ...r, token, token_hash: createHash('sha256').update(token).digest('hex') };
  });
  const {error: ratersError} = await db.from('feedback360_raters').insert(invitations.map(r => ({ cycle_id:cycle.id, role:r.role, evaluator_name:r.name, evaluator_email:r.email, token_hash:r.token_hash })));
  if (ratersError) {
    await db.from('feedback360_cycles').delete().eq('id',cycle.id);
    return fail(ratersError.message,500);
  }
  return NextResponse.json({ ok:true, cycle_id:cycle.id, invitations:invitations.map(r=>({ role:r.role,name:r.name,email:r.email,path:`/360/${r.token}` })) }, { status:201, headers:{'Cache-Control':'no-store'} });
}
