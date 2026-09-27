/**
 * Bip curt de confirmació en prémer un botó de la pantalla de control.
 *
 * Web Audio: no cal cap fitxer de so. El navegador només deixa crear el
 * context d'àudio després d'un toc de l'usuari, així que es crea al primer bip.
 * ⚠️ A l'iPhone, amb l'interruptor de silenci activat, Safari no fa sonar
 * l'àudio web.
 */
let ctx: AudioContext | null = null;

export function beep(frequency = 880) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  } catch {
    // Sense àudio disponible: el bip és un extra, no ha de trencar res.
  }
}
