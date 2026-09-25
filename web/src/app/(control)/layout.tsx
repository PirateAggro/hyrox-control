/**
 * Pantalla de control a pantalla completa, sense la barra de navegació de
 * (app): sortir de la pàgina a mitja sessió la tanca (01 §1), així que no hi
 * ha d'haver enllaços que ho facin per accident.
 */
import { requireOperator } from "@/lib/auth";

export default async function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOperator();
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-4">{children}</main>
  );
}
