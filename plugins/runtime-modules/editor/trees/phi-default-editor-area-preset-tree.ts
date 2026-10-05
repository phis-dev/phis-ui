import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_EDITOR_RUNTIME_MODULE_ID } from "../ids";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import {
  buildPhiAreaShellHeaderNodes,
  buildPhiAreaShellSiderLeftNodes,
  concatPhiAreaShellPresetNodes,
} from "../../../../components/regions/presets/phi-area-shell-preset-nodes";
import type { PhiResolvedCmsPageTree, PhiCmsPageNode } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { getPhiEditorAreaLabels } from "./editor-label-set";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../area-module-defaults";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";

const SYNTHETIC_EDITOR_REGION_IDS = {
  regionHeaderTop: -140,
  regionHeaderMain: -141,
  regionSiderLeft: -150,
} as const;

const SYNTHETIC_EDITOR_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-area-preset",
}, [
  "layoutHeaderTop",
  "layoutHeaderTopActions",
  "layoutHeaderMain",
  "layoutSiderLeft",
]);

const SYNTHETIC_EDITOR_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-area-preset",
}, [
  "widgetHeaderMainPageTitle",
  "widgetHeaderTopAccount",
  "widgetSiderLeftNav",
]);

export async function buildPhiDefaultEditorAreaPresetTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiEditorAreaLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });
  const nodes = createPhiCmsPresetNodes(page);
  const ids = { ...SYNTHETIC_EDITOR_REGION_IDS, ...SYNTHETIC_EDITOR_LAYOUT_IDS, ...SYNTHETIC_EDITOR_WIDGET_IDS };
  return {
    page,
    runtimeModuleIds: createPhiDefaultAreaRuntimeModuleIds("editor"),
    overlays: [],
    ...concatPhiAreaShellPresetNodes(
      buildPhiAreaShellHeaderNodes({ nodes, runtime, labelPrefix: "editor", ids }),
      buildPhiAreaShellSiderLeftNodes({
        nodes,
        runtime,
        labelPrefix: "editor",
        navKey: "editor:sidebar",
        navItems: [
          { key: "editor-dashboard", label: labels.dashboard, href: "/", icon: "antd:dashboard" },
          { key: "editor-text", label: labels.text, href: "/text", icon: "antd:file-text" },
          { key: "editor-translations", label: labels.translations, href: "/translations", icon: "antd:translation" },
          { key: "editor-profile", label: labels.profile, href: "/profile", icon: "antd:user" },
        ],
        ids,
      }),
    ),
  };
}
