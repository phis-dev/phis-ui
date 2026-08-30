"use client";

import { lazy, type ComponentType, type ReactNode } from "react";

import type {
  PhiCmsBuilderWidgetPlugin,
  PhiCmsWidgetPluginDefinition,
} from "../../types/cms-plugins";

export type PhiAuthoringWidgetModuleProps = {
  type: string;
  children: (plugin: PhiCmsBuilderWidgetPlugin<unknown> | null) => ReactNode;
};

export type PhiAuthoringWidgetModuleLoader = {
  type: string;
  load: () => Promise<PhiCmsBuilderWidgetPlugin<unknown>>;
};

export function definePhiAuthoringWidgetModuleLoader<TConfig>(
  definition: PhiCmsWidgetPluginDefinition<TConfig>,
  load: () => Promise<PhiCmsBuilderWidgetPlugin<TConfig>>,
): PhiAuthoringWidgetModuleLoader {
  return {
    type: `${definition.pluginKey}/${definition.typeKey}`,
    load: load as () => Promise<PhiCmsBuilderWidgetPlugin<unknown>>,
  };
}

function createPhiLazyAuthoringWidget(
  load: PhiAuthoringWidgetModuleLoader["load"],
) {
  return lazy(async () => {
    const plugin = await load();
    return {
      default: function PhiLoadedAuthoringWidget({
        children,
      }: Pick<PhiAuthoringWidgetModuleProps, "children">) {
        return children(plugin);
      },
    };
  });
}

export function createPhiAuthoringWidgetModule(
  loaders: readonly PhiAuthoringWidgetModuleLoader[],
): ComponentType<PhiAuthoringWidgetModuleProps> {
  const componentsByType = new Map(
    loaders.map((entry) => [entry.type, createPhiLazyAuthoringWidget(entry.load)]),
  );

  return function PhiAuthoringWidgetModule({ type, children }) {
    const AuthoringWidget = componentsByType.get(type);
    return AuthoringWidget ? <AuthoringWidget>{children}</AuthoringWidget> : children(null);
  };
}
