create table public.pdl_quiz_invites (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 quiz_id text not null check (quiz_id in ('cultura','comunicacion','conversaciones','emociones')),
 quiz_version integer not null default 1 check (quiz_version>0),
 participant_name text not null check (length(btrim(participant_name)) between 1 and 150),
 participant_email text check (length(participant_email)<=254),
 token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
 max_attempts integer not null default 2 check (max_attempts between 1 and 2),
 active boolean not null default true,
 created_by uuid not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '30 days')
);
create index pdl_quiz_invites_org_created on public.pdl_quiz_invites(organization_id,created_at desc);
create table public.pdl_quiz_attempts (
 id uuid primary key default gen_random_uuid(),
 invite_id uuid not null references public.pdl_quiz_invites(id),
 request_id uuid not null,
 attempt_number integer not null check (attempt_number between 1 and 2),
 result jsonb not null check (jsonb_typeof(result)='object' and result ? 'score' and (result->>'score')::integer between 0 and 100),
 submitted_at timestamptz not null default now(),
 unique(invite_id,attempt_number),
 unique(invite_id,request_id)
);
alter table public.pdl_quiz_invites enable row level security;
alter table public.pdl_quiz_attempts enable row level security;
-- Only authenticated server routes with explicit PDL authorization may access data.
revoke all on public.pdl_quiz_invites,public.pdl_quiz_attempts from public,anon,authenticated;
grant select,insert,update on public.pdl_quiz_invites to service_role;
grant select,insert on public.pdl_quiz_attempts to service_role;

create function public.submit_pdl_quiz(p_invite_id uuid,p_request_id uuid,p_result jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare invitation public.pdl_quiz_invites%rowtype;
 prior public.pdl_quiz_attempts%rowtype;
 n integer;
begin
 select * into invitation from public.pdl_quiz_invites where id=p_invite_id for update;
 if not found or not invitation.active or invitation.expires_at<=now() then raise exception 'quiz_unavailable'; end if;
 if not exists(select 1 from public.organizations where id=invitation.organization_id and active) then raise exception 'quiz_unavailable'; end if;
 select * into prior from public.pdl_quiz_attempts where invite_id=p_invite_id and request_id=p_request_id;
 if found then return jsonb_build_object('attempt_number',prior.attempt_number,'result',prior.result);end if;
 select count(*) into n from public.pdl_quiz_attempts where invite_id=p_invite_id;
 if n>=invitation.max_attempts then raise exception 'quiz_unavailable';end if;
 insert into public.pdl_quiz_attempts(invite_id,request_id,attempt_number,result) values(p_invite_id,p_request_id,n+1,p_result);
 return jsonb_build_object('attempt_number',n+1,'result',p_result);
end;
$$;
revoke all on function public.submit_pdl_quiz(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.submit_pdl_quiz(uuid,uuid,jsonb) to service_role;
