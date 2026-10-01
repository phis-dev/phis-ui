"use client";

import { createElement, type ReactNode } from "react";

import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";
import type { PhiRuntimeModuleUiProvider } from "../../types/cms-plugins";
import {
  createPhiRuntimeModuleClientManifestContext,
  extendPhiRuntimeModuleClientManifest,
} from "./runtime-module-client-manifest-context";

/**
 * The Module UI providers an Area can mount, by Module, each a `next/dynamic` component.
 *
 * A UI provider is Client code, and while the Server catalog loaded it, every route whose server graph
 * reached the catalog shipped it -- the Auth Module's Form provider, and the whole Form stack behind it,
 * on every page of every Area, a Landing without a single Form among them. The Server now only states
 * that a Module has one (`uiProvider: true`); the Area's Client boundary holds the loader, and the host
 * below loads it where a Module-owned node actually renders.
 */
export type PhiRuntimeModuleUiProviderClientManifest = ReadonlyMap<
  PhiRuntimeModuleId,
  PhiRuntimeModuleUiProvider
>;

export type PhiRuntimeModuleUiProviderClientDefinition = {
  moduleId: PhiRuntimeModuleId;
  Provider: PhiRuntimeModuleUiProvider;
};

const EMPTY_UI_PROVIDER_MANIFEST: PhiRuntimeModuleUiProviderClientManifest = new Map();

const uiProviderClientManifest = createPhiRuntimeModuleClientManifestContext<
  PhiRuntimeModuleUiProviderClientManifest
>("Module UI provider Client manifest is not mounted.");

export function createPhiRuntimeModuleUiProviderClientManifest(
  definitions: readonly PhiRuntimeModuleUiProviderClientDefinition[],
): PhiRuntimeModuleUiProviderClientManifest {
  return extendPhiRuntimeModuleUiProviderClientManifest(EMPTY_UI_PROVIDER_MANIFEST, definitions);
}

export function extendPhiRuntimeModuleUiProviderClientManifest(
  base: PhiRuntimeModuleUiProviderClientManifest,
  definitions: readonly PhiRuntimeModuleUiProviderClientDefinition[],
): PhiRuntimeModuleUiProviderClientManifest {
  return extendPhiRuntimeModuleClientManifest(
    base,
    definitions.map((definition) => [definition.moduleId, definition.Provider] as const),
    (moduleId) => `Duplicate Module UI provider for "${moduleId}".`,
  );
}

export function PhiRuntimeModuleUiProviderClientManifestProvider({
  manifest,
  children,
}: {
  manifest?: PhiRuntimeModuleUiProviderClientManifest;
  children: ReactNode;
}) {
  return (
    <uiProviderClientManifest.Provider manifest={manifest ?? EMPTY_UI_PROVIDER_MANIFEST}>
      {children}
    </uiProviderClientManifest.Provider>
  );
}

/**
 * A Module's own subtree inside that Module's UI provider.
 *
 * The Server inserts this only for a Module whose catalog entry says it has one, so a missing loader is
 * a package whose Server and Client halves disagree, and it is refused by name rather than rendered
 * bare.
 */
export function PhiRuntimeModuleUiProviderHost({
  moduleId,
  children,
}: {
  moduleId: PhiRuntimeModuleId;
  children: ReactNode;
}) {
  const manifest = uiProviderClientManifest.useOptionalManifest() ?? EMPTY_UI_PROVIDER_MANIFEST;
  const Provider = manifest.get(moduleId);
  if (!Provider) {
    throw new Error(
      `Module "${moduleId}" declares a UI provider, but the Area's Client manifest holds none for it.`,
    );
  }
  return createElement(Provider, null, children);
}
