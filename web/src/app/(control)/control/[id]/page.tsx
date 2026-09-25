import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth";
import { loadSession } from "@/lib/sessions";
import { SessionSummary } from "@/components/session-summary";
import { Control } from "./control";
import { clock } from "@/lib/clock";
import { EmailStatus } from "./email-status";

export default async function ControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireOperator();
  const session = await loadSession(supabase, id);
  if (!session) notFound();

  if (session.status !== "en curs")
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Sessió {session.status}</h1>
        <SessionSummary session={session} />
        {session.status === "completada" && (
          <EmailStatus
            sessionId={session.id}
            sentAt={session.emailSentAt}
            error={session.emailError}
          />
        )}
        <Link href="/" className="text-center underline">
          Tornar a l&apos;inici
        </Link>
      </div>
    );

  return <Control session={session} serverNow={clock()} />;
}
