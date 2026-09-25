/**
 * Estat del servidor, sense autenticació i sense dades: només diu que el
 * procés respon i quin commit s'està executant. El fan servir el healthcheck
 * de Docker i l'operador per confirmar que un desplegament ha arribat
 * (`HYROX_VERSION` el posa `deploy.sh` en construir la imatge).
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    ok: true,
    version: process.env.HYROX_VERSION ?? "dev",
  });
}
