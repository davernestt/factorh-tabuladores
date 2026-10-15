-- Catálogo empresarial compartido, sin cambiar resultados ni comprometer campañas históricas.
alter table public.assessment_processes add column if not exists department_id uuid;
alter table public.clima_invites add column if not exists department_id uuid;
alter table public.c3_departments add column if not exists organization_department_id uuid;

do $$
begin
 if not exists (select 1 from pg_constraint where conname='assessment_process_department_company_fk') then
  alter table public.assessment_processes add constraint assessment_process_department_company_fk
  foreign key (department_id,organization_id) references public.organization_departments(id,organization_id);
 end if;
 if not exists (select 1 from pg_constraint where conname='clima_invites_org_department_fk') then
  alter table public.clima_invites add constraint clima_invites_org_department_fk
  foreign key (department_id) references public.organization_departments(id);
 end if;
 if not exists (select 1 from pg_constraint where conname='c3_departments_org_department_fk') then
  alter table public.c3_departments add constraint c3_departments_org_department_fk
  foreign key (organization_department_id) references public.organization_departments(id);
 end if;
end $$;

-- Vincular áreas históricas de C3 al mismo catálogo, respetando sus identificadores
-- originales de campaña, esenciales para no alterar los desgloses publicados.
insert into public.organization_departments (organization_id,name)
select distinct on (c.organization_id,lower(btrim(d.name)))
 c.organization_id,btrim(d.name)
from public.c3_departments d
join public.c3_campaigns c on c.id=d.campaign_id
where nullif(btrim(d.name),'') is not null
order by c.organization_id,lower(btrim(d.name)),btrim(d.name)
on conflict do nothing;

update public.c3_departments d set organization_department_id=o.id
from public.c3_campaigns c,public.organization_departments o
where c.id=d.campaign_id and o.organization_id=c.organization_id
 and lower(btrim(o.name))=lower(btrim(d.name))
 and d.organization_department_id is null;

-- Foto histórica de PDL / psicometrías, independiente de futuros cambios de área.
update public.assessment_processes a set department_id=p.department_id
from public.people p where p.id=a.person_id and p.organization_id=a.organization_id
 and a.department_id is null and p.department_id is not null;

create index if not exists assessment_processes_org_department_idx
 on public.assessment_processes(organization_id,department_id,created_at);
create index if not exists clima_invites_campaign_department_idx
 on public.clima_invites(campaign_id,department_id,status);
create index if not exists c3_departments_canonical_idx
 on public.c3_departments(organization_department_id);

-- Invariante adicional: impedir asociar en SQL un departamento de otra empresa
-- a una invitación de encuesta clima, aun desde código de servicio.
create or replace function public.check_clima_invite_department_scope()
returns trigger language plpgsql as $$
begin
 if new.department_id is not null and not exists (
  select 1 from public.clima_campaigns c
  join public.organization_departments d on d.organization_id=c.organization_id
  where c.id=new.campaign_id and d.id=new.department_id
 ) then
  raise exception 'clima_department_outside_organization';
 end if;
 return new;
end;
$$;
drop trigger if exists enforce_clima_invite_department_scope on public.clima_invites;
create trigger enforce_clima_invite_department_scope
 before insert or update of campaign_id,department_id on public.clima_invites
 for each row execute function public.check_clima_invite_department_scope();

create or replace function public.check_c3_canonical_department_scope()
returns trigger language plpgsql as $$
begin
 if new.organization_department_id is not null and not exists (
  select 1 from public.c3_campaigns c
  join public.organization_departments d on d.organization_id=c.organization_id
  where c.id=new.campaign_id and d.id=new.organization_department_id
 ) then
  raise exception 'c3_department_outside_organization';
 end if;
 return new;
end;
$$;
drop trigger if exists enforce_c3_canonical_department_scope on public.c3_departments;
create trigger enforce_c3_canonical_department_scope
 before insert or update of campaign_id,organization_department_id on public.c3_departments
 for each row execute function public.check_c3_canonical_department_scope();
