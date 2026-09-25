import Link from "next/link";
import { requireOperator } from "@/lib/auth";
import { SelectParticipants } from "./select-participants";

export default async function NewSessionPage() {
  const { supabase } = await requireOperator();
  const { data } = await supabase
    .from("participants")
    .select("id, name")
    .eq("active", true)
    .order("name");
  const participants = data ?? [];

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold">Nova sessió</h1>
      {participants.length === 0 ? (
        <p className="text-muted">
          No hi ha participants actius.{" "}
          <Link href="/participants" className="underline">
            Crea&apos;n un
          </Link>
          .
        </p>
      ) : (
        <SelectParticipants participants={participants} />
      )}
    </div>
  );
}
