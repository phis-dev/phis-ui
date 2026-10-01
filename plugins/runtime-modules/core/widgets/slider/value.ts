/*
 * A Slider's value held inside its range. Apart from `config.ts` because the live client clamps on every
 * change, and the config module is the parser with the block defaults merge behind it.
 */
export function clampPhiSliderValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
