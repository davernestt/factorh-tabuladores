import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getQuiz, publicQuiz } from './catalog';
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export async function loadInvite(token: string) {
 if(!/^[a-f0-9]{64}$/.test(token)) return null;
 const db=createAdminClient();
 const {data,error}=await db.from('pdl_quiz_invites').select('*').eq('token_hash',tokenHash(token)).maybeSingle();
 if(error) throw new Error('No se pudo consultar la evaluación. Intenta nuevamente.');
 if(!data || !data.active || Date.parse(data.expires_at)<Date.now()) return null;
 const quiz=getQuiz(data.quiz_id);
 if(!quiz||quiz.version!==data.quiz_version) return null;
 const {data:org,error:orgError}=await db.from('organizations').select('name,active').eq('id',data.organization_id).maybeSingle();
 if(orgError) throw new Error('No se pudo consultar la empresa.');
 if(!org?.active) return null;
 return {db,invite:data,quiz:publicQuiz(quiz.id)!,organization:org.name};
}
