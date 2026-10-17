-- Solicitudes de usuarios (sin alta automática). El superadministrador es el
-- único actor autorizado a crear cuentas y asignar perfiles de cualquier empresa.
create table if not exists public.client_user_requests (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 requested_by uuid not null references auth.users(id),
 requested_count integer not null check(requested_count between 1 and 20),
 notes text not null default '' check(length(notes)<=1000),
 status text not null default 'pending' check(status in ('pending','reviewed','fulfilled','rejected')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists client_user_requests_org_created on public.client_user_requests(organization_id,created_at desc);
alter table public.client_user_requests enable row level security;
revoke all on public.client_user_requests from anon,authenticated;
grant all on public.client_user_requests to service_role;
