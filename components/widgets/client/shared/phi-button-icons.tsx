"use client";

import type { ReactNode } from "react";
import { PhiIcon } from "../../../shell/phi-icon";

/**
 * The icon a Button, a Table action or a Command Toolbar names, as an element, or null where it names
 * none.
 *
 * The same names as `PhiIcon`: a short name is the Ant Design icon of that name, one name per icon. The
 * name is not looked up here: a preset's is checked by its tests and the Builder's by its save
 * (`isPhiIconNameKnown`), so a live page draws what it was handed, and a name that names nothing draws
 * nothing.
 */
export function resolvePhiButtonIcon(icon: string | null | undefined): ReactNode {
  const name = icon?.trim();
  return name ? <PhiIcon name={name} size="1em" /> : null;
}
