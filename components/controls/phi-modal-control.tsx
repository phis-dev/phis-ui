"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import type { PhiControlSize } from "../../types/control";
import type { PhiRenderableBlockSize } from "../../types/renderable-block";
import type { PhiOverlayControlCommonProps, PhiOverlayControlGeometryProps } from "./phi-overlay-control-contract";
import { usePhiHydrated } from "../state/use-phi-hydrated";

export type PhiModalControlProps = PhiOverlayControlCommonProps & PhiOverlayControlGeometryProps & {
  centered?: boolean;
  /** The width step where `size` names no width (`PHI_MODAL_WIDTH_BY_CONTROL_SIZE`). */
  controlSize?: PhiControlSize;
  /** What a `size` Signal told the open Modal; each axis it names stands over the stated `size`. */
  toldSize?: PhiRenderableBlockSize | null;
  rootClassName?: string;
};

const PhiModalControlAdapter = dynamic(() =>
  import("./phi-modal-control-adapter").then((module) => module.PhiModalControlAdapter));

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
  const hydrated = usePhiHydrated();
  const wanted = props.open || (hydrated && props.mountPolicy === "eager");
  const [loaded, setLoaded] = useState(wanted);
  if (wanted && !loaded) {
    setLoaded(true);
  }
  return loaded || wanted ? <PhiModalControlAdapter {...props} /> : null;
}
