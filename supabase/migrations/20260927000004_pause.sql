-- Hyrox Control — botó de pausa i enviament de correu confirmat.
--
-- S'executa una sola vegada a l'editor SQL del panell de Supabase, després de
-- 20260926000003_email_status.sql.

-- PAUSE atura tots els comptadors; RESUME ("Continuar") torna a la mateixa
-- fase, estació i participant. El temps entre totes dues no compta enlloc.
alter table public.presses drop constraint presses_kind_check;

alter table public.presses add constraint presses_kind_check check (kind in (
  'START', 'SWITCH', 'TRANSITION', 'RUN',
  'NEXT_STATION', 'CHANGE_STATION', 'PAUSE', 'RESUME', 'FINISHED'));

-- El correu ja no s'envia sol en acabar: l'operador confirma cada enviament.
-- Estat per participant: { "<participant_id>": { "sentAt": "...", "error": null } }
-- (email_sent_at / email_error queden per a les sessions d'abans d'aquest canvi.)
alter table public.sessions
  add column email_log jsonb not null default '{}';
