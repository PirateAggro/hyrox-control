# Desplegament a la Raspberry Pi

Hyrox Control s'executa a la mateixa Pi que Archer, **completament separat**:
carpeta pròpia, projecte de Docker propi (`hyrox-control`), port propi
(`127.0.0.1:3100`) i bloc de nginx propi (`hyrox.ddns.net`). Cap pas d'aquesta
guia modifica res d'Archer.

## Primera instal·lació

### 0. Nom de domini a No-IP
Crea el nom `hyrox.ddns.net` al compte de No-IP, apuntant a la mateixa IP
pública que `sherlocksq2.ddns.net`. Comprova que el client d'actualització de
la IP també l'actualitza.

> ⚠️ El pla gratuït de No-IP permet un nombre limitat de noms. Si ja estàs al
> límit, No-IP no et deixarà crear-ne un altre.

### 1. Clau de lectura per al repositori
El repositori és privat. GitHub no deixa fer servir la mateixa *deploy key* a
dos repositoris, així que Hyrox en necessita una de nova (la d'Archer no es
toca):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/hyrox_deploy -N "" -C "pi hyrox-control"
cat ~/.ssh/hyrox_deploy.pub
```

A GitHub: repositori `hyrox-control` → *Settings → Deploy keys → Add deploy
key*. Enganxa-hi la clau pública i **no** marquis *Allow write access*.

Afegeix això al final de `~/.ssh/config`:

```
Host github-hyrox
    HostName github.com
    User git
    IdentityFile ~/.ssh/hyrox_deploy
    IdentitiesOnly yes
```

### 2. Descarregar el projecte

```bash
cd ~
git clone git@github-hyrox:PirateAggro/hyrox-control.git
cd hyrox-control
```

### 3. Claus de Supabase

```bash
cp .env.example .env
nano .env
```

Omple `SUPABASE_URL`, `SUPABASE_ANON_KEY` i `SUPABASE_SERVICE_ROLE_KEY` amb
els valors del projecte Hyrox (els mateixos que `web/.env.local` al PC).

### 4. Construir i arrencar

```bash
./deploy.sh
```

Acaba mostrant `{"ok":true,"version":"..."}` amb el commit desplegat. La
primera construcció a la Pi triga uns minuts.

### 5. nginx

```bash
sudo cp deploy/nginx/hyrox.ddns.net.conf /etc/nginx/sites-available/hyrox.ddns.net
sudo ln -s /etc/nginx/sites-available/hyrox.ddns.net /etc/nginx/sites-enabled/
sudo nginx -t
```

**Continua només si `nginx -t` diu `syntax is ok` i `test is successful`.** Si
dona error, esborra l'enllaç (`sudo rm /etc/nginx/sites-enabled/hyrox.ddns.net`)
i no recarreguis: Archer continua funcionant amb la configuració anterior.

```bash
sudo systemctl reload nginx
```

`reload`, no `restart`: aplica la configuració nova sense tallar les connexions
d'Archer.

### 6. Certificat HTTPS

```bash
sudo certbot --nginx -d hyrox.ddns.net
```

Tria redirigir HTTP a HTTPS si t'ho pregunta. Només edita el fitxer de Hyrox.

### 7. Comprovació

```bash
curl -s https://hyrox.ddns.net/api/health
```

I obre https://hyrox.ddns.net al mòbil: ha de sortir la pantalla d'accés.

## Actualitzacions

```bash
cd ~/hyrox-control
./deploy.sh
```

## Si alguna cosa falla

```bash
docker compose logs web --tail 50
```

Totes les ordres de `docker compose` executades dins de `~/hyrox-control`
només afecten Hyrox.
