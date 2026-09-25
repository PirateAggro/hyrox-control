-- Hyrox Control — esquema inicial (fase 1).
--
-- S'executa una sola vegada a l'editor SQL del panell de Supabase.
--
-- Principis (01_Functional_Specification.md):
--  - Els temps NO es guarden: es guarden les pulsacions i els temps es calculen
--    a partir d'elles. L'estat d'una sessió també es dedueix: "completada" si té
--    la pulsació FINISHED, "interrompuda" si no.
--  - L'hora de cada pulsació la posa el servidor de la Raspberry Pi.
--  - Participants i estacions no s'esborren si tenen històric: es desactiven.
--  - Un únic operador amb accés total: RLS dona accés complet al rol
--    `authenticated` i cap accés a `anon`.

create table public.participants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (btrim(name) <> ''),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- §3: "Valida que l'usuari no existeix ja si es vol crear amb el mateix nom".
-- Inclou els inactius: el nom continua existint a l'històric.
create unique index participants_name_unique
  on public.participants (lower(btrim(name)));

create table public.stations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (btrim(name) <> ''),
  sort_order  integer not null check (sort_order > 0),
  distance    text,
  weight      text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Dues estacions actives no poden tenir el mateix número d'ordre: l'última
-- prova és "la que té el número més alt" i l'ordre ha de ser inequívoc.
create unique index stations_active_order_unique
  on public.stations (sort_order) where active;

create table public.sessions (
  id          uuid primary key default gen_random_uuid(),
  mode        text not null check (mode in ('individual', 'team')),
  started_at  timestamptz not null default now()
);

create table public.session_participants (
  session_id      uuid not null references public.sessions (id) on delete cascade,
  participant_id  uuid not null references public.participants (id) on delete restrict,
  position        integer not null check (position > 0),
  primary key (session_id, participant_id),
  unique (session_id, position)
);

create table public.presses (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions (id) on delete cascade,
  -- Número de pulsació dins la sessió. Únic: una pulsació reenviada no es
  -- pot guardar dues vegades.
  seq             integer not null check (seq > 0),
  kind            text not null check (kind in (
                    'START', 'SWITCH', 'TRANSITION', 'RUN',
                    'NEXT_STATION', 'CHANGE_STATION', 'FINISHED')),
  participant_id  uuid references public.participants (id) on delete restrict,
  station_id      uuid references public.stations (id) on delete restrict,
  pressed_at      timestamptz not null,
  unique (session_id, seq)
);

create index presses_session_idx on public.presses (session_id, seq);

-- ── Seguretat ────────────────────────────────────────────────────────────────

alter table public.participants          enable row level security;
alter table public.stations              enable row level security;
alter table public.sessions              enable row level security;
alter table public.session_participants  enable row level security;
alter table public.presses               enable row level security;

create policy "operador: accés total" on public.participants
  for all to authenticated using (true) with check (true);
create policy "operador: accés total" on public.stations
  for all to authenticated using (true) with check (true);
create policy "operador: accés total" on public.sessions
  for all to authenticated using (true) with check (true);
create policy "operador: accés total" on public.session_participants
  for all to authenticated using (true) with check (true);
create policy "operador: accés total" on public.presses
  for all to authenticated using (true) with check (true);

-- ── Estacions inicials (Hyrox estàndard) ─────────────────────────────────────
-- WEIGHT es deixa buit: depèn de la categoria i és descriptiu (§3.1).

insert into public.stations (name, sort_order, distance) values
  ('SkiErg',             1, '1000 m'),
  ('Sled Push',          2, '50 m'),
  ('Sled Pull',          3, '50 m'),
  ('Burpee Broad Jumps', 4, '80 m'),
  ('Rowing',             5, '1000 m'),
  ('Farmers Carry',      6, '200 m'),
  ('Sandbag Lunges',     7, '100 m'),
  ('Wall Balls',         8, '100 reps');
