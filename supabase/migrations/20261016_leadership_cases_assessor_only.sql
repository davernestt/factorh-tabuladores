-- Casos y Simulaciones de Liderazgo: respuesta libre por participante,
-- calificación documentada únicamente por evaluador autorizado de FactoRH.
-- No elimina ni reescribe respuestas originales, incluidas las históricas.
create table if not exists public.leadership_case_ratings(
 assignment_id uuid not null references public.assessment_assignments(id) on delete cascade,
 question_id uuid not null references public.assessment_questions(id),
 score smallint not null check(score between 1 and 5),
 rated_by uuid not null,
 rated_at timestamptz not null default now(),
 primary key(assignment_id,question_id)
);
create index if not exists leadership_case_ratings_assessor_idx on public.leadership_case_ratings(rated_by,rated_at desc);
alter table public.leadership_case_ratings enable row level security;
revoke all on table public.leadership_case_ratings from public,anon,authenticated;
grant all on table public.leadership_case_ratings to service_role;

create or replace function public.refresh_leadership_case_results(p_assignment_id uuid)
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare v_type text; v_status text; v_total integer; v_count integer;
begin
 perform pg_advisory_xact_lock(17301,hashtext(p_assignment_id::text));
 select t.assessment_type,a.status into v_type,v_status
 from public.assessment_assignments a
 join public.assessment_templates t on t.id=a.template_id
 where a.id=p_assignment_id;
 if v_type is distinct from 'leadership_cases' or v_status is distinct from 'completed' then
  raise exception 'leadership_cases_assignment_must_be_completed';
 end if;
 select count(*) into v_total from public.assessment_questions q
 join public.assessment_assignments a on a.template_id=q.template_id
 where a.id=p_assignment_id and q.question_type='scale' and q.dimension_id is not null;
 select count(*) into v_count from public.leadership_case_ratings r
 join public.assessment_questions q on q.id=r.question_id
 join public.assessment_assignments a on a.template_id=q.template_id
 where a.id=p_assignment_id and r.assignment_id=p_assignment_id
 and q.question_type='scale' and q.dimension_id is not null;
 -- Las autoevaluaciones heredadas nunca equivalen a notas profesionales.
 delete from public.assessment_results where assignment_id=p_assignment_id;
 if v_total=0 or v_count<>v_total then return v_count; end if;
 insert into public.assessment_results
 (assignment_id,dimension_id,score,percentage,answered_questions,calculated_at)
 select r.assignment_id,q.dimension_id,round(avg(r.score)::numeric,3),
 round((avg(r.score)/5.0*100)::numeric,3),count(*)::integer,now()
 from public.leadership_case_ratings r
 join public.assessment_questions q on q.id=r.question_id
 join public.assessment_assignments a on a.template_id=q.template_id
 where r.assignment_id=p_assignment_id and a.id=p_assignment_id
 and q.question_type='scale' and q.dimension_id is not null
 group by r.assignment_id,q.dimension_id;
 return v_count;
end;
$function$;
revoke all on function public.refresh_leadership_case_results(uuid) from public,anon,authenticated;
grant execute on function public.refresh_leadership_case_results(uuid) to service_role;
