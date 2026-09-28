/**
 * Marc de l'app per a l'operador. El grup `(app)` no apareix a la URL; serveix
 * perquè /login quedi fora i no tingui la barra de navegació.
 */
import Link from "next/link";
import { requireOperator } from "@/lib/auth";
import { signOut } from "../login/actions";

const NAV = [
  { href: "/participants", text: "Participants" },
  { href: "/stations", text: "Estacions" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOperator();

  return (
    <>
      {/* Barra translúcida com la d'iOS, fixa a dalt en fer scroll. */}
      <header className="sticky top-0 z-10 border-b border-separator bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <Link
            href="/"
            className="whitespace-nowrap text-[17px] font-semibold"
          >
            Hyrox Control
          </Link>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-[15px] text-tint">
              {n.text}
            </Link>
          ))}
          <form action={signOut} className="ml-auto">
            <button className="text-[15px] text-tint">Sortir</button>
          </form>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        {children}
      </main>
    </>
  );
}
