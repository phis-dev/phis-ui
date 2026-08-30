"use client";

import { lazy, Suspense } from "react";

import type { PhiCmsBackgroundWidgetConfig } from "../../widgets/config/background";

/**
 * The single conditional Background-motion boundary shared by Regions and Layouts.
 *
 * The motion implementation coordinates intersection, resize, scroll, and animation frames and is the
 * heavy half of this pair. The `React.lazy` boundary lives here, on the Client, because that is what
 * actually splits the implementation out of the route's client graph. Dynamically importing it from a
 * Server Component would only split the server module graph and is forbidden by `AGENTS.md`.
 *
 * Callers render this element only when the resolved Background actually declares motion, so a route
 * with static Backgrounds alone never puts the implementation chunk into its Flight payload.
 */
const PhiBackgroundMotionLayerImplementation = lazy(async () => ({
  default: (await import("./phi-background-motion-layer-client")).PhiBackgroundMotionLayerClient,
}));

export function PhiBackgroundMotionLayer({
  config,
}: {
  config: PhiCmsBackgroundWidgetConfig;
}) {
  return (
    <Suspense fallback={null}>
      <PhiBackgroundMotionLayerImplementation config={config} />
    </Suspense>
  );
}
