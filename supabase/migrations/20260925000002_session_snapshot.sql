-- Hyrox Control — fase 3: la sessió és estable i es pot tancar.
--
-- S'executa una sola vegada a l'editor SQL del panell de Supabase, després de
-- 20260925000001_init.sql.

-- Ordre de les estacions actives en el moment de crear la sessió. El motor de
-- temps necessita saber quina és la següent i quina l'última; si l'operador
-- edita les estacions a mitja sessió, la sessió no se n'ha de veure afectada.
alter table public.sessions
  add column station_ids uuid[] not null default '{}';

-- Moment en què la sessió es va tancar per un tall o una recàrrega (01 §1).
-- El servidor no accepta pulsacions noves en una sessió tancada.
-- Estat derivat:
--   té la pulsació FINISHED          → completada
--   closed_at no és null (sense FINISHED) → interrompuda
--   si no                            → en curs
alter table public.sessions
  add column closed_at timestamptz;
