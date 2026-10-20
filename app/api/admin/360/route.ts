import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import {authorized360User,can360Organization,trial360Limit} from '@/lib/feedback360-access';
import {hasStaffPermission} from '@/lib/staff-permissions';
import type { FeedbackRole } from '@/lib/feedback360';
import { build360Url } from '@/lib/feedback360-url';

type Rater = { role: FeedbackRole; name: string; email?: string };
type RequestBody = { organization_id?: string; person_id?: string; name?: string; due_date?: string; raters?: Rater[] };
const VALID_ROLES = new Set(['self','manager','peer','report']);
const clean = (s: unknown) => typeof s === 'string' ? s.trim() : '';
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(request: NextRequest) {
  const user=await authorized360User();
  if(!user)return fail('Tu empresa no tiene acceso vigente al 360°.',403);
  if(user.role!=='client'&&!await hasStaffPermission(user,'feedback360','operate'))return fail('Sin permiso para crear ciclos.',403);
  const origin=request.headers.get('origin');
  if(origin&&origin!==request.nextUrl.origin)return fail('Origen no permitido.',403);
  if(Number(request.headers.get('content-length')||0)>16000)return fail('Solicitud demasiado extensa.',413);
  let body: RequestBody;
  try { body = await request.json(); } catch { return fail('Datos inválidos.'); }
  const organization_id = clean(body.organization_id);
  const person_id = clean(body.person_id);
  const name = clean(body.name) || 'Evaluación 360°';
  const due_date = clean(body.due_date) || null;
  if (!organization_id || !person_id || name.length > 150) return fail('Selecciona empresa y persona evaluada.');
  if(!can360Organization(user,organization_id))return fail('Empresa no autorizada.',403);
  if (due_date && (!/^\d{4}-\d{2}-\d{2}$/.test(due_date) || Number.isNaN(Date.parse(due_date)))) return fail('Fecha límite incorrecta.');
  if (!Array.isArray(body.raters) || body.raters.length < 1 || body.raters.length > 40) return fail('Añade entre 1 y 40 evaluadores externos.');
  const raters = body.raters.map(r => ({ role: clean(r.role) as FeedbackRole, name: clean(r.name), email: clean(r.email).toLowerCase() || null }));
  if (raters.some(r => !VALID_ROLES.has(r.role) || !r.name || r.name.length > 120 || (r.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) || r.email.length > 254)))) return fail('Revisa nombre, correo o relación de los evaluadores.');
  if (raters.filter(r => r.role === 'self').length !== 1 || raters.filter(r => r.role === 'manager').length > 1) return fail('Debe haber una autoevaluación y como máximo un jefe.');
  const db = createAdminClient();
  const {data:org}=await db.from('organizations').select('id,active').eq('id',organization_id).maybeSingle();
  if(user.role!=='super_admin'&&user.role!=='client'){
    const {data:subscription}=await db.from('organization_module_subscriptions')
      .select('status,starts_on,ends_on').eq('organization_id',organization_id).eq('module_key','feedback360').maybeSingle();
    const now=new Date().toISOString().slice(0,10);
    if(!subscription||!['active','trial'].includes(subscription.status)||
      subscription.starts_on&&subscription.starts_on>now||
      subscription.ends_on&&subscription.ends_on<now)
      return fail('Sólo puedes crear ciclos de empresas con servicio 360° vigente.',403);
  }
  if(!org?.active)return fail('Empresa no activa.',403);
  const limit=await trial360Limit(user);
  if(limit!==null){
    const {count,error:limitError}=await db.from('feedback360_cycles').select('id',{count:'exact',head:true}).eq('organization_id',organization_id);
    if(limitError)return fail('No fue posible verificar el límite del plan.',500);
    if((count||0)>=limit)return fail('Tu demostración incluye un ciclo 360°. Solicita a FactoRH la activación del plan para crear más evaluaciones.',403);
  }
  const { data: person, error: personError } = await db.from('people').select('id,first_name,last_name,organization_id,department_id,active').eq('id',person_id).eq('organization_id',organization_id).eq('active',true).maybeSingle();
  if (personError) return fail('Error al validar a la persona.', 500);
  if (!person) return fail('La persona no pertenece a la empresa seleccionada.');
  if(!person.department_id)return fail('Asigna un departamento a la persona antes de crear su evaluación.');
  const {data:department}=await db.from('organization_departments').select('id').eq('id',person.department_id).eq('organization_id',organization_id).eq('active',true).maybeSingle();
  if(!department)return fail('Selecciona un departamento activo de esta empresa.');
  const self = raters.find(r => r.role === 'self')!;
  const personName = `${person.first_name} ${person.last_name ?? ''}`.trim();
  if (self.name.localeCompare(personName,'es',{sensitivity:'base'}) !== 0) return fail('El evaluador AUTO debe ser la misma persona evaluada.');
  const { data: cycle, error: createError } = await db.from('feedback360_cycles').insert({ organization_id, person_id, department_id:person.department_id, name, due_date, status:'open' }).select('id').single();
  if (createError || !cycle) {
    if(createError?.message?.includes('feedback360_evaluation_limit_reached')) return fail('Se alcanzó el cupo de evaluaciones 360° de esta empresa. Solicita a FactoRH una ampliación del plan.',409);
    return fail('No se pudo abrir el ciclo 360°.',500);
  }
  const invitations = raters.map(r => {
    const token = randomBytes(32).toString('base64url');
    return { ...r, token, token_hash: createHash('sha256').update(token).digest('hex') };
  });
  const {error: ratersError} = await db.from('feedback360_raters').insert(invitations.map(r => ({ cycle_id:cycle.id, role:r.role, evaluator_name:r.name, evaluator_email:r.email, token_hash:r.token_hash })));
  if (ratersError) {
    await db.from('feedback360_cycles').delete().eq('id',cycle.id);
    return fail(ratersError.message,500);
  }
  return NextResponse.json({ ok:true, cycle_id:cycle.id, invitations:invitations.map(r=>({ role:r.role,name:r.name,email:r.email,url:build360Url(r.token) })) }, { status:201, headers:{'Cache-Control':'no-store'} });
}
