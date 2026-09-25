#!/usr/bin/env bash
# Hyrox Control — desplegament a la Raspberry Pi.
#
#     ./deploy.sh
#
# ⚠️ NOMÉS TOCA AQUEST PROJECTE. Totes les ordres de Docker passen per
# `docker compose` dins d'aquesta carpeta (projecte `hyrox-control`). No hi ha
# cap `docker system prune`, `docker rm` ni res que abasti altres projectes:
# Archer corre a la mateixa Pi i no s'ha de veure afectat.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "⚠️ Falta el fitxer .env amb les claus de Supabase (vegeu .env.example)."
  exit 1
fi

echo "── git pull"
git pull

# Un desplegament amb canvis sense desar gravaria un commit que no descriu el
# que s'executa. `git diff HEAD` només mira fitxers del git; .env no hi és.
if ! git diff --quiet HEAD; then
  echo
  echo "⚠️ ATURAT: hi ha canvis sense commit, i la versió no descriuria el que"
  echo "   s'executaria. Desa'ls o descarta'ls primer."
  git status --short
  exit 1
fi

HYROX_VERSION="$(git rev-parse --short HEAD)"
export HYROX_VERSION
echo
echo "── construint la versió ${HYROX_VERSION}"
docker compose up -d --build

echo
echo "── contenidors de hyrox-control"
docker compose ps

echo
echo "── comprovació (espera fins a 60 s que arrenqui)"
for _ in $(seq 1 30); do
  if curl -fs http://127.0.0.1:3100/api/health; then
    echo
    echo "✅ Ha de dir \"version\":\"${HYROX_VERSION}\"."
    exit 0
  fi
  sleep 2
done
echo "⚠️ /api/health no respon. Mira els registres amb: docker compose logs web"
exit 1
