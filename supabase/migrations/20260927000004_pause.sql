-- Hyrox Control — botó de pausa.
--
-- S'executa una sola vegada a l'editor SQL del panell de Supabase, després de
-- 20260926000003_email_status.sql.
--
-- PAUSE atura tots els comptadors; RESUME ("Continuar") torna a la mateixa
-- fase, estació i participant. El temps entre totes dues no compta enlloc.

alter table public.presses drop constraint presses_kind_check;

alter table public.presses add constraint presses_kind_check check (kind in (
  'START', 'SWITCH', 'TRANSITION', 'RUN',
  'NEXT_STATION', 'CHANGE_STATION', 'PAUSE', 'RESUME', 'FINISHED'));
