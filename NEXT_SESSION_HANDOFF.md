# Hyrox Control — handoff (12/10/2026)

## Estat
En producció a **https://hyrox.ddns.net**, versió `c0ebab0` (`/api/health`),
desplegada el 12/10/2026. Totes les fases fetes i desplegades:

| Fase | Què |
|---|---|
| 1 | Supabase (projecte propi), accés d'operador, participants i estacions |
| 2 | Motor de temps pur (`web/src/lib/timing/engine.ts`) amb tests |
| 3 | Selecció de participants i pantalla de control |
| 4 | CSV + correu per Gmail; keepalive diari de Supabase |
| + | Disseny tipus Apple (alternativa E), PAUSA/CONTINUAR, bips, fons de color, confirmació per a cada correu |
| 1.2 | Última estació com les altres (ROXZONE, RUN, CHANGE STATION) i comptador de hits per participant |
| 1.3 | Usuaris: registre (/register), participants i sessions per usuari, estacions compartides que només modifica l'administrador |

Base de dades: 3 participants (Cristina, Judith, Núria), 8 estacions, tots
de l'operador original (administrador). Migracions 1–6 aplicades a Supabase
(la 6, `20261012000006_users.sql`, afegeix `owner_id`, la taula `admins`,
`is_admin()` i les polítiques RLS per usuari).

## ⚠️ Pendent de desplegar: versió 1.4 (12/10/2026)
Fet i provat en local (tsc, eslint, 35 tests; /login, /forgot i /reset es
veuen bé al mòbil). No provat al navegador amb sessió (cal la contrasenya de
l'operador): pantalla de control, esborrar sessions ni el correu de
recuperació. Ordre:
1. Supabase → SQL editor: `supabase/migrations/20261012000007_handover.sql`
   (afegeix HANDOVER al check de `presses.kind`). Sense ella, el primer
   PARTICIPANT TRANSITION tancaria la sessió.
2. Desplegar a la Pi (`./deploy.sh`).
3. Provar al mòbil: sessió d'equip amb PARTICIPANT TRANSITION (el temps del
   participant s'atura, l'estació i el total no; només se'n surt tocant un
   participant), resultats amb "Canvi participant – <estació>"; esborrar una
   sessió de prova; "Has oblidat la contrasenya?" amb el compte de prova.

Què hi ha:
- **PARTICIPANT TRANSITION** (intern `HANDOVER`, fase `handover`): suma a
  `teamStation` i a `totals.handover`, no a cap participant. Només en mode
  equip i des de la fase d'estació. Se'n surt amb SWITCH a qualsevol
  participant (també el mateix). Fons turquesa; en sortir torna el d'abans.
- **Inici**: ordenat per l'hora de START (abans per `started_at`, que és la
  creació). Paperera a cada fila → confirmació → `deleteSession` (cascada a
  presses i session_participants).
- **Recuperar contrasenya**: `/forgot` → `auth.admin.generateLink` (clau de
  servei) → correu pel Gmail de l'app amb `${SITE_URL}/reset?token_hash=…`.
  El token es valida en desar (`verifyOtp`), no en obrir l'enllaç. `SITE_URL`
  per defecte és https://hyrox.ddns.net (no cal tocar el .env de la Pi; en
  local, `SITE_URL=http://localhost:3100`). Límit d'un correu per minut i
  adreça (en memòria). Resposta idèntica hi hagi compte o no.

## Usuaris (1.3)
- `owner_id default auth.uid()` a participants i sessions: el codi no passa
  mai el propietari. RLS filtra per propietari; session_participants i
  presses van via la sessió.
- Estacions: lectura per a tothom, escriptura només si `is_admin()` (taula
  `admins`, sense polítiques: només s'hi accedeix per la funció). Les actions
  d'estacions fan `requireAdmin()`, perquè un UPDATE bloquejat per RLS no
  dona error, simplement no fa res.
- `sendEmailTo` comprova amb la sessió de l'usuari que la sessió és seva
  abans de l'enviament, que fa servir la clau de servei (salta RLS).
- Registre sense confirmació per correu (Supabase: "Allow new users to sign
  up" activat, "Confirm email" desactivat). Si algun dia s'activa la
  confirmació, `signUp` ja mostra "Confirma'l des del correu".
- Nou administrador: `insert into admins (user_id) select id from auth.users
  where email = '...';` a l'editor SQL.
- Esborrar un usuari: primer les seves sessions i participants (les FK a
  auth.users no són en cascada), després des d'Authentication → Users.

## Com funciona (el que no es veu al codi d'un cop d'ull)
- Només es guarden **pulsacions** (hora del servidor de la Pi); tots els temps
  es calculen. Total = suma de trams, per això la pausa no hi compta.
- Estat de la sessió derivat: FINISHED → completada; `closed_at` → interrompuda.
- **Hits** (només a l'última estació): cada toc de +1 HIT és una pulsació
  `HIT` del participant actiu. No tanca ni obre cap tram, així que no toca cap
  temps. El recompte és per participant i estació (`totals.hits`), i per això
  continua on era en tornar a un participant o a l'estació. Surten als
  resultats, al correu i al CSV (columna `Hits`).
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
- [ ] Provar 1.3 en producció amb un compte de prova: no veu res de
      l'operador, estacions de només lectura, participant + sessió + correu.
      Després esborrar-lo (dades primer). Confirmar també que els dos ajustos
      d'Auth de Supabase estan fets.
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
- [ ] Idea (aparcada): MCP de Garmin per a anàlisi amb Claude (no per a
      l'app web). Creuar els temps de Supabase amb freqüència cardíaca i
      ritme de l'activitat Garmin ("analitza el Hyrox d'avui"). Al catàleg
      oficial no n'hi ha cap; els de la comunitat entren amb usuari i
      contrasenya de Garmin Connect (ho configura l'operador, no Claude).
      Pendent: quin MCP concret.
- [ ] Possible millora: mentre una pulsació viatja al servidor (~0,2–0,5 s)
      els botons queden desactivats, i un segon +1 HIT molt ràpid no compta.
      Si cal comptar més de pressa, caldria una cua de hits al client.
- [ ] Opcional: filtrar els participants inactius (no s'esborren) i la
      unicitat de l'email, que la base de dades no comprova.
- [x] Recuperar la contrasenya per correu (1.4).
- [ ] Opcional: canviar la contrasenya amb la sessió oberta (ara cal fer
      servir "Has oblidat la contrasenya?").

## Proves locals
- `web/.env.local` (no és al git) amb SUPABASE_URL, SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY, GMAIL_USER, GMAIL_APP_PASSWORD.
- `npm --prefix web run dev -- -p 3100`, `npm --prefix web test` (30 tests).
- Per provar sessions sense enviar correus reals: participant temporal amb
  l'adreça del Gmail de l'operador, i esborrar-lo després.
