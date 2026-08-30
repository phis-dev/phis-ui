"use client";

import { useEffect, useMemo, type ReactNode } from "react";

import type {
  PhiCmsBuilderWidgetPlugin,
  PhiCmsContentWidgetNode,
  PhiResolvedCmsRenderableTree,
} from "../../../types";
import {
  materializePhiWidgetRuntimeControllerSettings,
  type PhiRuntimeControllerMaterializationOwner,
} from "../../../components/runtime/runtime-controller-materialization";
import { registerPhiBuilderDemandControllerSettings } from "./demand-controller-store";

export function PhiBuilderDemandControllerRegistration({
  area,
  ownerKey,
  ownerMountScope,
  pageKey,
  widget,
  tree,
  plugin,
  children,
}: {
  area: string;
  ownerKey: string;
  ownerMountScope: PhiRuntimeControllerMaterializationOwner;
  pageKey: string | null;
  widget: PhiCmsContentWidgetNode;
  tree: PhiResolvedCmsRenderableTree;
  plugin: PhiCmsBuilderWidgetPlugin<unknown>;
  children: ReactNode;
}) {
  const settings = useMemo(
    () => materializePhiWidgetRuntimeControllerSettings({
      widget,
      tree,
      ownerMountScope,
      plugin,
    }),
    [ownerMountScope, plugin, tree, widget],
  );
  const registrationKey = `${ownerKey}:widget:${widget.id}`;

  useEffect(
    () => registerPhiBuilderDemandControllerSettings(
      area,
      registrationKey,
      ownerKey,
      ownerMountScope,
      pageKey,
      settings,
    ),
    [area, ownerKey, ownerMountScope, pageKey, registrationKey, settings],
  );

  return children;
}
