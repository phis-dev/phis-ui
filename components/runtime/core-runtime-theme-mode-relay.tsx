"use client";

import { useEffect } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import { emitPhiCoreRuntimeThemeMode } from "./core-runtime-controller-snapshots";
import { usePhiSignalDispatcher } from "./runtime-signal-bus";
import { usePhiSignalRuntimePartition } from "./runtime-signal-partition";

/**
 * The Core Runtime Controller's `themeMode` output, told inside one Area.
 *
 * The mode is the root's; the Controls that show it live in an Area, whose signals stay in its own
 * partition, and the Site scope admits no broadcast that could reach down into it. So each Area tells
 * its own Controls, from the mode the root hands down.
 *
 * Told again whenever something registers in the Area, because a mode is a state rather than an event:
 * a Control that mounts later -- one loaded on demand, one in an Overlay opened afterwards -- has to learn
 * the mode that is on screen, not wait for the next change of it.
 */
export function PhiCoreRuntimeThemeModeRelay() {
  const { mode } = usePhiConfig();
  const partition = usePhiSignalRuntimePartition();
  const dispatchSignal = usePhiSignalDispatcher();

  useEffect(() => {
    let frame = 0;
    const tell = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => emitPhiCoreRuntimeThemeMode({ emitSignal: dispatchSignal, mode }));
    };
    tell();
    partition.instanceSubscribers.add(tell);
    return () => {
      window.cancelAnimationFrame(frame);
      partition.instanceSubscribers.delete(tell);
    };
  }, [dispatchSignal, mode, partition]);

  return null;
}
