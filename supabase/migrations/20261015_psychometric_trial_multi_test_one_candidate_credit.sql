-- Prueba psicométrica FactoRH:
-- hasta dos candidatos por 30 días; cualquiera de las pruebas habilitadas
-- puede integrarse en una sola liga por candidato.
-- Sólo cambia el consumo en modo trial. Los paquetes contratados se mantienen
-- en la política vigente de un crédito por instrumento aplicado.
-- No reinicia contadores ni borra consumos previos.
update public.organization_psychometric_credits
set trial_single_test_only=false,updated_at=now()
where plan_type='trial' and trial_single_test_only=true;

create or replace function public.consume_psychometric_credits(
  p_organization_id uuid,p_process_id uuid,p_units integer
) returns table(
  plan_type text,credits_total integer,credits_used integer,
  credits_remaining integer,valid_until date
) language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_plan public.organization_psychometric_credits%rowtype;
  v_existing public.psychometric_credit_usage%rowtype;
  v_charge integer;
begin
  if p_units <= 0 or p_units > 20 then
    raise exception 'credit_units_invalid';
  end if;

  select * into v_existing
  from public.psychometric_credit_usage
  where process_id=p_process_id;

  if found then
    if v_existing.organization_id is distinct from p_organization_id then
      raise exception 'psychometric_process_organization_mismatch';
    end if;
    select * into v_plan from public.organization_psychometric_credits
      where organization_id=p_organization_id;
    return query select
      v_plan.plan_type,v_plan.credits_total,v_plan.credits_used,
      greatest(0,v_plan.credits_total-v_plan.credits_used),v_plan.valid_until;
    return;
  end if;

  select * into v_plan
  from public.organization_psychometric_credits
  where organization_id=p_organization_id for update;
  if not found then raise exception 'psychometric_plan_missing'; end if;
  if not v_plan.active then raise exception 'psychometric_plan_inactive'; end if;
  if v_plan.valid_until is not null and v_plan.valid_until < current_date then
    raise exception 'psychometric_plan_expired';
  end if;

  -- La unidad de la demo es una liga/proceso por candidato, independientemente
  -- de cuántos instrumentos autorizados tenga esa batería.
  v_charge:=case when v_plan.plan_type='trial' then 1 else p_units end;
  if v_plan.credits_used+v_charge>v_plan.credits_total then
    raise exception 'psychometric_credits_exhausted';
  end if;

  update public.organization_psychometric_credits
  set credits_used=credits_used+v_charge,updated_at=now()
  where organization_id=p_organization_id
  returning * into v_plan;

  insert into public.psychometric_credit_usage
    (organization_id,process_id,units)
  values (p_organization_id,p_process_id,v_charge);

  return query select
    v_plan.plan_type,v_plan.credits_total,v_plan.credits_used,
    greatest(0,v_plan.credits_total-v_plan.credits_used),v_plan.valid_until;
end;
$function$;

comment on function public.consume_psychometric_credits(uuid,uuid,integer) is
  'Demo: 1 aplicación por candidato/proceso sin importar número de psicometrías. Paquete: 1 crédito por instrumento. Respetar idempotencia y reembolsos.';
