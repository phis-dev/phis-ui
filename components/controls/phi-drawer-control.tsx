"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import type { PhiCmsOverlayConfig, PhiOverlayPushBehaviour } from "../../types/cms-overlay";
import type { PhiOverlayControlCommonProps, PhiOverlayControlGeometryProps } from "./phi-overlay-control-contract";
import { usePhiHydrated } from "../state/use-phi-hydrated";

/**
 * `size`, `minSize` and `maxSize` are the block's pairs; the Drawer draws the axis it opens along
 * (`resolvePhiDrawerGeometry`).
 */
export type PhiDrawerControlProps = PhiOverlayControlCommonProps & PhiOverlayControlGeometryProps & {
  placement?: PhiCmsOverlayConfig["placement"];
  resizable?: boolean;
  push?: PhiOverlayPushBehaviour;
  zIndex?: number;
};

const PhiDrawerControlAdapter = dynamic(() =>
  import("./phi-drawer-control-adapter").then((module) => module.PhiDrawerControlAdapter));

/**
 * The Drawer shell, loaded the first time it has something to show.
 *
 * Ant Design's Drawer is its panel, motion and focus handling, and a closed one draws nothing -- so, as
 * with `PhiModalControl`, nothing is loaded until the Overlay opens, or until an `eager` one would mount
 * its content hidden after hydration. Once loaded it stays, so closing plays the shell's own exit.
 */
export function PhiDrawerControl(props: PhiDrawerControlProps) {
  const hydrated = usePhiHydrated();
  const wanted = props.open || (hydrated && props.mountPolicy === "eager");
  const [loaded, setLoaded] = useState(wanted);
  if (wanted && !loaded) {
    setLoaded(true);
  }
  return loaded || wanted ? <PhiDrawerControlAdapter {...props} /> : null;
}
