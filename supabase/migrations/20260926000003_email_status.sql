-- Hyrox Control — fase 4: estat de l'enviament del correu.
--
-- S'executa una sola vegada a l'editor SQL del panell de Supabase, després de
-- 20260925000002_session_snapshot.sql.
--
-- El correu s'envia després de HYROX FINISHED, quan ja s'ha respost al mòbil.
-- Si falla (Gmail no respon, contrasenya d'aplicació incorrecta...), la sessió
-- continua completada; aquestes columnes permeten veure-ho i reenviar-lo.

alter table public.sessions
  add column email_sent_at timestamptz,
  add column email_error text;
