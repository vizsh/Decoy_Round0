import type { Assessment } from "@/engine/types";

export const PEN_MS = 520;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export type Series = { t: number; v: number }[];

export function valueAt(series: Series, t: number) {
  let prev = 0;
  for (const p of series) {
    if (t < p.t) return prev;
    if (t < p.t + PEN_MS) return prev + (p.v - prev) * ease((t - p.t) / PEN_MS);
    prev = p.v;
  }
  return prev;
}

export const stepIndexAt = (steps: Assessment[], t: number) => {
  let i = -1;
  for (let k = 0; k < steps.length; k++) if (steps[k].event.at <= t) i = k;
  return i;
};
