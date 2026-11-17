'use server';
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { currentStaffPermission } from '@/lib/staff-permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { getQuiz } from '@/lib/pdl-quizzes/catalog';
import { tokenHash } from '@/lib/pdl-quizzes/server';

export async function createQuizInvite(form: FormData) {
 const {user,allowed}=await currentStaffPermission('pdl','operate');
 if(!user||!allowed) return {error:'No tienes permiso para asignar quizzes.'};
 const organizationId=String(form.get('organizationId')??'');
 const name=String(form.get('name')??'').trim();
 const email=String(form.get('email')??'').trim().toLowerCase();
 const quiz=getQuiz(String(form.get('quizId')??''));
 if(!quiz||!name||name.length>150||email.length>254||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||!/^[a-f0-9-]{36}$/i.test(organizationId)) return {error:'Revisa empresa, tema, nombre y correo.'};
 const db=createAdminClient();
 const {data:org,error:orgError}=await db.from('organizations').select('id').eq('id',organizationId).eq('active',true).maybeSingle();
 if(orgError||!org) return {error:'Selecciona una empresa activa.'};
 const token=randomBytes(32).toString('hex');
 const {error}=await db.from('pdl_quiz_invites').insert({organization_id:organizationId,participant_name:name,participant_email:email||null,quiz_id:quiz.id,quiz_version:quiz.version,token_hash:tokenHash(token),created_by:user.userId});
 if(error) return {error:'No se pudo crear la liga. Intenta nuevamente.'};
 revalidatePath('/protected/pdl/quizzes');
 return {path:`/pdl-quiz/${token}`};
}
export async function revokeQuizInvite(id:string) {
 const {allowed}=await currentStaffPermission('pdl','operate');
 if(!allowed) return {error:'No tienes permiso.'};
 const {error}=await createAdminClient().from('pdl_quiz_invites').update({active:false}).eq('id',id);
 if(error) return {error:'No se pudo desactivar la liga.'};
 revalidatePath('/protected/pdl/quizzes');return {ok:true};
}
