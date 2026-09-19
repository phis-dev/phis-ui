import {
  PHI_CMS_COLLAPSIBLE_LAYOUT_MAX_SLOTS,
  PHI_CMS_DEFAULT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import type { PhiCmsPageNode, PhiCmsContentWidgetNode, PhiCmsLayoutNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiRuntimeModuleId } from "../../../types/cms-module-descriptors";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { createPhiSignalAddress } from "../../../types/signals";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "./phi-base-page-layout";

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
 * mode and lets it carry its own submit, so every Settings form saves the same way without
 * per-Module signal plumbing.
 */
type PhiSettingsPageShellFormSectionBase = {
  kind: "form";
  /** Preset-locally unique node key for the section's Form Widget instance id. */
  nodeKey: string;
  formId: string;
  label: string;
  initialValues?: Record<string, unknown>;
  /**
   * Extra form Widget config keys (for example a `source` binding plus `openActionKey` for a
   * record-editing Settings form). `signalRoutes` entries are appended to whatever the shell
   * wires itself instead of replacing it.
   */
  configOverrides?: Record<string, unknown> & {
    signalRoutes?: {
      emits?: readonly Record<string, unknown>[];
      listens?: readonly Record<string, unknown>[];
    };
  };
};

/**
 * A panel saves in one of two ways, and which one is a question about its contents.
 *
 * Several fields are a thought somebody finishes before it is written down, so they are saved
 * together with a Button. One switch is the whole thought: flipping it is the decision, and a Save
 * beside it would only ask a second time.
 *
 * The Button is the Form Widget's own (`submit: { label }`), not a Button Widget in the slot below:
 * only the Widget knows where the form's label column ends, so only a submit it draws lines up under
 * the inputs. A Form itself carries no submit -- that is the contract in FORMS.md, and the reason the
 * label is stated here rather than in the descriptor.
 *
 * The switch is still an ordinary Form -- same descriptor, same handler Provider, same gateway. What
 * differs is one route, which the shell states because only it knows the Form's address: the Form's
 * own `stateChange` comes back to its `submit` channel, so a change submits. A Route decides the
 * channel, the action and the value type it sends under, which is why no Widget needed a new ability
 * for this.
 */
export type PhiSettingsPageShellFormSection =
  | (PhiSettingsPageShellFormSectionBase & { submitLabel: string; submitOnChange?: never })
  | (PhiSettingsPageShellFormSectionBase & { submitOnChange: true; submitLabel?: never });

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
 * region roots on the shared base page scaffold, one Collapsible fills its slot, and every panel is
 * one of the Collapsible's slots. Modules pass their panels; they never build Settings layout
 * themselves.
 *
 * Each panel wraps its sections in a vertical Layout because a sequential slot renders exactly one
 * child node, while a panel is a description and then what it is about, or several sections at once.
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
  const nodes = createPhiCmsPresetNodes(page);
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
      ...panel.sections.map((section) => section.nodeKey),
    ]),
  ]);

  const scaffold = buildPhiBasePageContentScaffold({
    page,
    regionId,
    regionConfig: { border: false },
  });
  const layoutNodes: PhiCmsLayoutNode[] = [
    scaffold.layoutNode,
    // The base scaffold owns padding and background; the Collapsible only stacks the panels.
    nodes.layout({
      id: layouts.settingsPanels,
      parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
      creationPreset: { layoutKind: "collapsible", preset: "panel" },
      typeKey: "collapsible",
      slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
      sortOrder: 0,
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
        padding: 0,
        border: false,
      },
    }),
    ...panels.map((panel, panelIndex) =>
      nodes.layout({
        id: layouts[panel.nodeKey]!,
        parentLayoutNodeId: layouts.settingsPanels,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: panelIndex,
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
        nodes.widget({
          id: input.id,
          parentLayoutNodeId: panelLayoutId,
          typeKey: input.typeKey,
          slotIndex: panelSlot,
          sortOrder: panelSlot++,
          label: input.label,
          config: { translate: false, ...input.config },
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
                // Already translated, from the page's own label set, so the Widget states it outright.
                ...(section.submitOnChange ? {} : { submit: { label: section.submitLabel } }),
                execution: { mode: "handler" },
                source: null,
                ...configOverrides,
                signalRoutes: {
                  emits: [
                    ...(section.submitOnChange ? [{
                      routeKey: `${section.nodeKey}-change-submit`,
                      capabilityId: "stateChange",
                      scope: "page",
                      channel: "submit",
                      action: "activate",
                      valueType: "none",
                      receiver: formAddress,
                    }] : []),
                    ...(extraSignalRoutes?.emits ?? []),
                  ],
                  listens: [
                    /*
                     * Only the switch listens for a submit, because only the switch is sent one. A
                     * Form Widget's own Button presses the form directly -- one call, no channel --
                     * so a Settings form that carries its own Save has nothing to hear.
                     */
                    ...(section.submitOnChange ? [{
                      routeKey: `${section.nodeKey}-submit`,
                      capabilityId: "submit",
                      scope: "page",
                      channel: "submit",
                      action: "activate",
                      valueType: "none",
                      receiver: formAddress,
                    }] : []),
                    ...(extraSignalRoutes?.listens ?? []),
                  ],
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
    regions: [scaffold.region],
    layoutNodes,
    contentWidgets,
  };
}
