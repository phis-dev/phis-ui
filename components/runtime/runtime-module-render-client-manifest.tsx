"use client";

import {
  createContext,
  createElement,
  lazy,
  Suspense,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";

import type { PhiRenderableBlock, PhiSlotSizePolicy } from "../../types";
import type { PhiSlotChildKind } from "../../plugins/runtime/slot-size-policy";

export type PhiRuntimeModuleRenderClientProps = Readonly<Record<string, unknown>>;
export type PhiRuntimeModuleRenderClientLoader =
  () => Promise<ComponentType<PhiRuntimeModuleRenderClientProps>>;
export type PhiRuntimeModuleRenderClientManifest = ReadonlyMap<
  string,
  ComponentType<PhiRuntimeModuleRenderClientProps>
>;

const PhiRuntimeModuleRenderClientManifestContext =
  createContext<PhiRuntimeModuleRenderClientManifest | null>(null);

export function definePhiRuntimeModuleRenderClientLoader<TProps extends object>(
  load: () => Promise<ComponentType<TProps>>,
): PhiRuntimeModuleRenderClientLoader {
  return load as unknown as PhiRuntimeModuleRenderClientLoader;
}

export function createPhiRuntimeModuleRenderClientManifest(
  entries: ReadonlyArray<readonly [string, PhiRuntimeModuleRenderClientLoader]>,
): PhiRuntimeModuleRenderClientManifest {
  return extendPhiRuntimeModuleRenderClientManifest(new Map(), entries);
}

export function extendPhiRuntimeModuleRenderClientManifest(
  base: PhiRuntimeModuleRenderClientManifest,
  entries: ReadonlyArray<readonly [string, PhiRuntimeModuleRenderClientLoader]>,
): PhiRuntimeModuleRenderClientManifest {
  const manifest = new Map(base);

  for (const [type, load] of entries) {
    if (manifest.has(type)) {
      throw new Error(`Duplicate Runtime Render Client loader for "${type}".`);
    }
    manifest.set(type, lazy(async () => ({ default: await load() })));
  }

  return manifest;
}

export function PhiRuntimeModuleRenderClientManifestProvider({
  manifest,
  children,
}: {
  manifest: PhiRuntimeModuleRenderClientManifest;
  children: ReactNode;
}) {
  return (
    <PhiRuntimeModuleRenderClientManifestContext.Provider value={manifest}>
      {children}
    </PhiRuntimeModuleRenderClientManifestContext.Provider>
  );
}

function usePhiRuntimeModuleRenderClientManifest() {
  const manifest = useContext(PhiRuntimeModuleRenderClientManifestContext);
  if (!manifest) {
    throw new Error("Runtime Render Client manifest is not mounted.");
  }
  return manifest;
}

export function PhiRuntimeModuleRenderClientHost(props: {
  type: string;
  componentProps: PhiRuntimeModuleRenderClientProps;
  fallback?: ReactNode;
  slotChildSizing?: {
    kind: PhiSlotChildKind;
    slotSizePolicy?: PhiSlotSizePolicy | null;
    config?: Partial<PhiRenderableBlock> | null;
  };
}) {
  const { type, componentProps, fallback = null } = props;
  const manifest = usePhiRuntimeModuleRenderClientManifest();
  const Client = manifest.get(type);

  if (!Client) {
    throw new Error(`Runtime Render Client loader for "${type}" is not available in this Area.`);
  }

  return (
    <Suspense fallback={fallback}>
      {createElement(Client, componentProps)}
    </Suspense>
  );
}
