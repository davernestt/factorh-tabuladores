import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = ['david@factorh.com.mx'];
/** Autenticación y autorización administrativa (no basta con que la sesión exista). */
export async function authorized360Admin() {
  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  const email = String(data?.claims?.email ?? '').trim().toLowerCase();
  return !error && !!data?.claims && ADMIN_EMAILS.includes(email);
}
