"use client";

import { EyeOutlined } from "@ant-design/icons";

import {
  mapPhiPresetPageNodesToTreeOptions,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import { mapPhiTreeOptionsToDataNodes } from "./tree-options";
import type { PhiDeveloperBuilderNodeKind } from "./developer-workspace-types";

export function flattenPhiDeveloperBuilderPages(pages: PhiPresetPageNode[]) {
  return mapPhiTreeOptionsToDataNodes(mapPhiPresetPageNodesToTreeOptions(pages), {
    renderIcon: () => <EyeOutlined />,
  });
}

export function getPhiDeveloperBuilderNodeKindLabel(kind: PhiDeveloperBuilderNodeKind) {
  switch (kind) {
    case "page":
      return "Page";
    case "region":
      return "Region";
    case "layout":
      return "Layout";
    case "widget":
      return "Widget";
    case "slot":
      return "Slot";
  }
}
