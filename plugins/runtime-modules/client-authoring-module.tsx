"use client";

import {
  createContext,
  lazy,
  useCallback,
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
  // A second loader for one type is a package mistake, refused like a duplicate Module below.
  const layoutTypes = layouts.map((entry) => entry.type);
  const duplicateLayoutType = layoutTypes.find((type, index) => layoutTypes.indexOf(type) !== index);
  if (duplicateLayoutType !== undefined) {
    throw new Error(`Duplicate authoring layout "${duplicateLayoutType}" in runtime module "${moduleId}".`);
  }
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

function findPhiAuthoringLayoutDefinition(
  modules: ReadonlyMap<string, PhiRuntimeModuleAuthoringRegistration>,
  type: string,
) {
  for (const registration of modules.values()) {
    const definition = registration.layoutsByType.get(type);
    if (definition) {
      return definition;
    }
  }
  return null;
}

/**
 * The authoring Layout definitions, as a lookup by type rather than one type's answer.
 *
 * A Layout names its nested Layouts only while it renders its children, and a parent Layout sizes each
 * slot by the props of the element standing in it, before that element renders: a nested Layout's
 * element has to carry its policy already, and a hook inside it would be too late.
 */
export function usePhiAuthoringLayoutDefinitionResolver() {
  const modules = useContext(PhiRuntimeModuleAuthoringContext);
  return useCallback((type: string) => findPhiAuthoringLayoutDefinition(modules, type), [modules]);
}
