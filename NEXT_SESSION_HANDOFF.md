# Hyrox Control — handoff (27/09/2026)

## Estat
En producció a **https://hyrox.ddns.net**, versió `b3bfb4a` (`/api/health`).
Totes les fases fetes i desplegades:

| Fase | Què |
|---|---|
| 1 | Supabase (projecte propi), accés d'operador únic, participants i estacions |
| 2 | Motor de temps pur (`web/src/lib/timing/engine.ts`) amb tests |
| 3 | Selecció de participants i pantalla de control |
| 4 | CSV + correu per Gmail; keepalive diari de Supabase |
| + | Disseny tipus Apple (alternativa E), PAUSA/CONTINUAR, bips, fons de color, confirmació per a cada correu |

Base de dades neta: 0 sessions, 3 participants (Cristina, Judith, Núria),
8 estacions. Migracions 1–4 aplicades a Supabase.

## Com funciona (el que no es veu al codi d'un cop d'ull)
- Només es guarden **pulsacions** (hora del servidor de la Pi); tots els temps
  es calculen. Total = suma de trams, per això la pausa no hi compta.
- Estat de la sessió derivat: FINISHED → completada; `closed_at` → interrompuda.
- Tall de connexió o recàrrega → la sessió es tanca (01 §1). Es fa des del
  client perquè un prefetch no pugui tancar-ne cap.
- El correu **no s'envia sol**: la pantalla de resultats pregunta per cada
  participant. Estat a `sessions.email_log`.
- Supabase del projecte és a l'organització `escacx@gmail.com's Org`: el
  connector MCP no la veu. Canvis d'esquema = fitxer a `supabase/migrations/`
  + l'operador l'executa a l'editor SQL.

## Desplegament
L'operador ho fa a la Pi: `cd ~/hyrox-control && ./deploy.sh`. Totalment
independent d'Archer (projecte Docker propi, 127.0.0.1:3100, bloc nginx propi
per a hyrox.ddns.net). Guia: `deploy/README.md`. **Una migració nova s'aplica
sempre abans de desplegar el codi que la necessita.**

## Pendent / idees
- [ ] Confirmar al mòbil que el bip de canvi de participant sona diferent.
- [ ] Omplir el pes de les estacions (ara només es mostra la distància).
- [x] Especificació actualitzada a la versió 1.1 (reflecteix l'app en producció).
- [x] Estil Apple a totes les pantalles (commit 2cc3097). Desactivar i
      esborrar ara són a la pantalla d'edició de cada participant/estació.
- [x] TRANSITION es mostra com a ROXZONE (intern continua TRANSITION).
- [ ] Idea (aparcada): app Garmin Connect IQ (device app, no watch face).
      Necessitaria una API JSON amb clau pròpia, hora presa al rellotge (les
      peticions passen pel mòbil amb 1–3 s de retard) i una regla de tall
      més tolerant. Pendent: model de rellotge, qui el porta, si substitueix
      o complementa el mòbil.
- [ ] Opcional: filtrar els participants inactius (no s'esborren) i la
      unicitat de l'email, que la base de dades no comprova.

## Proves locals
- `web/.env.local` (no és al git) amb SUPABASE_URL, SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY, GMAIL_USER, GMAIL_APP_PASSWORD.
- `npm --prefix web run dev -- -p 3100`, `npm --prefix web test` (25 tests).
- Per provar sessions sense enviar correus reals: participant temporal amb
  l'adreça del Gmail de l'operador, i esborrar-lo després.
