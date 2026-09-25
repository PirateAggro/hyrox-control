/**
 * Enviament dels resultats per correu (01 §1), des d'un compte de Gmail amb
 * contrasenya d'aplicació.
 *
 * ⚠️ UN CORREU PER PARTICIPANT. 01 §1: "els emails dels participants només els
 * ha de poder veure l'operador". Un sol correu amb tots els destinataris
 * ensenyaria les adreces dels altres; cadascú rep el seu, amb el CSV complet
 * de la sessió.
 */
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSession } from "@/lib/sessions";
import { replay } from "@/lib/timing/engine";
import { formatDuration, summaryRows } from "@/lib/timing/summary";
import { toCsv } from "@/lib/timing/csv";

export function mailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

const madrid = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString("ca-ES", { timeZone: "Europe/Madrid", ...opts });

export type SendResult = { ok: boolean; sent: number; error?: string };

/**
 * Envia els resultats d'una sessió completada i en deixa constància a
 * `sessions.email_sent_at` / `email_error`. No llança: retorna el resultat.
 */
export async function sendSessionEmail(sessionId: string): Promise<SendResult> {
  const db = createAdminClient();
  const record = async (error: string | null) => {
    await db
      .from("sessions")
      .update(
        error
          ? { email_error: error }
          : { email_sent_at: new Date().toISOString(), email_error: null },
      )
      .eq("id", sessionId);
  };

  try {
    if (!mailConfigured()) {
      const error =
        "El correu no està configurat (GMAIL_USER / GMAIL_APP_PASSWORD).";
      await record(error);
      return { ok: false, sent: 0, error };
    }

    const s = await loadSession(db, sessionId);
    if (!s) return { ok: false, sent: 0, error: "Sessió no trobada." };
    // 01 §1: una sessió interrompuda no envia correu.
    if (s.status !== "completada")
      return { ok: false, sent: 0, error: `La sessió està ${s.status}.` };

    const { data: people } = await db
      .from("participants")
      .select("id, name, email")
      .in("id", s.ctx.participants);

    const { totals } = replay(s.presses, s.ctx);
    const names = {
      participants: s.participantNames,
      stations: s.stationNames,
    };
    const rows = summaryRows(totals, s.ctx, names, s.mode);
    const csv = toCsv(rows, names);
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
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: process.env.GMAIL_APP_PASSWORD },
    });

    const failures: string[] = [];
    let sent = 0;
    for (const p of people ?? []) {
      try {
        await transport.sendMail({
          from: `Hyrox Control <${user}>`,
          to: p.email,
          subject: `Hyrox – resultats del ${day}`,
          text:
            `Hola ${p.name},\n\n` +
            `Aquí tens els resultats de la sessió Hyrox del ${day}. ` +
            `El detall amb els temps exactes és al fitxer CSV adjunt.\n\n` +
            `${table}\n`,
          attachments: [
            {
              filename: `hyrox-${stamp}.csv`,
              content: csv,
              contentType: "text/csv; charset=utf-8",
            },
          ],
        });
        sent++;
      } catch (e) {
        failures.push(
          `${p.name}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    const error = failures.length ? failures.join(" | ") : null;
    await record(error);
    return { ok: !error, sent, error: error ?? undefined };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await record(error).catch(() => {});
    return { ok: false, sent: 0, error };
  }
}
