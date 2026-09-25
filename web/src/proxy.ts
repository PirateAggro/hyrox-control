/**
 * Renovació de la sessió i redirecció a /login.
 *
 * ⚠️ Es diu `proxy.ts`, no `middleware.ts`: Next 16 va reanomenar la
 * convenció i un `middleware.ts` simplement no s'executaria.
 *
 * Dues feines:
 *  1. Renovar el token de Supabase, que caduca cada hora. Sense això l'operador
 *     quedaria desconnectat a mitja sessió (01 §1: "no pot caducar durant una
 *     prova").
 *  2. Enviar a /login qui no té sessió. És només una comoditat: la protecció
 *     real és `requireOperator()` a cada action i RLS a la base de dades.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/env";

const PUBLIC_PATHS = ["/login"];

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() és la crida que renova el token; no s'ha de treure.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // api/health queda fora: ha de respondre sense sessió i sense dependre de
    // Supabase, perquè el healthcheck de Docker no falli si Supabase no respon.
    "/((?!api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
