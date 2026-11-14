"use client";

import type { ReactNode } from "react";
import { isPhiIconNameKnown, PhiIcon, reportPhiUnknownIconName } from "../../../shell/phi-icon";

/**
 * The icon a Button, a Table action or a Command Toolbar names, or null where the name draws nothing.
 *
 * The same rule as `PhiIcon` (`isPhiIconNameKnown`): a short name is the Ant Design icon of that name,
 * one name per icon. Null rather than an empty element, because a Table falls back to the action's label
 * where its icon does not resolve and asks this to find out.
 */
export function resolvePhiButtonIcon(icon: string | null | undefined): ReactNode {
  const name = icon?.trim();
  if (!name) return null;
  if (!isPhiIconNameKnown(name)) {
    reportPhiUnknownIconName(name);
    return null;
  }
  return <PhiIcon name={name} size="1em" />;
}
