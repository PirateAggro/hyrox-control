# Hyrox Control — handoff (22/11/2026)

## Estat
En producció a **https://hyrox.ddns.net**, versió `f238982` (comprovat a
`/api/health` el 22/11/2026). És el darrer commit de `master`: no hi ha res
pendent de desplegar. Especificació: versió 1.5 (`01_Functional_Specification.md`).

| Fase | Què |
|---|---|
| 1 | Supabase (projecte propi), accés d'operador, participants i estacions |
| 2 | Motor de temps pur (`web/src/lib/timing/engine.ts`) amb tests |
| 3 | Selecció de participants i pantalla de control |
| 4 | CSV + correu per Gmail; keepalive diari de Supabase |
| + | Disseny tipus Apple (alternativa E), PAUSA/CONTINUAR, bips, fons de color, confirmació per a cada correu |
| 1.2 | Última estació com les altres (ROXZONE, RUN, CHANGE STATION) i comptador de hits per participant |
| 1.3 | Usuaris: registre (/register), participants i sessions per usuari, estacions compartides que només modifica l'administrador |
| 1.4 | PARTICIPANT TRANSITION, esborrar sessions des de l'inici, recuperar la contrasenya per correu |
| 1.5 | Sense connexió la sessió continua al mòbil i se sincronitza; una recàrrega la reprèn |
| + | Icona de la drecera a la pantalla d'inici (kettlebell HYROX) i manifest |

Base de dades: migracions 1–7 al repositori. La 7
(`20261012000007_handover.sql`, HANDOVER al check de `presses.kind`) és
necessària per a la 1.4, que ja és en producció. No s'ha pogut comprovar des
d'aquí (el connector MCP no veu el projecte): si un PARTICIPANT TRANSITION
tanca la sessió en lloc de guardar-se, és que falta aplicar-la.

Documentació fora del repositori: nota **Hyrox Control** a la bòveda
d'Obsidian `escacx` (especificació, arquitectura i disseny resumits),
enllaçada amb "Publicar apps a la Raspberry" i "StockControl".

## Sense connexió (1.5)
- Si una pulsació no es pot guardar, la pantalla no tanca la sessió: construeix
  la pulsació al mòbil amb el mateix motor (`buildPress`), amb l'hora del
  mòbil corregida pel desfasament amb el servidor, i mostra "Sense connexió"
  amb les pendents.
- Còpia local a `localStorage` (`lib/local-session.ts`, prefix
  `hyrox:session:`, caduca en 12 h). Cada accés dins un try/catch: si el
  navegador no la deixa fer servir, la pantalla es comporta com abans.
- Cada 5 s i en tornar la xarxa, `syncPresses` envia totes les locals; el
  servidor guarda les que li falten (`lib/timing/sync.ts`). La llista del
  servidor sempre ha de ser el començament de la local: si no coincideixen,
  la sessió s'ha fet servir des de dos llocs i surt "No es pot sincronitzar".
- Recàrrega des del mateix mòbil → es reprèn amb les pendents. Des d'un mòbil
  sense còpia → la sessió es tanca (com abans). En tornar a l'inici es tanquen
  les sessions obertes, excepte les que el mòbil té guardades.
- HYROX FINISHED sense connexió: es mostra el resum i, quan tot és guardat,
  la pantalla de correus.

## PARTICIPANT TRANSITION, esborrar i contrasenya (1.4)
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
- Només es guarden **pulsacions** (hora del servidor de la Pi, o la del mòbil
  corregida si es van fer sense connexió); tots els temps es calculen. Total =
  suma de trams, per això la pausa no hi compta.
