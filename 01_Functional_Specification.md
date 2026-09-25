
# 01_Functional_Specification.md

# Hyrox Controller System (Hyrox Control)
## Functional Specification

**Version:** 1.0-draft

---

# 1. Objectiu

Hyrox Control és una aplicació que s'instal.larà en un web server segur que està en una  Raspberry Pi 5 (remota accessible via internet) i monitoritza els temps dedicats a cada una de les estacions de Hyrox, mesura també el temps entre estacions (transicions) i la prova entre estacions de córrer. 
L'objectiu es recopilar tots els temps per usuari a una base de dades "supabase" i enviar per correu electrònic un arxiu csv en finalitzar la prova als participants. La base de dades mantindrà un històric de les proves


Cada pulsació es guarda a Supabase en el moment de prémer-la.

Tall de connexió. Hi ha tall quan una pulsació no es pot guardar, sigui quin sigui el motiu (mòbil, Raspberry Pi o Supabase). En aquest cas apareix l'avís "sense connexió" i la sessió es tanca. Les pulsacions ja guardades es conserven; la resta es perden. No s'envia correu.
Una recàrrega de la pàgina durant una sessió també la tanca. Mentre hi ha una sessió en curs, la pantalla del mòbil es manté encesa.

Estat de la sessió. Una sessió és "completada" si té guardada la pulsació de HYROX FINISHED; si no, és "interrompuda".

HYROX FINISHED. En confirmar amb YES, la sessió s'acaba a la prova on s'estigui, queda completada i s'envia el correu als participants.

Si no hi ha connexió en començar, l'aplicació no s'obre.

Hi ha un únic compte d'operador (email i contrasenya), amb accés total a totes les funcions i dades. L'operador és qui controla l'aplicació; els participants (§3) són qui fa l'exercici.

Projecte supabase propi
Subdomini de Cloudflare propi a la mateixa Pi.
Protecció de dades: els emails dels participants només els ha de poder veure l'operador.

---

# 2. Flux funcional global

Pantalla inici d'acces (usuari i pwd)

```
Master Data (usuaris i proves)
   ↓
Selecció usuaris
   ↓
Pantalla de Control
   ↓
Inici Prova 1
   ↓
Transició 1 i/o RUN 1 i/o Change Station i/o Next Station
   ↓
Inici Prova 2
   ↓
....
   ↓
Finalització estacions (amb botó HYROX FINISHED)
   ↓
Enviament dades a l'usuari(PARTICIPANTS)

```


---

# 3. User Master Data

## Objectiu

Tenir el llistat d'usuaris i el manteniment (poder crear-ne de nous / modificar o deixar-lo inactiu per mantenir històric)

## Dades Master Data

- Nom de l'usuari (persona que fa el hyrox)
- email (persona que fa el hyrox)

## Procés

- Valida que l'usuari no existeix ja si es vol crear amb el mateix nom
- Valida email és correcte

## Outputs

- Missatge d'usuari creat / Modificat o inactivar amb èxit



## 3.1 Proves Master Data

## Objectiu

Llistat de totes les proves. 
En principi seràn fixes, però millor incloure possibilitat d'afegir-ne / modificar o inactivar

Per cada prova s'han de mantenir dues dades : DISTANCE i WEIGHT
Son dues dades purament descriptives

Cal mantenir un numero que sigui l'ordre en que s'executaran les proves.

---

# 4. Selecció 

## Objectiu

Abans de l'inici del control, cal seleccionar l'usuari o usuaris que participen en la prova.

Cal mostrar la llista d'usuaris amb la possiblitat de seleccionar-ne un (en aquest cas serà el mode "Individual"), o més d'un i serà el mode "Equip"

Quan sigui més d'un usuari, cal definir l'ordre en que aniran fent les proves. Per tant a la selecció d'usuaris cal incorporar un número que digui aquest ordre

## Procés

Un cop seleccionats els usuaris participants i l'ordre es passarà a la pantalla de control 

---

# 5. Pantalla de control

## Objectiu

Aquesta és la pantalla clau que mostrarà el temps per prova o transició


## Inputs

- Numero i identitat dels usuaris participants Caldrà mostrar tants botons com usuaris seleccionats segons l'ordre establert

## Outputs 

