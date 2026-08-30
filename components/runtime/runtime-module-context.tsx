"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  PhiRuntimeModuleDataProviderDescriptor,
  PhiRuntimeModuleClientWidgetDefinition,
} from "../../types/cms-plugins";
import type { PhiRuntimeDataProviderKey } from "../../types/runtime-data-provider";
import type { PhiCalendarAdapterDescriptor, PhiCalendarAdapterKey } from "../../types/calendar";

export type PhiRuntimeModuleClientState = {
  moduleIds: ReadonlySet<string>;
  widgetTypes: ReadonlySet<string>;
  layoutTypes: ReadonlySet<string>;
  widgetDefinitionsByType: ReadonlyMap<string, PhiRuntimeModuleClientWidgetDefinition>;
  dataProviderDescriptorsByKey: ReadonlyMap<PhiRuntimeDataProviderKey, PhiRuntimeModuleDataProviderDescriptor>;
  calendarAdapterDescriptorsByKey: ReadonlyMap<PhiCalendarAdapterKey, PhiCalendarAdapterDescriptor>;
};

const EMPTY_RUNTIME_MODULE_STATE: PhiRuntimeModuleClientState = {
  moduleIds: new Set(),
  widgetTypes: new Set(),
  layoutTypes: new Set(),
  widgetDefinitionsByType: new Map(),
  dataProviderDescriptorsByKey: new Map(),
  calendarAdapterDescriptorsByKey: new Map(),
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
  children,
}: {
  moduleIds: readonly string[];
  widgetTypes: readonly string[];
  layoutTypes: readonly string[];
  widgetDefinitions?: readonly PhiRuntimeModuleClientWidgetDefinition[];
  dataProviderDescriptors?: readonly PhiRuntimeModuleDataProviderDescriptor[];
  calendarAdapterDescriptors?: readonly PhiCalendarAdapterDescriptor[];
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
  }), [calendarAdapterDescriptors, dataProviderDescriptors, layoutTypes, moduleIds, widgetDefinitions, widgetTypes]);

  return (
    <PhiRuntimeModuleContext.Provider value={state}>
      {children}
    </PhiRuntimeModuleContext.Provider>
  );
}

export function usePhiRuntimeModuleState() {
  return useContext(PhiRuntimeModuleContext);
}
