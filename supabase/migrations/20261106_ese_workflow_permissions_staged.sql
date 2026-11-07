-- FactoRH ESE: staged access-control design.
-- NOT applied automatically. Apply only after API and UI tests in a staging environment.
-- Existing super_admin policies remain intact.
-- A separate server action must validate assignment changes; applicators never update ese_cases.

-- Clients may create requests only for their own organization; the API must also
-- validate an active subscription to the 'studies' module before accepting.
CREATE POLICY ese_requests_client_insert ON public.ese_service_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.current_app_role() = 'client'
  AND requested_by = (select auth.uid())
  AND organization_id = public.current_app_organization_id()
  AND status = 'requested'
);

CREATE POLICY ese_requests_client_read ON public.ese_service_requests
FOR SELECT TO authenticated
USING (
  public.current_app_role() = 'client'
  AND organization_id = public.current_app_organization_id()
);

-- FactoRH staff grant is explicitly activated and independently scoped to studies.
CREATE POLICY ese_requests_staff_read ON public.ese_service_requests
FOR SELECT TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM public.staff_access_profiles p
    JOIN public.staff_module_grants g ON g.user_id=p.user_id
    WHERE p.user_id=(select auth.uid())
      AND p.activated=true AND g.module_key='studies' AND g.can_view=true
  )
);

CREATE POLICY ese_cases_staff_read ON public.ese_cases
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff_access_profiles p
    JOIN public.staff_module_grants g ON g.user_id=p.user_id
    WHERE p.user_id=(select auth.uid())
      AND p.activated=true AND g.module_key='studies' AND g.can_view=true
  )
);

-- Aplicador: access is limited to explicit assignment and never client administration.
CREATE POLICY ese_cases_operator_read ON public.ese_cases
FOR SELECT TO authenticated
USING (
  public.current_app_role()='ese_operator'
  AND assigned_to=(select auth.uid())
  AND coalesce(is_demo,false)=false
);

CREATE POLICY ese_sections_operator_read ON public.ese_case_sections
FOR SELECT TO authenticated
USING (
  public.current_app_role()='ese_operator'
  AND EXISTS (
    SELECT 1 FROM public.ese_cases c
    WHERE c.id=case_id AND c.assigned_to=(select auth.uid())
      AND c.status NOT IN ('cancelled','delivered')
  )
);

CREATE POLICY ese_sections_operator_insert ON public.ese_case_sections
FOR INSERT TO authenticated
WITH CHECK (
  public.current_app_role()='ese_operator'
  AND updated_by=(select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.ese_cases c
    WHERE c.id=case_id AND c.assigned_to=(select auth.uid())
      AND c.status NOT IN ('cancelled','delivered')
  )
);

CREATE POLICY ese_sections_operator_update ON public.ese_case_sections
FOR UPDATE TO authenticated
USING (
  public.current_app_role()='ese_operator'
  AND EXISTS (
    SELECT 1 FROM public.ese_cases c
    WHERE c.id=case_id AND c.assigned_to=(select auth.uid())
      AND c.status NOT IN ('cancelled','delivered')
  )
)
WITH CHECK (
  public.current_app_role()='ese_operator'
  AND updated_by=(select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.ese_cases c
    WHERE c.id=case_id AND c.assigned_to=(select auth.uid())
      AND c.status NOT IN ('cancelled','delivered')
  )
);

-- Before production activation:
-- 1. Ensure client's module subscription is active, on the server.
-- 2. Confirm staff profile lookup does not recurse under RLS.
-- 3. Verify no other existing policy leaks unassigned records.
-- 4. Add matching scoped policies to the other ESE child tables and storage.
-- 5. Test access as admin, client, supervisor, operator A, and operator B.