- Prova en proces (seguint l'ordre establert, però amb possibilitat de canviar-lo)
- Temps parcial per participant / per equip de la prova en proces i temps total de l'equip fins finalitzar totes les proves.


## Procés
Començarà a comptar el temps quan es premi el botó START. En aquest moment es comptarà aquest temps en 3 nivells.

El Hyrox comença amb la prova 1 (no run i no transition inicials)

- Usuari 1 - Prova 1  (definits prèviament)
- Equip - Prova 1 (si no es mode individual cal mantenir temps de l'equip). 
- Equip - Hyrox (temps total fins acabar totes les proves / transicions i correr)

En el cas de més d'un usuari, quan es premi el nom del seguent usuari. Es mostren tots els usuaris. L'ordre definit inicialment es només indicatiu.
- Finalitza el comptador de Usuari 1 - Prova 1 i comença el comptador de l'usuari 2 - Prova 1 i seguirà comptant el temps Equip-Prova 1 i Equip - Hyrox

Atencio! dins d'una mateixa prova es poden alternar diverses vegades a la mateixa estació. El temps d'un usuari que torna a entrar s'acumula.

Quan s'acabi la prova 1, l'usuari pot premer qualsevol dels 4 botons següents : "TRANSITION" o "RUN" o "NEXT STATION" o "CHANGE STATION": 

Si prem el boto "TRANSITION". En aquest moment:

- Finalitza el comptador de Usuari actual(el que estigui seleccionat) - Prova 1 
- Finalitza el comptador de Equip - Prova 1
- Segueix el comptador de Equip - Hyrox 
- comença el comptador de Equip - TRANSITION (associat a la prova 1, per tant podem usar la nomenclatura TRANSITION-Nom prova1)

La TRANSITION de cada prova no es mante a nivell de cada usuari. Només per calcular el temps total invertit en el Hyrox

Si prem el boto "RUN". En aquest moment:
- Finalitza el comptador de Usuari actual(el que estigui seleccionat) - Prova 1 (si ve de TRANSITION aquest comptador ja estava aturat)
- Finalitza el comptador de Equip - Prova 1 o Transition 1 (depenent de si es prem RUN directament des de la prova o des de TRANSITION)
- Segueix el comptador de Equip - Hyrox 
- comença el comptador de Equip - RUN (associat a la prova 1, per tant podem usar la nomenclatura RUN - Nom prova1)

no es pot fer RUN --> TRANSITION


Si prem el boto CHANGE STATION. En aquest cas se li ha de mostrar una pantalla amb totes les proves i ell seleccionarà la seguent. En aquest cas, l'ordre serà sequencial a partir de la prova seleccionada.L'usuari número 1 de l'ordre. Les proves que no s'executin no comptaràn a nivell de temps. Simplement no hi seran. Es pot triar una prova anterior. En aquest cas s'acumularan els temps de la prova, i de la TRANSITION o RUN de la prova corresponent.
El temps necessari per fer aquest canvi, s'associarà a "TRANSITION" o "RUN" de la prova anterior. Es a dir, si es prem CHANGE STATION des de la prova 3, s'inclourà a "TRANSITION - Prova 3" o a "RUN - Prova 3"
No es pot tornar enrere després d'haver fet l'última prova.

Si prem el boto NEXT STATION. En aquest cas cal seguir l'ordre sequencial segons la definició inicial de les proves. L'usuari número 1 de l'ordre.
El temps necessari per fer aquest canvi, s'associarà a "TRANSITION" o "RUN". Es a dir, si es prem NEXT STATION des de la prova 3, s'inclourà a "TRANSITION - Prova 3" o a "RUN - Prova 3".

si NEXT STATION o CHANGE STATION són premuts sense passar per TRANSITION o RUN, el temps s'assigna a la prova que s'estava fent.

així serà el loop fins arribar a la darrera prova (la que te el numero més alt).
A l'última prova només es pot prémer HYROX FINISHED. En mode equip, els botons de participant continuen actius.

Al costat del boto START caldrà que hi hagi el de "HYROX FINISHED". 
En premer aquest boto cal una pantalla de confirmació i si es prem YES aturarà tots els comptadors i es dona per acabada la sessió (completada). Si no es continuarà amb els comptadors.


En un proces sense "CHANGE STATION" per a 2 usuaris, al final es tindran els seguents temps parcials i totals

USUARI 1 - PROVA 1
USUARI 2 - PROVA 1
EQUIP - PROVA 1
EQUIP - TRANSICIO PROVA 1
EQUIP - RUN PROVA 1
USUARI 1 - PROVA 2
USUARI 2 - PROVA 2
EQUIP - PROVA 2
EQUIP - TRANSICIO PROVA 2
EQUIP - RUN PROVA 2
USUARI 1 - PROVA 3
USUARI 2 - PROVA 3
EQUIP - PROVA 3
EQUIP - TRANSICIO PROVA 3
EQUIP - RUN PROVA 3
USUARI 1 - PROVA 4
USUARI 2 - PROVA 4
EQUIP - PROVA 4
EQUIP - TRANSICIO PROVA 4
EQUIP - RUN PROVA 4
USUARI 1 - PROVA 5
USUARI 2 - PROVA 5
EQUIP - PROVA 5
EQUIP - TRANSICIO PROVA 5
EQUIP - RUN PROVA 5
USUARI 1 - PROVA 6
USUARI 2 - PROVA 6
EQUIP - PROVA 6
EQUIP - TRANSICIO PROVA 6
EQUIP - RUN PROVA 6
USUARI 1 - PROVA 7
USUARI 2 - PROVA 7
EQUIP - PROVA 7
EQUIP - TRANSICIO PROVA 7
EQUIP - RUN PROVA 7
USUARI 1 - PROVA 8
USUARI 2 - PROVA 8
EQUIP - PROVA 8
USUARI 1 - TOTAL PROVES 
USUARI 2 - TOTAL PROVES
EQUIP - TOTAL HYROX

En mode individual 

USUARI 1 - PROVA 1
EQUIP 1 - TRANSICIO PROVA 1
EQUIP 1 - RUN PROVA 1
USUARI 1 - PROVA 2
EQUIP 1 - TRANSICIO PROVA 2
EQUIP 1 - RUN PROVA 2
USUARI 1 - PROVA 3
EQUIP 1 - TRANSICIO PROVA 3
EQUIP 1 - RUN PROVA 3
USUARI 1 - PROVA 4
EQUIP 1 - TRANSICIO PROVA 4
EQUIP 1 - RUN PROVA 4
USUARI 1 - PROVA 5
EQUIP 1 - TRANSICIO PROVA 5
EQUIP 1 - RUN PROVA 5
USUARI 1 - PROVA 6
EQUIP 1 - TRANSICIO PROVA 6
EQUIP 1 - RUN PROVA 6
USUARI 1 - PROVA 7
EQUIP 1 - TRANSICIO PROVA 7
EQUIP 1 - RUN PROVA 7
USUARI 1 - PROVA 8

si no hi ha hagut "CHANGE STATION"


# 6. DATABASE

Totes les dades de temps cal que s'emmagatzemin en una BDD supabase, guardant també el dia i hora d'execució 

