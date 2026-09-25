import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Inici</h1>
      <p className="text-muted">
        La sessió de cronometratge arriba a la fase 2. Ara mateix es poden
        mantenir les dades mestres.
      </p>
      <div className="flex gap-3">
        <Link
          href="/participants"
          className="rounded-md border border-border px-4 py-3"
        >
          Participants
        </Link>
        <Link
          href="/stations"
          className="rounded-md border border-border px-4 py-3"
        >
          Estacions
        </Link>
      </div>
    </div>
  );
}
