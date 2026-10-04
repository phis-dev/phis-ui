"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import type { PhiSurface } from "../../types/surface";

/**
 * A Layout's Surface as Signals have left it.
 *
 * A Layout draws its Surface itself, from its config, so the Signals that change a Surface
 * (`background/change`, `border/change`, `shadow/change`) arrive somewhere else: at the Layout's slot
 * frame, which runs the block runtime and keeps what they set. The frame hands the result down through
 * this context, and only once a Signal has changed something -- until then the Layout's own config is
 * the answer, which in the Builder is the draft being edited.
 *
 * The value names the block it belongs to. A Layout nested inside reads the same context when its own
 * frame provides none, and must not take its parent's Surface for its own.
 */
type PhiLayoutSignalSurface = {
  blockId: PhiCmsInstanceId;
  surface: PhiSurface | null;
};

const PhiLayoutSignalSurfaceContext = createContext<PhiLayoutSignalSurface | null>(null);

export function PhiLayoutSignalSurfaceProvider({
  value,
  children,
}: {
  value: PhiLayoutSignalSurface | null;
  children: ReactNode;
}) {
  return (
    <PhiLayoutSignalSurfaceContext.Provider value={value}>
      {children}
    </PhiLayoutSignalSurfaceContext.Provider>
  );
}

/** The Surface a Layout draws: the one Signals left for this block, or the one it was given. */
export function usePhiLayoutSignalSurface(
  // A Layout's props carry its id as the string or number its plugin was handed.
  blockId: PhiCmsInstanceId | string | number | null | undefined,
  surface: PhiSurface | null | undefined,
): PhiSurface | null | undefined {
  const signalled = useContext(PhiLayoutSignalSurfaceContext);
  return signalled != null && blockId != null && String(signalled.blockId) === String(blockId)
    ? signalled.surface : surface;
}
