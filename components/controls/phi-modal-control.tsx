"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";

import type { PhiControlSize } from "../../types/control";
import type { PhiRenderableBlockSize } from "../../types/renderable-block";
import type { PhiModalWidth, PhiOverlayControlCommonProps } from "./phi-overlay-control-contract";

export type PhiModalControlProps = PhiOverlayControlCommonProps & {
  centered?: boolean;
  controlSize?: PhiControlSize;
  size?: PhiRenderableBlockSize | null;
  /** One width, or one per responsive mode on the container scale (`PHI_MODAL_RESPONSIVE_MIN_WIDTH`). */
  width?: PhiModalWidth;
  rootClassName?: string;
};

const PhiModalControlAdapter = dynamic(() =>
  import("./phi-modal-control-adapter").then((module) => module.PhiModalControlAdapter));

const subscribeHydration = () => () => undefined;

/**
 * The Modal shell, loaded the first time it has something to show.
 *
 * Ant Design's Modal is the dialog, its motion and its focus trap, and an Overlay that is never opened
 * needs none of it. Mounted closed, which is how every Landing carries its sign-in, the Modal draws
 * nothing anyway -- so nothing is loaded until the Overlay opens, or until an `eager` one would mount its
 * content hidden after hydration, exactly when the shell itself would have. Once loaded it stays: closing
 * plays the shell's own exit and keeps whatever its mount policy keeps.
 *
 * Opened during the server render, the shell renders there too, and Next ships its code with the page.
 */
export function PhiModalControl(props: PhiModalControlProps) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const wanted = props.open || (hydrated && props.mountPolicy === "eager");
  const [loaded, setLoaded] = useState(wanted);
  if (wanted && !loaded) {
    setLoaded(true);
  }
  return loaded || wanted ? <PhiModalControlAdapter {...props} /> : null;
}
