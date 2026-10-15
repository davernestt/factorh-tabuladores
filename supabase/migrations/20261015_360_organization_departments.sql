-- Catálogo multiempresa con histórico del departamento de cada ciclo 360°.
-- Migration aditiva: no elimina áreas ni altera puntuaciones.
create table if not exists public.organization_departments (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 2 and 100),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique (id, organization_id)
);
create unique index if not exists organization_departments_org_name_ci_uq
 on public.organization_departments (organization_id, lower(btrim(name)));
alter table public.organization_departments enable row level security;
revoke all on public.organization_departments from anon, authenticated;

alter table public.people add column if not exists department_id uuid;
alter table public.feedback360_cycles add column if not exists department_id uuid;
do $$
begin
 if not exists (select 1 from pg_constraint where conname='people_department_company_fk') then
  alter table public.people add constraint people_department_company_fk
   foreign key (department_id, organization_id)
   references public.organization_departments(id, organization_id);
 end if;
 if not exists (select 1 from pg_constraint where conname='feedback360_cycle_department_company_fk') then
  alter table public.feedback360_cycles add constraint feedback360_cycle_department_company_fk
   foreign key (department_id, organization_id)
   references public.organization_departments(id, organization_id);
 end if;
end $$;

-- Convertir las áreas existentes a departamentos sin duplicar variantes de mayúsculas.
insert into public.organization_departments (organization_id, name)
select distinct on (p.organization_id, lower(btrim(p.area))) p.organization_id, btrim(p.area)
from public.people p
where nullif(btrim(p.area),'') is not null
order by p.organization_id, lower(btrim(p.area)), btrim(p.area)
on conflict do nothing;

update public.people p set department_id=d.id
from public.organization_departments d
where p.organization_id=d.organization_id
 and p.department_id is null
 and lower(btrim(p.area))=lower(btrim(d.name));

-- Foto histórica: posteriores cambios de departamento no modifican ciclos ya creados.
update public.feedback360_cycles c set department_id=p.department_id
from public.people p
where p.id=c.person_id and p.organization_id=c.organization_id
 and c.department_id is null and p.department_id is not null;

create index if not exists people_org_department_idx on public.people (organization_id, department_id);
create index if not exists feedback360_cycles_org_department_idx
 on public.feedback360_cycles (organization_id, department_id, status);
