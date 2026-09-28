import Link from "next/link";
import { requireOperator } from "@/lib/auth";
import { SelectParticipants } from "./select-participants";
import { group, largeTitle } from "@/components/ui";

export default async function NewSessionPage() {
  const { supabase } = await requireOperator();
  const { data } = await supabase
    .from("participants")
    .select("id, name")
    .eq("active", true)
    .order("name");
  const participants = data ?? [];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <h1 className={largeTitle}>Nova sessió</h1>
      {participants.length === 0 ? (
        <p className={`${group} px-4 py-3 text-muted`}>
          No hi ha participants actius.{" "}
          <Link href="/participants" className="text-tint">
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
