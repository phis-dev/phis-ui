import {
  PHI_CMS_COLLAPSIBLE_LAYOUT_MAX_SLOTS,
  PHI_CMS_DEFAULT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { PHI_COLOR, PHI_SPACE } from "../../../theme/antd-css-var-contract";
import type { PhiCmsPageNode, PhiCmsContentWidgetNode, PhiCmsLayoutNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiRuntimeModuleId } from "../../../types/cms-module-descriptors";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { createPhiSignalAddress } from "../../../types/signals";

export type PhiSettingsPageShellWidgetSection = {
  kind?: "widget";
  /** Preset-locally unique node key for the section's Widget instance id. */
  nodeKey: string;
  typeKey: string;
  label: string;
  config?: Record<string, unknown>;
};

/**
 * A descriptor-Form section: the shell places the generic `form` Widget in handler execution
 * mode and wires a primary submit Button to it over the standard submit signal channel, so
 * every Settings form saves the same way without per-Module signal plumbing.
 */
export type PhiSettingsPageShellFormSection = {
  kind: "form";
  /** Preset-locally unique node key; the submit Button derives `<nodeKey>Submit`. */
  nodeKey: string;
  formId: string;
  label: string;
  submitLabel: string;
  initialValues?: Record<string, unknown>;
  /**
   * Extra form Widget config keys (for example a `source` binding plus `openActionKey` for a
   * record-editing Settings form). `signalRoutes` entries are appended to the shell's standard
   * submit wiring instead of replacing it.
   */
  configOverrides?: Record<string, unknown> & {
    signalRoutes?: {
      emits?: readonly Record<string, unknown>[];
      listens?: readonly Record<string, unknown>[];
    };
  };
};

export type PhiSettingsPageShellSection =
  | PhiSettingsPageShellWidgetSection
  | PhiSettingsPageShellFormSection;

/**
 * One Collapsible panel of a Settings page: the panel title becomes the Collapsible slot title,
 * the optional description renders as the panel's leading text, and the sections stack vertically
 * inside the panel.
 */
export type PhiSettingsPageShellPanel = {
  /** Preset-locally unique node key for the panel's Layout node. */
  nodeKey: string;
  title: string;
  description?: string;
  sections: readonly PhiSettingsPageShellSection[];
};

/**
 * The one shared Settings page shell (SETTINGS.md section 4): every mounted Settings page composes
 * its tree through this builder. Navigation between Settings pages lives in the persistent Area
 * sidebar (the Settings container's children), so the shell renders content only: the page content
 * region roots directly on one Collapsible on the layout background, and every panel is one of its
 * slots. Modules pass their panels; they never build Settings layout themselves.
 *
 * Each panel wraps its sections in a vertical Layout because a sequential slot renders exactly one
 * child node, while a Form panel is always at least the Form plus its Save Button.
 */
export function buildPhiSettingsPageShellTree({
  page,
  ownerModuleId,
  presetKey,
  regionId,
  label,
  panels,
}: {
  page: PhiCmsPageNode;
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
  regionId: number;
  label: string;
  panels: readonly PhiSettingsPageShellPanel[];
}): PhiResolvedCmsPageTree {
  if (panels.length > PHI_CMS_COLLAPSIBLE_LAYOUT_MAX_SLOTS) {
    throw new Error(
      `Settings page "${presetKey}" declares ${panels.length} panels; the Collapsible Layout supports at most ${PHI_CMS_COLLAPSIBLE_LAYOUT_MAX_SLOTS}.`,
    );
  }

  const identity = { domain: "page" as const, ownerModuleId, presetKey };
  const layouts = createPhiPresetCmsInstanceIdMap(identity, [
    "settingsPanels",
    ...panels.map((panel) => panel.nodeKey),
  ]);
  const widgets = createPhiPresetCmsInstanceIdMap(identity, [
    ...panels.flatMap((panel) => [
      ...(panel.description !== undefined ? [`${panel.nodeKey}Description`] : []),
      ...panel.sections.flatMap((section) => section.kind === "form"
        ? [section.nodeKey, `${section.nodeKey}Submit`]
        : [section.nodeKey]),
    ]),
  ]);

  const layoutNodes: PhiCmsLayoutNode[] = [
    buildPhiCmsLayoutNode({
      id: layouts.settingsPanels,
      siteId: page.siteId,
      parentLayoutNodeId: null,
      creationPreset: { layoutKind: "collapsible", preset: "panel" },
      typeKey: "collapsible",
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      label,
      config: {
        slotTitles: panels.map((panel) => panel.title),
        translateSlotTitles: false,
        accordion: true,
        defaultOpenSlotKeys: ["slot_0"],
        titleStrong: true,
        width: "100%",
        maxWidth: "100%",
        margin: 0,
        padding: PHI_SPACE.base,
        background: PHI_COLOR.bgLayout,
        border: false,
      },
    }),
    ...panels.map((panel, panelIndex) =>
      buildPhiCmsLayoutNode({
        id: layouts[panel.nodeKey]!,
        siteId: page.siteId,
        parentLayoutNodeId: layouts.settingsPanels,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: panelIndex,
        sortOrder: panelIndex,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: panel.title,
        config: {
          gap: PHI_SPACE.base,
          padding: 0,
          border: false,
        },
      }),
    ),
  ];

  const contentWidgets: PhiCmsContentWidgetNode[] = [
    ...panels.flatMap((panel) => {
      const panelLayoutId = layouts[panel.nodeKey]!;
      let panelSlot = 0;

      const buildPanelWidget = (input: {
        id: PhiCmsContentWidgetNode["id"];
        typeKey: string;
        label: string;
        config: Record<string, unknown>;
      }) =>
        buildPhiCmsWidgetNode({
          id: input.id,
          siteId: page.siteId,
          parentLayoutNodeId: panelLayoutId,
          typeKey: input.typeKey,
          slotIndex: panelSlot,
          sortOrder: panelSlot++,
          status: PhiCmsStatus.Published,
          flags: 0,
          visibilityMask: page.visibilityMask,
          label: input.label,
          config: { translate: false, ...input.config },
          contentId: null,
        });

      return [
        ...(panel.description !== undefined
          ? [buildPanelWidget({
              id: widgets[`${panel.nodeKey}Description`]!,
              typeKey: "description",
              label: panel.title,
              config: { description: panel.description },
            })]
          : []),
        ...panel.sections.flatMap((section): PhiCmsContentWidgetNode[] => {
          if (section.kind !== "form") {
            return [buildPanelWidget({
              id: widgets[section.nodeKey]!,
              typeKey: section.typeKey,
              label: section.label,
              config: section.config ?? {},
            })];
          }

          const formAddress = createPhiSignalAddress("cms", widgets[section.nodeKey]!);
          const { signalRoutes: extraSignalRoutes, ...configOverrides } = section.configOverrides ?? {};
          return [
            buildPanelWidget({
              id: widgets[section.nodeKey]!,
              typeKey: "form",
              label: section.label,
              config: {
                formId: section.formId,
                formConfig: section.initialValues ? { initialValues: section.initialValues } : {},
                execution: { mode: "handler" },
                source: null,
                ...configOverrides,
                signalRoutes: {
                  emits: [...(extraSignalRoutes?.emits ?? [])],
                  listens: [
                    {
                      routeKey: `${section.nodeKey}-submit`,
                      capabilityId: "submit",
                      scope: "page",
                      channel: "submit",
                      action: "activate",
                      valueType: "none",
                      receiver: formAddress,
                    },
                    ...(extraSignalRoutes?.listens ?? []),
                  ],
                },
              },
            }),
            buildPanelWidget({
              id: widgets[`${section.nodeKey}Submit`]!,
              typeKey: "button",
              label: section.submitLabel,
              config: {
                key: "submit",
                label: section.submitLabel,
                buttonType: "primary",
                signalRoutes: {
                  emits: [{
                    routeKey: `${section.nodeKey}-submit-button`,
                    capabilityId: "activate",
                    scope: "page",
                    channel: "submit",
                    action: "activate",
                    valueType: "none",
                    receiver: formAddress,
                  }],
                },
              },
            }),
          ];
        }),
      ];
    }),
  ];

  return {
    page: { ...page, pageType: PhiCmsPageType.Standard, status: PhiCmsStatus.Published },
    pageMeta: {
      title: { msgId: 0, source: label, value: label },
      description: null,
    },
    overlays: [],
    regions: [{
      id: regionId,
      pageId: page.id,
      areaPresetId: null,
      regionType: PhiCmsRegionType.Content,
      rootLayoutNodeId: layouts.settingsPanels,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: 30,
      config: { maxSize: { width: 1440 }, margin: "0 auto", border: false },
    }],
    layoutNodes,
    contentWidgets,
  };
}
