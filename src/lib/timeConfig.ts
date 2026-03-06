export const DURATION_STEP_MINUTES = 15;
export const DURATION_MIN_MINUTES = DURATION_STEP_MINUTES;

/** Round minutes UP to the next step boundary (minimum = one step). */
export function roundUpToStep(minutes: number): number {
  if (minutes <= 0) return DURATION_STEP_MINUTES;
  return Math.ceil(minutes / DURATION_STEP_MINUTES) * DURATION_STEP_MINUTES;
}
