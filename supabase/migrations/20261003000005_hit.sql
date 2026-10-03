-- Hyrox Control — comptador de hits a l'última estació.
--
-- S'executa una sola vegada a l'editor SQL del panell de Supabase, després de
-- 20260927000004_pause.sql, i ABANS de desplegar el codi que la fa servir: sense
-- ella, el primer +1 HIT no es podria guardar i la sessió es tancaria (01 §1).

-- HIT compta una repetició per al participant actiu a l'última estació. No
-- tanca ni obre cap tram: cap temps no canvia. Es guarda com una pulsació més
-- (participant i estació), i el recompte es calcula a partir de les pulsacions.
alter table public.presses drop constraint presses_kind_check;

alter table public.presses add constraint presses_kind_check check (kind in (
  'START', 'SWITCH', 'TRANSITION', 'RUN',
  'NEXT_STATION', 'CHANGE_STATION', 'PAUSE', 'RESUME', 'HIT', 'FINISHED'));
