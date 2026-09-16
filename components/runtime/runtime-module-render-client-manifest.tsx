"use client";

import {
  createContext,
  createElement,
  Suspense,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";

import type { PhiSlotChildSizing } from "../../plugins/runtime/slot-size-policy";

export type PhiRuntimeModuleRenderClientProps = Readonly<Record<string, unknown>>;
/**
 * A Render Client as a manifest holds it: a component made with `next/dynamic(() => import(...))`.
 *
 * Not a loader behind `React.lazy`. A Render Client renders during the server render, and a literal
 * `dynamic()` call is entered into the route's loadable manifest, so the server writes a preload hint
 * for exactly the chunks of the Clients a page renders. A lazy loader's chunk was only requested once
 * hydration reached the Widget, one round of requests after the page's own scripts.
 */
export type PhiRuntimeModuleRenderClient = ComponentType<PhiRuntimeModuleRenderClientProps>;
export type PhiRuntimeModuleRenderClientManifest = ReadonlyMap<string, PhiRuntimeModuleRenderClient>;

const PhiRuntimeModuleRenderClientManifestContext =
  createContext<PhiRuntimeModuleRenderClientManifest | null>(null);

/** Types a Client whose props are narrower than the manifest's; the host passes what the server sent. */
export function definePhiRuntimeModuleRenderClient<TProps extends object>(
  Client: ComponentType<TProps>,
): PhiRuntimeModuleRenderClient {
  return Client as unknown as PhiRuntimeModuleRenderClient;
}

export function createPhiRuntimeModuleRenderClientManifest(
  entries: ReadonlyArray<readonly [string, PhiRuntimeModuleRenderClient]>,
): PhiRuntimeModuleRenderClientManifest {
  return extendPhiRuntimeModuleRenderClientManifest(new Map(), entries);
}

export function extendPhiRuntimeModuleRenderClientManifest(
  base: PhiRuntimeModuleRenderClientManifest,
  entries: ReadonlyArray<readonly [string, PhiRuntimeModuleRenderClient]>,
): PhiRuntimeModuleRenderClientManifest {
  const manifest = new Map(base);

  for (const [type, Client] of entries) {
    if (manifest.has(type)) {
      throw new Error(`Duplicate Runtime Render Client for "${type}".`);
    }
    manifest.set(type, Client);
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
  slotChildSizing?: PhiSlotChildSizing | null;
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
