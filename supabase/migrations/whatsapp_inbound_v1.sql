-- Propuesta SIN aplicar. Revisar con esquema real de FactoRH antes de ejecutar.
create table if not exists public.wa_inbound_events (
 message_id text primary key,
 source_business text not null check(source_business in ('factorh','dc')),
 phone_number_id text not null,
 from_phone text not null,
 profile_name text,
 message_type text not null,
 text_body text,
 created_at timestamptz not null default now()
);
create table if not exists public.wa_outbox (
 id bigint generated always as identity primary key,
 source_message_id text not null unique references public.wa_inbound_events(message_id),
 source_business text not null check(source_business in ('factorh','dc')),
 phone_number_id text not null,
 to_phone text not null,
 text_body text not null,
 status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
 created_at timestamptz not null default now(),
 sent_at timestamptz
);
alter table public.wa_inbound_events enable row level security;
alter table public.wa_outbox enable row level security;
revoke all on public.wa_inbound_events from PUBLIC, anon, authenticated;
revoke all on public.wa_outbox from PUBLIC, anon, authenticated;
grant select, insert, update on public.wa_inbound_events to service_role;
grant select, insert, update on public.wa_outbox to service_role;
grant usage, select on sequence public.wa_outbox_id_seq to service_role;
