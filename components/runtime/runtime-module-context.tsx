"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  PhiRuntimeModuleDataProviderDescriptor,
  PhiRuntimeModuleClientWidgetDefinition,
} from "../../types/cms-plugins";
import type { PhiRuntimeDataProviderKey } from "../../types/runtime-data-provider";
import type { PhiCalendarAdapterDescriptor, PhiCalendarAdapterKey } from "../../types/calendar";
import type { PhiMediaSourceDescriptor, PhiMediaSourceKey } from "../../types/media-source";
import type { PhiVideoProviderDescriptor, PhiVideoProviderKey } from "../../types/video";
import type { PhiCollectionItemRendererDescriptor } from "../../types/collection-provider";

type PhiRuntimeModuleClientState = {
  moduleIds: ReadonlySet<string>;
  widgetTypes: ReadonlySet<string>;
  layoutTypes: ReadonlySet<string>;
  widgetDefinitionsByType: ReadonlyMap<string, PhiRuntimeModuleClientWidgetDefinition>;
  dataProviderDescriptorsByKey: ReadonlyMap<PhiRuntimeDataProviderKey, PhiRuntimeModuleDataProviderDescriptor>;
  calendarAdapterDescriptorsByKey: ReadonlyMap<PhiCalendarAdapterKey, PhiCalendarAdapterDescriptor>;
  /** The media sources the Area's active Modules declare; a source whose Module is not active is absent. */
  mediaSourceDescriptorsByKey: ReadonlyMap<PhiMediaSourceKey, PhiMediaSourceDescriptor>;
  /**
   * Where a video may be fetched from, by provider key.
   *
   * Here rather than behind a loader because a provider is data: a Widget reads the patterns, the
   * recipient and the embed template straight out of this map. A key nothing active owns resolves to
   * nothing, which is how a placement outlives the Module that once served it.
   */
  videoProviderDescriptorsByKey: ReadonlyMap<PhiVideoProviderKey, PhiVideoProviderDescriptor>;
  /**
   * The Collection item renderers the Area's Modules declare, by key -- or null where nobody said.
   *
   * Only the Builder says: it is where a Collection View's configuration is judged without drawing any
   * items, and a renderer a Site picked from another Module is one of the things it judges. A live page
   * looks its renderer up in the Render Client manifest, which is the real answer there. Null rather than
   * an empty set, so that "not known here" can never read as "none offered".
   */
  collectionItemRendererKeys: ReadonlySet<string> | null;
};

const EMPTY_RUNTIME_MODULE_STATE: PhiRuntimeModuleClientState = {
  moduleIds: new Set(),
  widgetTypes: new Set(),
  layoutTypes: new Set(),
  widgetDefinitionsByType: new Map(),
  dataProviderDescriptorsByKey: new Map(),
  calendarAdapterDescriptorsByKey: new Map(),
  mediaSourceDescriptorsByKey: new Map(),
  videoProviderDescriptorsByKey: new Map(),
  collectionItemRendererKeys: null,
};

const PhiRuntimeModuleContext = createContext<PhiRuntimeModuleClientState>(
  EMPTY_RUNTIME_MODULE_STATE,
);

export function PhiRuntimeModuleProvider({
  moduleIds,
  widgetTypes,
  layoutTypes,
  widgetDefinitions = [],
  dataProviderDescriptors = [],
  calendarAdapterDescriptors = [],
  mediaSourceDescriptors = [],
  videoProviderDescriptors = [],
  collectionItemRendererDescriptors,
  children,
}: {
  moduleIds: readonly string[];
  widgetTypes: readonly string[];
  layoutTypes: readonly string[];
  widgetDefinitions?: readonly PhiRuntimeModuleClientWidgetDefinition[];
  dataProviderDescriptors?: readonly PhiRuntimeModuleDataProviderDescriptor[];
  calendarAdapterDescriptors?: readonly PhiCalendarAdapterDescriptor[];
  mediaSourceDescriptors?: readonly PhiMediaSourceDescriptor[];
  videoProviderDescriptors?: readonly PhiVideoProviderDescriptor[];
  collectionItemRendererDescriptors?: readonly PhiCollectionItemRendererDescriptor[];
  children: ReactNode;
}) {
  const state = useMemo<PhiRuntimeModuleClientState>(() => ({
    moduleIds: new Set(moduleIds),
    widgetTypes: new Set(widgetTypes),
    layoutTypes: new Set(layoutTypes),
    widgetDefinitionsByType: new Map(
      widgetDefinitions.map((definition) => [definition.type, definition]),
    ),
    dataProviderDescriptorsByKey: new Map(
      dataProviderDescriptors.map((descriptor) => [descriptor.key, descriptor]),
    ),
    calendarAdapterDescriptorsByKey: new Map(
      calendarAdapterDescriptors.map((descriptor) => [descriptor.key, descriptor]),
    ),
    mediaSourceDescriptorsByKey: new Map(
      mediaSourceDescriptors.map((descriptor) => [descriptor.key, descriptor]),
    ),
    videoProviderDescriptorsByKey: new Map(
      videoProviderDescriptors.map((descriptor) => [descriptor.key, descriptor]),
    ),
    collectionItemRendererKeys: collectionItemRendererDescriptors
      ? new Set(collectionItemRendererDescriptors.map((descriptor) => descriptor.key))
      : null,
  }), [
    calendarAdapterDescriptors,
    collectionItemRendererDescriptors,
    dataProviderDescriptors,
    layoutTypes,
    mediaSourceDescriptors,
    moduleIds,
    videoProviderDescriptors,
    widgetDefinitions,
    widgetTypes,
  ]);

  return (
    <PhiRuntimeModuleContext.Provider value={state}>
      {children}
    </PhiRuntimeModuleContext.Provider>
  );
}

export function usePhiRuntimeModuleState() {
  return useContext(PhiRuntimeModuleContext);
}
