"use client";

import { lazy, Suspense, type ReactNode } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import { usePhiThemeToneSource } from "../root/phi-theme-tone-source";
import type { PhiThemeMode } from "../../theme/phi-theme-presets";
import { resolvePhiSurfaceToneClassName, type PhiSurfaceTone as PhiSurfaceToneValue } from "../../types/surface";

const PhiSurfaceToneScope = lazy(async () => ({
  default: (await import("./phi-surface-tone-scope")).PhiSurfaceToneScope,
}));

/** The mode a tone asks for: `inverse` is the other mode than the page's. */
export function resolvePhiSurfaceToneMode(
  tone: PhiSurfaceToneValue,
  pageMode: PhiThemeMode,
): PhiThemeMode | null {
  if (tone === "light" || tone === "dark") return tone;
  if (tone === "inverse") return pageMode === "dark" ? "light" : "dark";
  return null;
}

/**
 * A Surface's content in the mode its `tone` asks for.
 *
 * Rendered inside the box, around its content; the box itself carries the tone's class
 * (`resolvePhiSurfaceToneClassName`), and that class is where the other mode's variables are written. When
 * the content is already in that mode -- the page is, or a Surface around it is -- nothing is mounted: the
 * class then has no variables of its own and the content inherits the right ones. Otherwise the scope is
 * loaded on its own, rendered on the server like everything else, and only where a page uses it.
 */
export function PhiSurfaceTone({
  tone,
  children,
}: {
  tone: PhiSurfaceToneValue | null | undefined;
  children: ReactNode;
}) {
  const { mode } = usePhiConfig();
  const source = usePhiThemeToneSource();
  const cssVarKey = resolvePhiSurfaceToneClassName(tone);
  const target = tone && source ? resolvePhiSurfaceToneMode(tone, source.pageMode) : null;
  if (!target || !source || !cssVarKey || target === mode) {
    return children;
  }
  return (
    <Suspense fallback={null}>
      <PhiSurfaceToneScope mode={target} cssVarKey={cssVarKey} source={source}>
        {children}
      </PhiSurfaceToneScope>
    </Suspense>
  );
}
