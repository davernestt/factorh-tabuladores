-- Centro de Clientes FactoRH: cotizaciones comerciales y bitácora.
-- Adición no destructiva: conserva usuarios, licencias, créditos y consumos.
create table if not exists public.company_commercial_quotes (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 created_by uuid not null,
 status text not null default 'draft' check(status in ('draft','accepted','cancelled')),
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 12),
 subtotal numeric(13,2) not null check(subtotal>=0),
 discount_amount numeric(13,2) not null default 0 check(discount_amount>=0),
 total_amount numeric(13,2) not null check(total_amount>=0),
 promo_50 boolean not null default false,
 expires_on date,
 notes text,
 created_at timestamptz not null default now()
);
create index if not exists company_quotes_org_created_idx on public.company_commercial_quotes(organization_id,created_at desc);
alter table public.company_commercial_quotes enable row level security;
revoke all on public.company_commercial_quotes from anon,authenticated;
grant all on public.company_commercial_quotes to service_role;

create table if not exists public.company_service_audit (
 id bigint generated always as identity primary key,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 module_key text,
 event_type text not null,
 old_state jsonb,
 new_state jsonb,
 actor_id uuid,
 occurred_at timestamptz not null default now()
);
create index if not exists company_audit_org_date_idx on public.company_service_audit(organization_id,occurred_at desc);
alter table public.company_service_audit enable row level security;
revoke all on public.company_service_audit from anon,authenticated;
grant all on public.company_service_audit to service_role;

-- Captura modificaciones futuras a licencias y créditos, incluso si se ejecutan
-- desde pantallas heredadas. El usuario administrador aparece en la cotización,
-- mientras que los cambios heredados dejan actor_id nulo.
create or replace function public.audit_company_service_change()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 current_row jsonb;
 prior_row jsonb;
 company_id uuid;
 key_value text;
begin
 if tg_op='INSERT' then
  current_row=to_jsonb(new);prior_row=null;company_id=new.organization_id;
 elsif tg_op='UPDATE' then
  current_row=to_jsonb(new);prior_row=to_jsonb(old);company_id=new.organization_id;
  if current_row=prior_row then return new;end if;
 else
  current_row=null;prior_row=to_jsonb(old);company_id=old.organization_id;
 end if;
 if tg_table_name='organization_module_subscriptions' then
  key_value=coalesce(current_row->>'module_key',prior_row->>'module_key');
 else
  key_value='psychometrics';
 end if;
 insert into public.company_service_audit
  (organization_id,module_key,event_type,old_state,new_state)
 values(company_id,key_value,tg_table_name||':'||lower(tg_op),prior_row,current_row);
 return coalesce(new,old);
end;$$;

drop trigger if exists company_audit_module_subscriptions on public.organization_module_subscriptions;
create trigger company_audit_module_subscriptions
after insert or update or delete on public.organization_module_subscriptions
for each row execute function public.audit_company_service_change();

drop trigger if exists company_audit_psychometric_credits on public.organization_psychometric_credits;
create trigger company_audit_psychometric_credits
after insert or update or delete on public.organization_psychometric_credits
for each row execute function public.audit_company_service_change();

-- El dashboard comercial mostrará cotizaciones como propuestas, nunca ingresos
-- cobrados. En una fase posterior facturación/pago podrán confirmar ingresos.
