"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";

import type { PhiCmsOverlayConfig, PhiCmsOverlaySize, PhiOverlayPushBehaviour } from "../../types/cms-overlay";
import type { PhiOverlayControlCommonProps } from "./phi-overlay-control-contract";

export type PhiDrawerControlProps = PhiOverlayControlCommonProps & {
  placement?: PhiCmsOverlayConfig["placement"];
  size?: PhiCmsOverlaySize;
  maxSize?: number;
  resizable?: boolean;
  push?: PhiOverlayPushBehaviour;
  zIndex?: number;
};

const PhiDrawerControlAdapter = dynamic(() =>
  import("./phi-drawer-control-adapter").then((module) => module.PhiDrawerControlAdapter));

const subscribeHydration = () => () => undefined;

/**
 * The Drawer shell, loaded the first time it has something to show.
 *
 * Ant Design's Drawer is its panel, motion and focus handling, and a closed one draws nothing -- so, as
 * with `PhiModalControl`, nothing is loaded until the Overlay opens, or until an `eager` one would mount
 * its content hidden after hydration. Once loaded it stays, so closing plays the shell's own exit.
 */
export function PhiDrawerControl(props: PhiDrawerControlProps) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const wanted = props.open || (hydrated && props.mountPolicy === "eager");
  const [loaded, setLoaded] = useState(wanted);
  if (wanted && !loaded) {
    setLoaded(true);
  }
  return loaded || wanted ? <PhiDrawerControlAdapter {...props} /> : null;
}
