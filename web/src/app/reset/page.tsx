import Link from "next/link";
import { resetPassword } from "../login/actions";
import { AuthForm } from "../login/auth-form";

/**
 * Enllaç del correu de recuperació. Només mostra el formulari: el token es
 * valida en desar, no en obrir la pàgina (els antivirus del correu obren els
 * enllaços i el gastarien).
 */
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>;
}) {
  const { token_hash } = await searchParams;
  if (!token_hash)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-5 text-center">
        <p className="text-[17px]">Aquest enllaç no és vàlid.</p>
        <Link href="/forgot" className="text-[17px] text-tint">
          Demanar-ne un de nou
        </Link>
      </main>
    );
  return (
    <AuthForm mode="reset" action={resetPassword.bind(null, token_hash)} />
  );
}
