
# 01_Functional_Specification.md

# Hyrox Controller System (Hyrox Control)
## Functional Specification

**Version:** 1.1 (28/09/2026) — reflecteix l'aplicació en producció

---

# 1. Objectiu

Hyrox Control és una aplicació web que s'executa en un servidor segur (HTTPS) instal·lat en una Raspberry Pi 5 accessible per internet a **https://hyrox.ddns.net**. Es fa servir des del navegador del mòbil i cronometra els temps de cada una de les estacions de Hyrox, el temps entre estacions (Roxzone) i els trams de córrer (Run).

L'objectiu és recopilar tots els temps per participant en una base de dades Supabase, que en manté l'històric, i enviar per correu electrònic un arxiu CSV amb els resultats als participants, un cop l'operador ho confirma (§7).

## Pulsacions i connexió

Cada pulsació es guarda a Supabase en el moment de prémer-la, amb l'hora del servidor de la Raspberry Pi. Els temps no es guarden: es calculen a partir de les pulsacions.

**Tall de connexió.** Hi ha tall quan una pulsació no es pot guardar, sigui quin sigui el motiu (mòbil, Raspberry Pi o Supabase). En aquest cas apareix l'avís "Sense connexió" i la sessió es tanca. Les pulsacions ja guardades es conserven; la resta es perden. No s'envia correu.

Una recàrrega de la pàgina durant una sessió també la tanca. En tornar a l'inici de l'aplicació, qualsevol sessió començada que hagi quedat oberta es tanca.

Mentre hi ha una sessió en curs, la pantalla del mòbil es manté encesa.

Si no hi ha connexió en començar, l'aplicació no s'obre.

## Estat de la sessió

- **Completada:** té guardada la pulsació de HYROX FINISHED.
- **Interrompuda:** s'ha tancat per un tall o una recàrrega, sense HYROX FINISHED.
- **En curs:** encara no s'ha acabat ni tancat.

## Accés i seguretat

- L'aplicació només és accessible per HTTPS.
- Hi ha un únic compte d'operador (email i contrasenya, via Supabase Auth), amb accés total a totes les funcions i dades. L'operador és qui controla l'aplicació; els participants (§3) són qui fa l'exercici i no hi tenen accés.
- No hi ha formulari de registre: el compte d'operador es crea des del panell de Supabase, i el registre de comptes nous hi està desactivat.
- La sessió de l'operador es renova automàticament i no pot caducar durant una prova.
- El navegador no accedeix mai directament a Supabase: totes les dades passen pel servidor de la Raspberry Pi.
- Protecció de dades: els emails dels participants només els veu l'operador. Cada participant rep el seu correu per separat.
- Projecte Supabase propi. El servidor hi fa una consulta diària perquè el pla gratuït no el pausi per inactivitat.

---

# 2. Flux funcional global

Pantalla d'accés (email i contrasenya de l'operador)

```
Master Data (participants i estacions)
   ↓
Nova sessió: selecció de participants i ordre
   ↓
Pantalla de Control → START
   ↓
Estació 1
   ↓
ROXZONE i/o RUN, o NEXT STATION, o CHANGE STATION   (PAUSA en qualsevol moment)
   ↓
Estació 2
   ↓
....
   ↓
Finalització (botó HYROX FINISHED + confirmació YES)
   ↓
Resultats → enviament del correu a cada participant, amb confirmació
```

---

# 3. Participants (Master Data)

## Objectiu

Tenir el llistat de participants i el manteniment: crear-ne de nous, modificar-los o desactivar-los. Els participants no s'esborren, perquè se'n conservi l'històric.

## Dades

- Nom del participant (persona que fa el Hyrox)
- Email del participant

## Procés

- Valida que no existeixi ja un participant amb el mateix nom (sense distingir majúscules ni espais; inclou els inactius).
- Valida que l'email tingui un format correcte.
- A la llista, tocar un participant obre la seva pantalla d'edició, on també es pot desactivar o tornar a activar.
- Un participant desactivat no surt a la selecció de noves sessions, però es conserven els seus resultats.

## Outputs

- Missatge de participant creat / modificat / desactivat.

## 3.1 Estacions (Master Data)

## Objectiu

Llistat de totes les estacions. Per defecte hi ha les 8 estacions de Hyrox, però es poden afegir, modificar, desactivar o esborrar.

Per a cada estació es mantenen:

- **Nom**
- **Ordre:** número que indica l'ordre d'execució. Dues estacions actives no poden tenir el mateix número. L'última prova és la de número d'ordre més alt.
- **Distància** i **Pes:** dades descriptives. Es mostren a la pantalla de control sota el nom de l'estació (per exemple "1000 m - 25 kg"). Si no n'hi ha, no es mostren.

A la llista, tocar una estació obre la seva pantalla d'edició, on es pot desactivar o esborrar. Una estació només es pot esborrar si no té sessions guardades; si en té, només es pot desactivar.

Cada sessió guarda l'ordre de les estacions actives en el moment de crear-la: si després es modifiquen les estacions, les sessions ja creades no canvien.

