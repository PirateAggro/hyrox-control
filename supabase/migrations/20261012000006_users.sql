-- Hyrox Control — diversos usuaris.
--
-- S'executa una sola vegada a l'editor SQL del panell de Supabase, després de
-- 20261003000005_hit.sql, i ABANS de desplegar el codi que la fa servir.
-- Requisit: a auth.users hi ha d'haver només el compte de l'operador actual
-- (si no, la migració s'atura sense canviar res).
--
-- Fins ara hi havia un únic operador amb accés a tot. Ara cadascú es registra
-- (email i contrasenya) i:
--  - Participants i sessions són de l'usuari que els crea: només els veu ell.
--    Les pulsacions i els participants d'una sessió segueixen la sessió.
--  - Les estacions són compartides: tothom les veu, però només els
--    administradors (taula `admins`) les poden crear, modificar o esborrar.
--  - L'operador actual passa a ser administrador i propietari de totes les
--    dades que ja hi ha.

-- ── Administradors ───────────────────────────────────────────────────────────

create table public.admins (
  user_id uuid primary key references auth.users (id)
);

alter table public.admins enable row level security;
-- Sense polítiques: ningú no la llegeix directament. Es consulta amb is_admin().

-- security definer: llegeix `admins` saltant RLS, però només respon per a
-- l'usuari que fa la crida.
create function public.is_admin() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ── Propietari de participants i sessions ────────────────────────────────────
-- default auth.uid(): el servidor insereix amb la sessió de l'usuari, així que
-- el codi no ha de passar mai el propietari.

alter table public.participants
  add column owner_id uuid references auth.users (id) default auth.uid();
alter table public.sessions
  add column owner_id uuid references auth.users (id) default auth.uid();

do $$
declare
  op uuid;
begin
  if (select count(*) from auth.users) <> 1 then
    raise exception 'Hi ha d''haver exactament un usuari (l''operador actual) a auth.users.';
  end if;
  select id into op from auth.users;

  insert into public.admins (user_id) values (op);
  update public.participants set owner_id = op;
  update public.sessions set owner_id = op;
end $$;

alter table public.participants alter column owner_id set not null;
alter table public.sessions alter column owner_id set not null;

create index participants_owner_idx on public.participants (owner_id);
create index sessions_owner_idx on public.sessions (owner_id, started_at desc);

-- El nom és únic per a cada usuari: dos usuaris poden tenir una "Cristina".
drop index public.participants_name_unique;
create unique index participants_name_unique
  on public.participants (owner_id, lower(btrim(name)));

-- ── Polítiques ───────────────────────────────────────────────────────────────

drop policy "operador: accés total" on public.participants;
drop policy "operador: accés total" on public.stations;
drop policy "operador: accés total" on public.sessions;
drop policy "operador: accés total" on public.session_participants;
drop policy "operador: accés total" on public.presses;

create policy "propietari" on public.participants
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "propietari" on public.sessions
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Les subconsultes passen per RLS de `sessions` i `participants`: només hi
-- troben les files de l'usuari.
create policy "propietari de la sessió" on public.session_participants
  for all to authenticated
  using (session_id in (select id from public.sessions))
  with check (
    session_id in (select id from public.sessions)
    and participant_id in (select id from public.participants)
  );

create policy "propietari de la sessió" on public.presses
  for all to authenticated
  using (session_id in (select id from public.sessions))
  with check (
    session_id in (select id from public.sessions)
    and (participant_id is null
         or participant_id in (select id from public.participants))
  );

create policy "tothom les veu" on public.stations
  for select to authenticated using (true);
create policy "administrador: crear" on public.stations
  for insert to authenticated with check ((select public.is_admin()));
create policy "administrador: modificar" on public.stations
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "administrador: esborrar" on public.stations
  for delete to authenticated using ((select public.is_admin()));
