-- STAGED / NOT APPLIED: apply only after review and test on a non-production database.
-- FactoRH ESE: one service request -> at most one case; conversion in one transaction.
ALTER TABLE public.ese_cases
  ADD COLUMN IF NOT EXISTS request_id uuid UNIQUE
  REFERENCES public.ese_service_requests(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.ese_accept_service_request(
  p_request_id uuid,
  p_actor_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.ese_service_requests%ROWTYPE;
  v_subject public.ese_request_subjects%ROWTYPE;
  v_case_id uuid;
  v_actor_role text;
  v_origin text;
BEGIN
  -- Called through the service-role server client AFTER verifying the logged-in
  -- user's live app_users identity and "studies:operate" grant in Next.js.
  -- Do not grant EXECUTE to anon/authenticated.
  SELECT * INTO v_request FROM public.ese_service_requests
    WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;

  IF v_request.status='accepted' THEN
    SELECT id INTO v_case_id FROM public.ese_cases WHERE request_id=p_request_id;
    IF v_case_id IS NULL THEN RAISE EXCEPTION 'Solicitud aceptada sin expediente asociado'; END IF;
    RETURN v_case_id;
  END IF;
  IF v_request.status NOT IN ('requested','reviewing') THEN
    RAISE EXCEPTION 'Solicitud no disponible para procesar';
  END IF;
  IF v_request.quantity <> 1 OR v_request.service_key NOT IN
       ('express','esencial','integral','ejecutivo') THEN
    RAISE EXCEPTION 'Tipo/cantidad de estudio no admitido';
  END IF;

  SELECT * INTO v_subject FROM public.ese_request_subjects
    WHERE request_id=p_request_id;
  IF NOT FOUND OR v_subject.privacy_acknowledged IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Falta información/consentimiento verificado de la solicitud';
  END IF;
  SELECT role INTO v_actor_role FROM public.app_users
    WHERE user_id=v_request.requested_by AND active=true;
  v_origin:=CASE WHEN v_actor_role='client' THEN 'portal' ELSE 'manual' END;

  INSERT INTO public.ese_cases(
    request_id,organization_id,case_name,study_type,status,
    position_name,source,is_demo,client_visible,progress
  ) VALUES (
    p_request_id,v_request.organization_id,v_subject.full_name,
    v_request.service_key,'unassigned',v_subject.position_name,
    v_origin,false,false,0
  ) RETURNING id INTO v_case_id;

  UPDATE public.ese_service_requests
    SET status='accepted',updated_at=now()
    WHERE id=p_request_id;

  INSERT INTO public.ese_case_status_history(case_id,from_status,to_status,notes,changed_by)
    VALUES (v_case_id,NULL,'unassigned','Solicitud aceptada por FactoRH y expediente creado',p_actor_id);

  RETURN v_case_id;
END;
$$;

-- SECURITY: direct REST/RPC users must not be able to invoke this function.
REVOKE ALL ON FUNCTION public.ese_accept_service_request(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ese_accept_service_request(uuid,uuid) TO service_role;
