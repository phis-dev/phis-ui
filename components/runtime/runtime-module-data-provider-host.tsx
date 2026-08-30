"use client";

import type { ReactNode } from "react";

import type { PhiRuntimeDataProviderKey } from "../../types/runtime-data-provider";
import { PhiRuntimeModuleDataProviderClientHost } from "./runtime-module-data-provider-client-manifest";

export function PhiRuntimeModuleDataProviderHost({
  providerKeys,
  children,
}: {
  providerKeys: readonly PhiRuntimeDataProviderKey[];
  children: ReactNode;
}) {
  return (
    <PhiRuntimeModuleDataProviderClientHost providerKeys={providerKeys} mode="live">
      {children}
    </PhiRuntimeModuleDataProviderClientHost>
  );
}
