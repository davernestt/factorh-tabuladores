-- FactoRH: cupos 360° por empresa. Operativo por módulo sin cambiar clientes existentes.
alter table public.organization_module_subscriptions
 add column if not exists evaluation_limit integer;
alter table public.organization_module_subscriptions
 drop constraint if exists organization_module_360_limit_positive;
alter table public.organization_module_subscriptions
 add constraint organization_module_360_limit_positive
 check (evaluation_limit is null or evaluation_limit between 1 and 10000);

-- El control se aplica dentro de la base de datos, incluso ante solicitudes simultáneas.
-- Las pruebas sin cupo configurado mantienen el límite anterior de un ciclo.
-- Planes antiguos sin cupo explícito conservan su funcionamiento previo.
create or replace function public.enforce_feedback360_cycle_limit()
returns trigger language plpgsql
security definer set search_path=public,pg_temp
as $$
declare
 v_status text;
 v_limit integer;
 v_start date;
 v_end date;
 v_count integer;
begin
 perform pg_advisory_xact_lock(20360,hashtext(new.organization_id::text));
 select status,evaluation_limit,starts_on,ends_on
 into v_status,v_limit,v_start,v_end
 from public.organization_module_subscriptions
 where organization_id=new.organization_id and module_key='feedback360';

 if v_status='trial' then
   v_limit:=coalesce(v_limit,1);
 elsif v_status='active' then
   -- Los planes activos previamente creados pueden no tener límite todavía.
   v_limit:=v_limit;
 else
   return new;
 end if;

 if v_limit is not null then
  select count(*)::integer into v_count from public.feedback360_cycles
  where organization_id=new.organization_id;
  if v_count>=v_limit then
    raise exception 'feedback360_evaluation_limit_reached'
      using errcode='P0001';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists feedback360_limit_before_insert on public.feedback360_cycles;
create trigger feedback360_limit_before_insert before insert
on public.feedback360_cycles for each row
execute function public.enforce_feedback360_cycle_limit();

-- La bitácora vigente ya registra modificaciones de suscripción,
-- por lo que documenta también cambios de cupos y de vigencia.
