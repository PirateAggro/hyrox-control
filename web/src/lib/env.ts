/**
 * Configuració de Supabase, llegida en temps d'execució.
 *
 * Sense el prefix NEXT_PUBLIC_ a propòsit: Next.js incrusta les variables
 * NEXT_PUBLIC_* dins el codi quan fa `npm run build`, i llavors les claus
 * quedarien dins la imatge de Docker. Aquestes només les fa servir el servidor
 * (el navegador no parla mai amb Supabase), així que es llegeixen quan
 * l'aplicació arrenca, des de l'`env_file` de docker-compose o de `.env.local`.
 */
export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey)
    throw new Error(
      "Falten SUPABASE_URL o SUPABASE_ANON_KEY (web/.env.local en local, .env a la Pi).",
    );
  return { url, anonKey };
}

/**
 * Adreça pública de l'aplicació, per als enllaços dels correus (recuperar la
 * contrasenya). Es fixa aquí i no es treu de la petició: una capçalera Host
 * falsa podria fer que l'enllaç apuntés a un altre lloc. En local:
 * SITE_URL=http://localhost:3100 a web/.env.local.
 */
export function siteUrl() {
  return (process.env.SITE_URL ?? "https://hyrox.ddns.net").replace(/\/$/, "");
}
