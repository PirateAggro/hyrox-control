# Hyrox Control — imatge de l'aplicació web (Raspberry Pi 5, arm64).
#
# ⚠️ AQUESTA IMATGE NO CONTÉ CAP CLAU. Les variables de Supabase no porten el
# prefix NEXT_PUBLIC_ i el codi les llegeix en temps d'execució
# (src/lib/env.ts); arriben per l'`env_file` de docker-compose quan el
# contenidor arrenca. No afegeixis mai claus com a ARG: queden gravades a la
# imatge i `docker history` les mostra.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

# Commit desplegat, per a /api/health. No és cap secret; el passa deploy.sh.
ARG HYROX_VERSION=unknown
ENV HYROX_VERSION=$HYROX_VERSION

# Usuari sense privilegis que ja porta la imatge de node.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
