-- Hyrox Control — botó PARTICIPANT TRANSITION (canvi de participant).
--
-- S'executa una sola vegada a l'editor SQL del panell de Supabase, després de
-- 20261012000006_users.sql, i ABANS de desplegar el codi que la fa servir:
-- sense ella, la primera pulsació no es podria guardar i la sessió es tancaria
-- (01 §1).

-- HANDOVER (en mode equip) atura el comptador del participant mentre es canvia
-- de participant; l'estació i el total continuen. Se'n surt amb SWITCH.
alter table public.presses drop constraint presses_kind_check;

alter table public.presses add constraint presses_kind_check check (kind in (
  'START', 'SWITCH', 'HANDOVER', 'TRANSITION', 'RUN',
  'NEXT_STATION', 'CHANGE_STATION', 'PAUSE', 'RESUME', 'HIT', 'FINISHED'));
