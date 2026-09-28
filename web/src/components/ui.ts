/**
 * Classes compartides, a l'estil d'iOS (llistes agrupades de Configuració).
 * Botons grans: l'app es fa servir al gimnàs, amb el mòbil.
 */

/** Títol gran de pàgina. */
export const largeTitle =
  "px-1 text-[32px] font-bold leading-tight tracking-tight";

/** Capçalera petita en majúscules sobre un grup. */
export const groupHeader =
  "px-4 pb-1.5 text-[13px] uppercase tracking-wide text-muted";

/** Nota petita sota un grup. */
export const groupFooter = "px-4 pt-1.5 text-[13px] text-muted";

/** Targeta arrodonida que agrupa files, amb separadors entre elles. */
export const group =
  "overflow-hidden rounded-xl bg-card divide-y divide-separator";

/** Fila d'un grup. */
export const row = "flex min-h-11 items-center gap-3 px-4 py-2.5";

/** Fila d'un formulari: etiqueta a l'esquerra i camp a la dreta. */
export const fieldRow = "flex items-center gap-3 px-4";

/** Camp de text dins d'una fila (sense vora; la fila fa de camp). */
export const inputBare =
  "h-11 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-muted";

/** Etiqueta a l'esquerra d'un camp dins d'una fila. */
export const rowLabel = "w-28 shrink-0 text-[17px]";

/** Camp de text solt (fora d'un grup). */
export const input =
  "h-11 w-full rounded-xl bg-card px-4 text-[17px] outline-none focus:ring-2 focus:ring-tint";

/** Botó principal: blau, a tota l'amplada. */
export const button =
  "h-12 w-full rounded-xl bg-tint text-[17px] font-semibold text-white transition active:opacity-80 disabled:opacity-40";

/** Botó secundari petit en forma de píndola. */
export const buttonSecondary =
  "h-8 shrink-0 rounded-full bg-black/5 px-3.5 text-[15px] font-medium text-tint transition active:opacity-60 disabled:opacity-40 dark:bg-white/10";

/** Variant destructiva del botó secundari. */
export const buttonDanger = buttonSecondary.replace("text-tint", "text-danger");

export const label = "text-[15px] text-muted";

export const errorText = "text-[13px] text-danger";

/** Fletxa ">" de les files que obren una altra pantalla. */
export const chevron = "text-xl leading-none text-muted/60";
