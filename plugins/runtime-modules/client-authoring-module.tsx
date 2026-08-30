"use client";

import {
  createContext,
  lazy,
  useContext,
  useMemo,
  type ComponentType,
  type ReactNode,
} from "react";

import type {
  PhiCmsLayoutPlugin,
  PhiRuntimeModuleAuthoringClientProps,
  PhiRuntimeModuleId,
  PhiRuntimeModuleRenderPolicies,
} from "../../types/cms-plugins";
import type { PhiSlotSizePolicy } from "../../types";
import type { PhiAuthoringWidgetModuleProps } from "./client-authoring-widget-module";

export type PhiAuthoringLayoutLoaderProps = {
  children: (plugin: PhiCmsLayoutPlugin<unknown>) => ReactNode;
};

export type PhiAuthoringLayoutModuleLoader = {
  type: string;
  title: string;
  slotSizePolicy?: PhiSlotSizePolicy;
  renderPolicies: PhiRuntimeModuleRenderPolicies;
  load: () => Promise<PhiCmsLayoutPlugin<unknown>>;
};

export type PhiAuthoringLayoutDefinition = Omit<PhiAuthoringLayoutModuleLoader, "load"> & {
  ownerModuleId: PhiRuntimeModuleId;
  component: ComponentType<PhiAuthoringLayoutLoaderProps>;
};

export type PhiRuntimeModuleAuthoringRegistration = {
  moduleId: PhiRuntimeModuleId;
  WidgetModule: ComponentType<PhiAuthoringWidgetModuleProps>;
  layoutsByType: ReadonlyMap<string, PhiAuthoringLayoutDefinition>;
};

const PhiRuntimeModuleAuthoringContext = createContext<
  ReadonlyMap<string, PhiRuntimeModuleAuthoringRegistration>
>(new Map());

function createPhiLazyAuthoringLayout(load: PhiAuthoringLayoutModuleLoader["load"]) {
  return lazy(async () => {
    const plugin = await load();
    return {
      default: function PhiLoadedAuthoringLayout({ children }: PhiAuthoringLayoutLoaderProps) {
        return children(plugin);
      },
    };
  });
}

export function definePhiAuthoringLayoutModuleLoader(
  entry: PhiAuthoringLayoutModuleLoader,
): PhiAuthoringLayoutModuleLoader {
  return entry;
}

export function createPhiRuntimeModuleAuthoringClient({
  moduleId,
  WidgetModule,
  layouts = [],
}: {
  moduleId: PhiRuntimeModuleId;
  WidgetModule: ComponentType<PhiAuthoringWidgetModuleProps>;
  layouts?: readonly PhiAuthoringLayoutModuleLoader[];
}): ComponentType<PhiRuntimeModuleAuthoringClientProps> {
  const layoutsByType = new Map<string, PhiAuthoringLayoutDefinition>(
    layouts.map((entry) => [
      entry.type,
      {
        ownerModuleId: moduleId,
        type: entry.type,
        title: entry.title,
        slotSizePolicy: entry.slotSizePolicy,
        renderPolicies: entry.renderPolicies,
        component: createPhiLazyAuthoringLayout(entry.load),
      },
    ]),
  );
  const registration = { moduleId, WidgetModule, layoutsByType };

  return function PhiRuntimeModuleAuthoringClient({ children }) {
    const parent = useContext(PhiRuntimeModuleAuthoringContext);
    const modules = useMemo(() => {
      if (parent.get(moduleId) === registration) {
        return parent;
      }
      const next = new Map(parent);
      if (next.has(moduleId)) {
        throw new Error(`Duplicate runtime module authoring client "${moduleId}".`);
      }
      next.set(moduleId, registration);
      return next;
    }, [parent]);

    return (
      <PhiRuntimeModuleAuthoringContext.Provider value={modules}>
        {children}
      </PhiRuntimeModuleAuthoringContext.Provider>
    );
  };
}

export function usePhiRuntimeModuleAuthoringRegistration(
  moduleId: PhiRuntimeModuleId | null | undefined,
) {
  const modules = useContext(PhiRuntimeModuleAuthoringContext);
  return moduleId ? modules.get(moduleId) ?? null : null;
}

export function usePhiAuthoringLayoutDefinition(type: string) {
  const modules = useContext(PhiRuntimeModuleAuthoringContext);
  for (const registration of modules.values()) {
    const definition = registration.layoutsByType.get(type);
    if (definition) {
      return definition;
    }
  }
  return null;
}