---

# 4. Nova sessió (selecció de participants)

## Objectiu

Abans de l'inici del control, cal seleccionar el participant o participants de la sessió.

Es mostra la llista de participants actius. Tocar un participant l'afegeix a la selecció amb el número d'ordre següent; tornar-lo a tocar el treu i la resta es renumeren. L'ordre de selecció és l'ordre en què faran les proves.

- Un sol participant: mode **Individual**.
- Més d'un participant: mode **Equip**.

## Procés

Un cop seleccionats els participants i l'ordre, es passa a la pantalla de control.

---

# 5. Pantalla de control

## Objectiu

És la pantalla clau: mostra i controla els temps de cada estació, Roxzone i Run.

## Disseny

Estil Apple (iOS), pensat per fer-se servir amb el mòbil mentre es corre:

- A dalt, dos cronòmetres: **Total** i el temps de la **fase actual** (Estació, Roxzone, Run o "En pausa").
- A sota, en una sola línia: número i nom de l'estació, distància i pes (per exemple `1 · SkiErg · 1000 m - 25 kg`).
- Els participants, un sota l'altre, cadascun amb el seu temps a l'estació actual. El participant actiu es marca amb una vora verda.
- Cinc botons a tota l'amplada, un sota l'altre, cadascun d'un color:

| Botó | Color | Nom intern |
|---|---|---|
| ROXZONE | Taronja | TRANSITION |
| RUN | Verd | RUN |
| NEXT STATION | Blau | NEXT_STATION |
| CHANGE STATION | Lila | CHANGE_STATION |
| PAUSA / CONTINUAR | Gris / Groc | PAUSE / RESUME |

- HYROX FINISHED: botó vermell en forma de píndola, a baix de tot.
- **Color de fons:** en prémer un dels cinc botons, el fons de la pantalla pren un to suau del color d'aquell botó. En continuar després d'una pausa, torna el color d'abans.
- **Bips de confirmació:**
  - START i els cinc botons: un bip agut.
  - Canvi de participant: dos bips més greus.
  - A l'iPhone, amb l'interruptor de silenci activat, el navegador no fa sonar els bips.

## Procés

Es comença a comptar el temps quan es prem el botó **START**. El Hyrox comença a la primera estació, amb el participant número 1 (no hi ha run ni roxzone inicials).

El temps es compta en 3 nivells:

- Participant – Estació
- Equip – Estació (en mode Equip)
- Total Hyrox (suma de totes les estacions, roxzones i runs)

**Canvi de participant.** En mode Equip, en prémer el nom d'un altre participant finalitza el comptador del participant actual a l'estació i comença el del nou, i segueixen comptant Equip – Estació i Total. L'ordre definit inicialment és només indicatiu. Dins d'una mateixa estació els participants es poden alternar diverses vegades: el temps d'un participant que torna a entrar s'acumula. Durant una Roxzone o un Run no es pot canviar de participant.

Quan s'acaba una estació es pot prémer ROXZONE, RUN, NEXT STATION o CHANGE STATION.

**ROXZONE** (intern: TRANSITION):
- Finalitza el comptador del participant actual a l'estació i el d'Equip – Estació.
- Segueix el Total.
- Comença el comptador de Roxzone, associat a l'estació ("Roxzone – SkiErg").
- La Roxzone no es compta per participant, només per a l'equip.

**RUN:**
- Finalitza el comptador de l'estació (si es prem directament des de l'estació) o el de la Roxzone (si es prem després de ROXZONE).
- Segueix el Total.
- Comença el comptador de Run, associat a l'estació ("Run – SkiErg").
- Des d'un RUN es pot tornar a ROXZONE: el temps s'acumula a la Roxzone de la mateixa estació.

**NEXT STATION:** passa a l'estació següent segons l'ordre, començant pel participant número 1. El botó mostra el nom de l'estació següent sota el text.

**CHANGE STATION:** mostra la llista de totes les estacions de la sessió (amb distància i pes) i l'operador tria la següent, que comença pel participant número 1. A partir d'aquí l'ordre continua de manera seqüencial. Les estacions que no es facin no hi seran. Es pot triar una estació anterior: en aquest cas s'acumulen els temps de l'estació i de la seva Roxzone i Run.

**On va el temps del canvi.** Cada pulsació tanca el tram que estava obert:

- Si NEXT STATION o CHANGE STATION es premen des d'una Roxzone o un Run, el temps fins a la pulsació (inclòs el que es triga a triar l'estació a CHANGE STATION) queda a aquella Roxzone o aquell Run.
- Si es premen directament des de l'estació, el temps queda a l'estació.

**PAUSA / CONTINUAR:**
- PAUSA atura tots els comptadors, també el Total. El temps de pausa no compta enlloc.
- Mentre està en pausa, el botó mostra "CONTINUAR" en groc i el fons es posa gris. Només es pot prémer CONTINUAR o HYROX FINISHED.
- CONTINUAR torna exactament on era: la mateixa fase, estació i participant.