- Estat de la sessió derivat: FINISHED → completada; `closed_at` → interrompuda.
- **Hits** (només a l'última estació): cada toc de +1 HIT és una pulsació
  `HIT` del participant actiu. No tanca ni obre cap tram, així que no toca cap
  temps. El recompte és per participant i estació (`totals.hits`), i per això
  continua on era en tornar a un participant o a l'estació. Surten als
  resultats, al correu i al CSV (columna `Hits`).
- Tancar una sessió (entrada des d'un altre mòbil, o en tornar a l'inici) es
  fa des del client perquè un prefetch no pugui tancar-ne cap.
- El correu **no s'envia sol**: la pantalla de resultats pregunta per cada
  participant. Estat a `sessions.email_log`.
- El `manifest` i les icones (`web/public/`) es poden demanar sense sessió
  (`proxy.ts`). Font de la icona: `deploy/icon/icon.svg`.
- Supabase del projecte és a l'organització `escacx@gmail.com's Org`: el
  connector MCP no la veu. Al mateix compte hi ha el projecte de StockControl.
  Canvis d'esquema = fitxer a `supabase/migrations/` + l'operador l'executa a
  l'editor SQL.

## Desplegament
L'operador ho fa a la Pi: `cd ~/hyrox-control && ./deploy.sh`. Totalment
independent d'Archer (projecte Docker propi, 127.0.0.1:3100, bloc nginx propi
per a hyrox.ddns.net). Guia: `deploy/README.md`. **Una migració nova s'aplica
sempre abans de desplegar el codi que la necessita.**

## Pendent / idees
- [ ] Confirmar que la migració 7 és aplicada (veure "Estat").
- [ ] Provar a producció el que no es va poder provar amb sessió: sessió
      d'equip amb PARTICIPANT TRANSITION, esborrar una sessió de prova, el
      correu de "Has oblidat la contrasenya?" i una sessió amb el mòbil en
      mode avió a mitja prova (1.5).
- [ ] Provar 1.3 en producció amb un compte de prova: no veu res de
      l'operador, estacions de només lectura, participant + sessió + correu.
      Després esborrar-lo (dades primer). Confirmar també que els dos ajustos
      d'Auth de Supabase estan fets.
- [ ] Confirmar al mòbil que el bip de canvi de participant sona diferent.
- [ ] Omplir el pes de les estacions (ara només es mostra la distància).
- [ ] **Dashboard d'anàlisi** (aturat el 18/10/2026 per decisió de l'usuari).
      Maqueta amb dades d'exemple (pàgines Resum i Participant):
      https://claude.ai/artifact/9ewDzHerFNAADYhYgQ6D79. Pla d'integració, sense
      migració: rutes `/analysis` i `/analysis/[participantId]` amb enllaç
      "Anàlisi" a la barra; càrrega al servidor (RLS ja filtra per usuari) i
      recàlcul de cada sessió amb `replay()`; mòdul pur `lib/analytics/` (fets
      per tram + rècords, medianes, tendència, distància al millor) amb tests;
      gràfics SVG propis com a components de client, sense llibreria. Només
      sessions completades; individual i equip per separat. Compte amb el
      límit de 1000 files de Supabase si es consulta `presses` directament, i
      amb el `max-w-3xl` del layout. Fases: 1) `lib/analytics` + Resum,
      2) Participant, 3) equip i accés des de resultats, 4) opcional, taula de
      trams desada si el volum ho demana.
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
- [ ] Opcional: canviar la contrasenya amb la sessió oberta (ara cal fer
      servir "Has oblidat la contrasenya?").
- [x] Especificació al dia (1.5).
- [x] Estil Apple a totes les pantalles; ROXZONE com a nom visible de TRANSITION.
- [x] Recuperar la contrasenya per correu (1.4).
- [x] Sense connexió (1.5) i icona de la pantalla d'inici.

## Proves locals
- `web/.env.local` (no és al git) amb SUPABASE_URL, SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY, GMAIL_USER, GMAIL_APP_PASSWORD.
- `npm --prefix web run dev -- -p 3100`, `npm --prefix web test` (42 tests,
  tots passen el 22/11/2026).
- Per provar sessions sense enviar correus reals: participant temporal amb
  l'adreça del Gmail de l'operador, i esborrar-lo després.
- Des de l'entorn de Claude les crides a Supabase amb `node` no arriben
  (es pengen); `curl` a hyrox.ddns.net sí que funciona.
