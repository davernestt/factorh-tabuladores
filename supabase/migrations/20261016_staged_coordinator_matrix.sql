-- Paola conserva su cuenta y rol actuales. El perfil operativo se prepara desactivado.
create table if not exists public.staff_access_profiles (
 user_id uuid primary key references public.app_users(user_id) on delete cascade,
 profile_key text not null default 'operations_coordinator',
 activated boolean not null default false,
 validated_at timestamptz,
 activated_at timestamptz,
 updated_at timestamptz not null default now(),
 check(profile_key='operations_coordinator'),
 check(activated=false or (validated_at is not null and activated_at is not null))
);
create table if not exists public.staff_module_grants (
 user_id uuid not null references public.staff_access_profiles(user_id) on delete cascade,
 module_key text not null check(module_key in ('psychometrics','feedback360','pdl','nom035','climate','studies','candidates')),
 can_view boolean not null default false,
 can_operate boolean not null default false,
 can_reports boolean not null default false,
 primary key(user_id,module_key)
);
alter table public.staff_access_profiles enable row level security;
alter table public.staff_module_grants enable row level security;
revoke all on public.staff_access_profiles from authenticated,anon;
revoke all on public.staff_module_grants from authenticated,anon;
insert into public.staff_access_profiles(user_id,profile_key,activated)
 select u.user_id,'operations_coordinator',false
 from public.app_users u join public.organizations o on o.id=u.organization_id
 where o.slug='factorh' and lower(u.display_name)='paola beas'
 on conflict(user_id) do nothing;
insert into public.staff_module_grants(user_id,module_key,can_view,can_operate,can_reports)
 select u.user_id,m.module_key,true,true,true
 from public.app_users u join public.organizations o on o.id=u.organization_id
 cross join (values ('psychometrics'),('feedback360'),('pdl'),('nom035'),('climate'),('studies'),('candidates')) m(module_key)
 where o.slug='factorh' and lower(u.display_name)='paola beas'
 on conflict(user_id,module_key) do nothing;