**Última estació** (la de número d'ordre més alt): només es pot prémer HYROX FINISHED i PAUSA. En mode Equip els botons de participant continuen actius.

**HYROX FINISHED:** demana confirmació. Amb YES s'aturen tots els comptadors i la sessió queda completada, sigui quina sigui l'estació on s'estigui. Amb NO es continua. Després es mostra la pantalla de resultats (§7).

No hi ha botó per desfer pulsacions.

## Resultats

En una sessió sense CHANGE STATION, en mode Equip amb 2 participants, s'obtenen aquests temps parcials i totals:

```
USUARI 1 - PROVA 1
USUARI 2 - PROVA 1
EQUIP - PROVA 1
ROXZONE - PROVA 1
RUN - PROVA 1
USUARI 1 - PROVA 2
USUARI 2 - PROVA 2
EQUIP - PROVA 2
ROXZONE - PROVA 2
RUN - PROVA 2
... (igual per a les proves 3 a 7)
USUARI 1 - PROVA 8
USUARI 2 - PROVA 8
EQUIP - PROVA 8
USUARI 1 - TOTAL PROVES
USUARI 2 - TOTAL PROVES
TOTAL HYROX
```

En mode Individual:

```
USUARI 1 - PROVA 1
ROXZONE - PROVA 1
RUN - PROVA 1
... (igual per a les proves 2 a 7)
USUARI 1 - PROVA 8
TOTAL HYROX
```

Les línies de Roxzone i Run només hi surten si s'han fet. A la pantalla els temps es mostren truncats al segon (com un cronòmetre); al CSV hi ha els segons exactes.

---

# 6. Base de dades

Supabase (PostgreSQL). Taules:

- **participants:** nom, email, actiu.
- **stations:** nom, ordre, distància, pes, activa.
- **sessions:** mode, dia i hora d'inici, ordre de les estacions de la sessió, moment de tancament (tall o recàrrega) i estat del correu de cada participant.
- **session_participants:** participants de la sessió i el seu ordre.
- **presses:** pulsacions (tipus, número dins la sessió, participant, estació, hora del servidor). Una pulsació reenviada no es pot guardar dues vegades.

Tots els temps es calculen a partir de les pulsacions. Només l'operador autenticat hi té accés. Els canvis d'esquema es fan amb fitxers de migració (`supabase/migrations/`), que s'apliquen des de l'editor SQL del panell de Supabase abans de desplegar el codi que els necessita.

---

# 7. Correu i CSV

En acabar una sessió **no s'envia cap correu automàticament**. La pantalla de resultats llista cada participant amb el seu email i un botó **Enviar**. En prémer-lo apareix una pregunta de verificació ("Enviar els resultats a …?", amb l'adreça) i només s'envia si l'operador confirma. Després la fila mostra "✓ Enviat" amb la data i l'hora, i el botó passa a "Reenviar".

- Cada participant rep un correu propi (ningú no veu l'adreça dels altres), amb els resultats de tota la sessió al text i el CSV adjunt.
- El correu surt del compte de Gmail configurat al servidor (contrasenya d'aplicació).
- Les sessions interrompudes no envien correu.

**Format del CSV** (pensat per obrir-se amb Excel en català o castellà):

- Separador `;`, decimals amb coma, UTF-8 amb BOM.
- Columnes: `Tipus;Participant;Estació;Segons;Temps`.
- Tipus: Prova, Equip, Roxzone, Run, Total proves, Total Hyrox.
- Segons amb mil·lèsimes (per exemple `21,653`) i temps en format de cronòmetre (`0:21`).

---

# 8. Desplegament

- Raspberry Pi 5, a la mateixa màquina que Archer però completament independent: projecte Docker propi (`hyrox-control`), port `127.0.0.1:3100` (no accessible des de fora) i bloc de nginx propi.
- Domini **hyrox.ddns.net** (No-IP), amb certificat HTTPS de Let's Encrypt (certbot, renovació automàtica).
- Codi a GitHub (repositori privat). L'operador desplega a la Pi amb `./deploy.sh`, que mostra la versió desplegada. Guia: `deploy/README.md`.
- Les claus (Supabase i Gmail) només són al fitxer `.env` de la Pi i al `web/.env.local` del PC; no es pugen mai al repositori.

---

# Historial de canvis

**1.1 (28/09/2026)**
- TRANSITION es mostra com a **ROXZONE** (internament continua sent TRANSITION).
- Botó **PAUSA / CONTINUAR**: atura tots els comptadors, també el total.
- Bips de confirmació, diferents per als botons i per al canvi de participant.
- El fons de la pantalla pren el color de l'últim botó premut.
- Distància i pes de l'estació a la pantalla de control.
- El correu ja no s'envia automàticament: cal confirmar-lo per a cada participant.
- Sense botó de desfer.
- Domini hyrox.ddns.net (No-IP + nginx + certbot) en lloc de Cloudflare.
- Disseny estil Apple a totes les pantalles; desactivar i esborrar es fan des de la pantalla d'edició.
