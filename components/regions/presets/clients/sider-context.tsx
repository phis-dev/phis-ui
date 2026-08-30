"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export type PhiSiderContextValue = {
  collapsed: boolean;
  collapsedWidth?: number | string;
};

const PhiSiderContext = createContext<PhiSiderContextValue | null>(null);

export function PhiSiderContextProvider({
  value,
  children,
}: {
  value: PhiSiderContextValue;
  children: ReactNode;
}) {
  return <PhiSiderContext.Provider value={value}>{children}</PhiSiderContext.Provider>;
}

export function usePhiSiderContext() {
  return useContext(PhiSiderContext);
}
