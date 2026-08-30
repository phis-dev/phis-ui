"use client";

import { createContext, useContext, type ReactNode } from "react";

export type PhiAuthoringRegionOverrides = {
  preview: boolean;
  pageSiderRight?: { visible: boolean; width: string };
  structureSiderLeft?: { visible: boolean; width: string; fullHeight: boolean };
};

const PhiAuthoringRegionOverridesContext = createContext<PhiAuthoringRegionOverrides>({ preview: false });

export function PhiAuthoringRegionOverridesProvider({ value, children }: { value: PhiAuthoringRegionOverrides; children: ReactNode }) {
  return <PhiAuthoringRegionOverridesContext.Provider value={value}>{children}</PhiAuthoringRegionOverridesContext.Provider>;
}

export function usePhiAuthoringRegionOverrides() {
  return useContext(PhiAuthoringRegionOverridesContext);
}
