/**
 * S'executa un cop en arrencar el servidor de Next.js.
 */
export async function register() {
  // Només al servidor Node (no a l'entorn "edge").
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startKeepalive } = await import("@/lib/keepalive");
    startKeepalive();
  }
}
