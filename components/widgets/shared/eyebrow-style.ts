import type { CSSProperties } from "react";

import { PHI_LETTER_SPACING_STEPS } from "../config/text-case-vocabulary";

/**
 * How an eyebrow is set: the small capitals a label stands in above a heading -- a Card's, a Markdown
 * text's. One place, so a label looks the same wherever it stands; the colour is the caller's (a
 * highlighted Card draws it in the primary colour).
 */
export function resolvePhiEyebrowTypeStyle(token: { fontSizeSM: number }): CSSProperties {
  return { fontSize: token.fontSizeSM, letterSpacing: PHI_LETTER_SPACING_STEPS.wide, textTransform: "uppercase" };
}
