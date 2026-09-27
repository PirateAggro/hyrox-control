/**
 * Bips de confirmació de la pantalla de control.
 *
 *  - "action":  un to agut i curt → START i els cinc botons de colors.
 *  - "switch":  dos tocs més greus → canvi de participant, perquè se
 *    distingeixi d'oïda sense mirar la pantalla.
 *
 * Web Audio: no cal cap fitxer de so. El navegador només deixa crear el
 * context d'àudio després d'un toc de l'usuari, així que es crea al primer bip.
 * ⚠️ A l'iPhone, amb l'interruptor de silenci activat, Safari no fa sonar
 * l'àudio web.
 */
let ctx: AudioContext | null = null;

const PATTERNS = {
  action: [{ at: 0, frequency: 880 }],
  switch: [
    { at: 0, frequency: 523 },
    { at: 0.14, frequency: 523 },
  ],
} as const;

function tone(audio: AudioContext, start: number, frequency: number) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.35, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + 0.11);
}

export function beep(kind: keyof typeof PATTERNS = "action") {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    for (const n of PATTERNS[kind]) tone(ctx, t + n.at, n.frequency);
  } catch {
    // Sense àudio disponible: el bip és un extra, no ha de trencar res.
  }
}
