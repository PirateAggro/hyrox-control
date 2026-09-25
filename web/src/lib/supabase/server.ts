/**
 * Client de Supabase per al servidor (Server Components i Server Actions).
 *
 * El navegador no parla mai amb Supabase (01 §1, "Accés"): totes les dades
 * passen per aquest client, que viu al servidor de la Raspberry Pi i porta la
 * sessió de l'operador a les cookies. Les polítiques RLS només obren les
 * taules al rol `authenticated`, així que sense sessió no es llegeix res.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Des d'un Server Component les cookies són de només lectura.
            // No passa res: `proxy.ts` renova la sessió a cada petició.
          }
        },
      },
    },
  );
}
