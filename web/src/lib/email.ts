/**
 * Enviament dels resultats per correu (01 §1), des d'un compte de Gmail amb
 * contrasenya d'aplicació.
 *
 * ⚠️ UN CORREU PER PARTICIPANT, I NOMÉS SI L'OPERADOR HO CONFIRMA. En acabar
 * la sessió no s'envia res sol: la pantalla de resultats pregunta per cada
 * participant abans d'enviar-li el correu. Cadascú rep el seu (01 §1: "els
 * emails dels participants només els ha de poder veure l'operador"), amb el
 * CSV complet de la sessió.
 */
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSession, type EmailLog } from "@/lib/sessions";
import { replay } from "@/lib/timing/engine";
import { formatDuration, summaryRows } from "@/lib/timing/summary";
import { toCsv } from "@/lib/timing/csv";

export function mailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

const madrid = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString("ca-ES", { timeZone: "Europe/Madrid", ...opts });

export type SendResult = { ok: boolean; error?: string };

/**
 * Envia els resultats d'una sessió completada a UN participant i en deixa
 * constància a `sessions.email_log[participantId]`. No llança: retorna el
 * resultat.
 */
export async function sendSessionEmailTo(
  sessionId: string,
  participantId: string,
): Promise<SendResult> {
  const db = createAdminClient();

  const record = async (entry: EmailLog[string]) => {
    const { data } = await db
      .from("sessions")
      .select("email_log")
      .eq("id", sessionId)
      .single();
    const log = {
      ...((data?.email_log as EmailLog) ?? {}),
      [participantId]: entry,
    };
    await db.from("sessions").update({ email_log: log }).eq("id", sessionId);
  };
  const fail = async (error: string): Promise<SendResult> => {
    await record({ sentAt: null, error }).catch(() => {});
    return { ok: false, error };
  };

  try {
    if (!mailConfigured())
      return fail(
        "El correu no està configurat (GMAIL_USER / GMAIL_APP_PASSWORD).",
      );

    const s = await loadSession(db, sessionId);
    if (!s) return { ok: false, error: "Sessió no trobada." };
    // 01 §1: una sessió interrompuda no envia correu.
    if (s.status !== "completada")
      return { ok: false, error: `La sessió està ${s.status}.` };
    if (!s.ctx.participants.includes(participantId))
      return { ok: false, error: "Aquest participant no és de la sessió." };

    const { data: person } = await db
      .from("participants")
      .select("name, email")
      .eq("id", participantId)
      .single();
    if (!person) return fail("Participant no trobat.");

    const { totals } = replay(s.presses, s.ctx);
    const names = {
      participants: s.participantNames,
      stations: s.stationNames,
    };
    const rows = summaryRows(totals, s.ctx, names, s.mode);
    const day = madrid(s.startedAt, { dateStyle: "short" });
    const stamp = madrid(s.startedAt, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).replace(/\D+/g, "");
    const table = rows
      .map((r) => `${r.label}: ${formatDuration(r.ms)}`)
      .join("\n");

    const user = process.env.GMAIL_USER!;
    await nodemailer
      .createTransport({
        service: "gmail",
        auth: { user, pass: process.env.GMAIL_APP_PASSWORD },
      })
      .sendMail({
        from: `Hyrox Control <${user}>`,
        to: person.email,
        subject: `Hyrox – resultats del ${day}`,
        text:
          `Hola ${person.name},\n\n` +
          `Aquí tens els resultats de la sessió Hyrox del ${day}. ` +
          `El detall amb els temps exactes és al fitxer CSV adjunt.\n\n` +
          `${table}\n`,
        attachments: [
          {
            filename: `hyrox-${stamp}.csv`,
            content: toCsv(rows, names),
            contentType: "text/csv; charset=utf-8",
          },
        ],
      });

    await record({ sentAt: new Date().toISOString(), error: null });
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
