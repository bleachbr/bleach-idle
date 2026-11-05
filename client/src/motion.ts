// Menos movimento (R-14, RF-06, ADR-002 §2.3): decide se tremor de câmera, clarão e animações longas ficam desligados.
import type { Motion } from "./prefs";

/** "auto" segue o sistema (`prefers-reduced-motion: reduce`); "reduced" e "full" valem por cima dele. */
export function reducedMotion(motion: Motion, systemReduces: boolean): boolean {
  return motion === "auto" ? systemReduces : motion === "reduced";
}
