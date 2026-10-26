-- PDL master catalog for use across client organizations.
-- Copies source instruments without changing historical templates or responses.
-- Changes are additive and idempotent.

DO $pdl_seed$
DECLARE
  original record;
  dim record;
  question record;
  master_id uuid;
  cloned_dim_id uuid;
  dimension_map jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('factorh_pdl_global_catalog_v1'));
  FOR original IN
    SELECT t.*
      FROM public.assessment_templates t
      JOIN public.organizations o ON o.id = t.organization_id
     WHERE o.name = 'Grupo Colbert'
       AND t.active = true
       AND t.assessment_type IN ('leadership', 'leadership_direction', 'leadership_interview', 'leadership_cases')
     ORDER BY t.assessment_type, t.version DESC
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.assessment_templates existing
       WHERE existing.organization_id IS NULL
         AND existing.assessment_type = original.assessment_type
         AND existing.active = true
    ) THEN
      CONTINUE;
    END IF;

    master_id := gen_random_uuid();
    INSERT INTO public.assessment_templates
      (id,organization_id,name,description,assessment_type,version,active,validity_days,allow_result_reuse)
    VALUES
      (master_id,NULL,original.name,
       replace(replace(replace(original.description, 'Grupo Colbert', '{{empresa}}'),'Colbert','{{empresa}}'),'Alberto','la Dirección General'),
       original.assessment_type,original.version,true,original.validity_days,original.allow_result_reuse);

    dimension_map := '{}'::jsonb;
    FOR dim IN
      SELECT * FROM public.assessment_dimensions
       WHERE template_id = original.id ORDER BY sort_order,id
    LOOP
      cloned_dim_id := gen_random_uuid();
      INSERT INTO public.assessment_dimensions
        (id,template_id,name,description,sort_order,weight)
      VALUES
        (cloned_dim_id,master_id,dim.name,
         replace(replace(replace(dim.description, 'Grupo Colbert', '{{empresa}}'),'Colbert','{{empresa}}'),'Alberto','la Dirección General'),
         dim.sort_order,dim.weight);
      dimension_map := dimension_map || jsonb_build_object(dim.id::text,cloned_dim_id::text);
    END LOOP;

    FOR question IN
      SELECT * FROM public.assessment_questions
       WHERE template_id = original.id ORDER BY sort_order,id
    LOOP
      INSERT INTO public.assessment_questions (
        id,template_id,dimension_id,prompt,question_type,sort_order,required,
        allow_evidence,min_value,max_value,allow_not_observed,reverse_scored,
        facet,options,correct_option,difficulty
      )
      VALUES (
        gen_random_uuid(),master_id,
        CASE WHEN question.dimension_id IS NULL THEN NULL
             ELSE (dimension_map ->> question.dimension_id::text)::uuid END,
        replace(replace(replace(question.prompt,'Grupo Colbert','{{empresa}}'),'Colbert','{{empresa}}'),'Alberto','la Dirección General'),
        question.question_type,question.sort_order,question.required,
        question.allow_evidence,question.min_value,question.max_value,question.allow_not_observed,
        question.reverse_scored,question.facet,question.options,question.correct_option,question.difficulty
      );
    END LOOP;
  END LOOP;

  IF (
    SELECT COUNT(DISTINCT assessment_type)
      FROM public.assessment_templates
     WHERE organization_id IS NULL
       AND active = true
       AND assessment_type IN ('leadership','leadership_direction','leadership_interview','leadership_cases')
  ) <> 4 THEN
    RAISE EXCEPTION 'PDL master catalog incomplete; expected four instruments';
  END IF;
END
$pdl_seed$;

-- Internal server-only transactional activation. No customer self-service is
-- enabled here. Only the service_role can invoke this RPC.
CREATE OR REPLACE FUNCTION public.admin_configure_pdl(
  p_organization_id uuid,
  p_status text,
  p_plan_name text DEFAULT NULL,
  p_starts_on date DEFAULT NULL,
  p_ends_on date DEFAULT NULL,
  p_requested_on date DEFAULT NULL,
  p_requested_notes text DEFAULT NULL,
  p_reminder_days integer DEFAULT 30,
  p_client_notice boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $pdl_rpc$
DECLARE
  instrument_count integer;
BEGIN
  IF p_status NOT IN ('requested','active','paused','expired','cancelled') THEN
    RAISE EXCEPTION 'Invalid PDL status';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id=p_organization_id AND o.active = true
  ) THEN
    RAISE EXCEPTION 'Company unavailable';
  END IF;
  IF p_status = 'active' AND (
    p_starts_on IS NULL OR p_ends_on IS NULL OR
    p_starts_on > p_ends_on OR p_ends_on < current_date
  ) THEN
    RAISE EXCEPTION 'PDL requires valid start/end dates';
  END IF;

  SELECT COUNT(*) INTO instrument_count
    FROM public.assessment_templates t
   WHERE t.organization_id IS NULL AND t.active
     AND t.assessment_type IN ('leadership','leadership_direction','leadership_interview','leadership_cases')
     AND EXISTS (SELECT 1 FROM public.assessment_questions q WHERE q.template_id=t.id);
  IF p_status = 'active' AND instrument_count <> 4 THEN
    RAISE EXCEPTION 'PDL master catalog is incomplete';
  END IF;

  INSERT INTO public.organization_module_subscriptions
    (organization_id,module_key,status,plan_name,starts_on,ends_on,requested_on,
     requested_notes,reminder_days,client_notice,updated_at)
  VALUES
    (p_organization_id,'pdl',p_status,NULLIF(trim(p_plan_name),''),p_starts_on,p_ends_on,
     p_requested_on,LEFT(p_requested_notes,1200),greatest(1,least(120,coalesce(p_reminder_days,30))),
     coalesce(p_client_notice,true),now())
  ON CONFLICT (organization_id,module_key) DO UPDATE SET
    status=EXCLUDED.status,plan_name=EXCLUDED.plan_name,
    starts_on=EXCLUDED.starts_on,ends_on=EXCLUDED.ends_on,
    requested_on=EXCLUDED.requested_on,requested_notes=EXCLUDED.requested_notes,
    reminder_days=EXCLUDED.reminder_days,client_notice=EXCLUDED.client_notice,updated_at=now();

  IF p_status = 'active' THEN
    INSERT INTO public.organization_assessment_templates
      (organization_id,template_id,enabled,participant_sendable,updated_at)
    SELECT p_organization_id,t.id,true,true,now()
      FROM public.assessment_templates t
     WHERE t.organization_id IS NULL AND t.active
       AND t.assessment_type IN ('leadership','leadership_direction','leadership_interview','leadership_cases')
    ON CONFLICT (organization_id,template_id) DO UPDATE SET
      enabled=true,participant_sendable=true,updated_at=now();
  ELSE
    UPDATE public.organization_assessment_templates a
       SET enabled=false,participant_sendable=false,updated_at=now()
     WHERE a.organization_id=p_organization_id
       AND a.template_id IN (
         SELECT t.id FROM public.assessment_templates t
          WHERE t.organization_id IS NULL
            AND t.assessment_type IN ('leadership','leadership_direction','leadership_interview','leadership_cases')
       );
  END IF;
  RETURN jsonb_build_object('ok',true,'status',p_status,'master_instruments',instrument_count);
END
$pdl_rpc$;

REVOKE ALL ON FUNCTION public.admin_configure_pdl(uuid,text,text,date,date,date,text,integer,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_configure_pdl(uuid,text,text,date,date,date,text,integer,boolean) TO service_role;
