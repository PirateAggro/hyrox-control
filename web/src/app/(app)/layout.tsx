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
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <Link href="/" className="whitespace-nowrap font-semibold">
            Hyrox Control
          </Link>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm">
              {n.text}
            </Link>
          ))}
          <form action={signOut} className="ml-auto">
            <button className="text-sm text-muted underline">Sortir</button>
          </form>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}
