/**
 * Rellotge del procés actual (servidor o navegador).
 *
 * En una funció a part perquè el linter de React no confongui les lectures
 * del rellotge que es fan dins d'accions o al servidor amb lectures durant el
 * pintat d'un component.
 */
export const clock = () => Date.now();
