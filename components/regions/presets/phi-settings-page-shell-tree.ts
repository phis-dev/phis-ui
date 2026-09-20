import {
  PHI_CMS_COLLAPSIBLE_LAYOUT_MAX_SLOTS,
  PHI_CMS_DEFAULT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { PHI_LAYOUT } from "../../../theme/phi-tokens";
import type { PhiCmsPageNode, PhiCmsContentWidgetNode, PhiCmsLayoutNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiRuntimeModuleId } from "../../../types/cms-module-descriptors";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_SIGNAL_VALUE_SCHEMAS, createPhiSignalAddress } from "../../../types/signals";
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
   * What this placement knows and the registered descriptor cannot.
   *
   * A Form is the same on every Site; which languages a Site offers is not, and the Page holds that
   * answer while it renders. It travels in the Form Widget's own config, where the options resolution
   * reads it under the field's own config -- so a list the Page had is in the HTML it sends.
   */
  formConfig?: Record<string, unknown>;
  /**
   * What a saved panel says, for a Form whose descriptor says nothing on success.
   *
   * Settings panels report through the application feedback instead of in place: a panel is one of
   * several, and a switch that saves on change has no success panel to show. Where the Form's own
   * descriptor has success wording, that wins -- it is more specific than "Saved" ever is.
   */
  savedMessage?: string;
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
 * One dialog of a Settings page: a Form in a Modal, opened by a Table action.
 *
 * A Settings page states its parts in panels, but a record that is created and edited is not a part of
 * the page -- it is a row, and the place to reach it is the Table it is in. A panel per Form turns one
 * section into three, two of which are empty most of the time and describe a thing the reader is not
 * looking at. So `+` in the Table's toolbar opens one, the row's edit action opens the other, and the
 * page keeps one panel for the providers.
 *
 * **The buttons are the Overlay's, not the Form's.** A Form Widget can draw its own submit, and every
 * panel Form does, because only the Widget knows where its label column ends. In a dialog that argument
 * is gone and a worse one takes its place: a dialog whose button sits in the body next to one whose
 * button sits in the footer are two different dialogs to a reader. So the Footer carries a Command
 * Toolbar, and it presses the Form through its `submit` capability -- which `form/config.ts` calls the
 * ordinary way in: "a form is submitted by whoever holds its `submit` capability".
 */
export type PhiSettingsPageShellOverlay = {
  /**
   * Preset-locally unique node key. The Overlay, its Body and Footer Layouts, the Form Widget and the
   * Footer's Command Toolbar all derive from it, so one key names the whole dialog.
   */
  nodeKey: string;
  title: string;
  /**
   * The Table action that opens it.
   *
   * A Table names the action in the message rather than on the channel, so the Overlay is told which
   * one is its own (`openActionKey` in [OVERLAYS.md](../../../OVERLAYS.md)). Without it the only way to
   * point a row at a dialog is a Controller that forwards one signal.
   *
   * The route in the other direction is the Table's: it addresses this Overlay by the id the shell
   * derives from `nodeKey`, which the caller derives the same way -- the preset identity is shared.
   */
  openActionKey: string;
  formId: string;
  label: string;
  formConfig?: Record<string, unknown>;
  /** What the Form Widget's config says beyond the shell's defaults, its routes included. */
  configOverrides?: PhiSettingsPageShellFormSectionBase["configOverrides"];
  savedMessage?: string;
  submitLabel: string;
  cancelLabel: string;
  /** Responsive Modal width, for a Form that needs more or less than the Modal's own default. */
  width?: Record<string, unknown> | number | string;
};

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
  overlays = [],
}: {
  page: PhiCmsPageNode;
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
  regionId: number;
  label: string;
  panels: readonly PhiSettingsPageShellPanel[];
  overlays?: readonly PhiSettingsPageShellOverlay[];
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
    // An Overlay zone Layout is a top-level node, not a child of the page: it belongs to the dialog.
    ...overlays.flatMap((overlay) => [`${overlay.nodeKey}Body`, `${overlay.nodeKey}Footer`]),
  ]);
  const widgets = createPhiPresetCmsInstanceIdMap(identity, [
    ...panels.flatMap((panel) => [
      ...(panel.description !== undefined ? [`${panel.nodeKey}Description`] : []),
      ...panel.sections.map((section) => section.nodeKey),
    ]),
    ...overlays.flatMap((overlay) => [`${overlay.nodeKey}Form`, `${overlay.nodeKey}Commands`]),
  ]);
  const overlayIds = createPhiPresetCmsInstanceIdMap(
    identity,
    overlays.map((overlay) => overlay.nodeKey),
  );

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
        /*
         * Where the Settings column stops. Set here rather than on each Form: the panels are what a
         * reader's eye follows down the page, and a panel running the full width of a wide screen with
         * a narrow form inside it reads as two columns that do not line up. One maximum on the
         * Collapsible holds titles, descriptions and forms in the same column.
         *
         * A maximum, not a width -- the Collapsible still fills a narrow screen edge to edge.
         */
        maxSize: { width: PHI_LAYOUT.contentMax },
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
    /*
     * The dialogs' zones. Top-level Layout nodes with no parent, because they belong to the Overlay and
     * not to the page -- and because they are the padding owners the Modal shell deliberately has none
     * of (OVERLAYS.md, "Padding ownership").
     */
    ...overlays.flatMap((overlay) => [
      nodes.layout({
        id: layouts[`${overlay.nodeKey}Body`]!,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: overlay.title,
        config: {
          gap: PHI_SPACE.base,
          padding: PHI_SPACE.base,
          border: false,
        },
      }),
      nodes.layout({
        id: layouts[`${overlay.nodeKey}Footer`]!,
        parentLayoutNodeId: null,
        // Empty config on purpose: the actions Footer takes its canonical padding from this preset alone.
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: overlay.title,
        config: {},
      }),
    ]),
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
                formConfig: {
                  ...(section.initialValues ? { initialValues: section.initialValues } : {}),
                  ...section.formConfig,
                },
                // Already translated, from the page's own label set, so the Widget states it outright.
                ...(section.submitOnChange ? {} : { submit: { label: section.submitLabel } }),
                /*
                 * Every Settings panel reports what a save did, because nothing else here does: the
                 * panel may be collapsed, it may be one of six, and a switch has no success panel.
                 */
                feedback: {
                  mode: "message",
                  ...(section.savedMessage ? { successText: section.savedMessage } : {}),
                },
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
    ...overlays.flatMap((overlay): PhiCmsContentWidgetNode[] => {
      const overlayAddress = createPhiSignalAddress("cms", overlayIds[overlay.nodeKey]!);
      const formAddress = createPhiSignalAddress("cms", widgets[`${overlay.nodeKey}Form`]!);
      const { signalRoutes: extraSignalRoutes, ...configOverrides } = overlay.configOverrides ?? {};
      return [
        nodes.widget({
          id: widgets[`${overlay.nodeKey}Form`]!,
          parentLayoutNodeId: layouts[`${overlay.nodeKey}Body`]!,
          typeKey: "form",
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          label: overlay.label,
          config: {
            translate: false,
            formId: overlay.formId,
            formConfig: { ...overlay.formConfig },
            /*
             * No `submit` of its own. The Footer's Command Toolbar presses this Form through its
             * `submit` capability, and a second button inside the body would be a second way to do the
             * same thing in the same dialog.
             */
            feedback: {
              mode: "message",
              ...(overlay.savedMessage ? { successText: overlay.savedMessage } : {}),
            },
            execution: { mode: "handler" },
            source: null,
            ...configOverrides,
            signalRoutes: {
              emits: [
                // A dialog that saved is a dialog that is finished; what else the save means is the
                // caller's route, which is how the Table hears that it should reload.
                {
                  routeKey: `${overlay.nodeKey}-success-close`,
                  capabilityId: "submitSuccess",
                  scope: "page",
                  channel: "dialog",
                  action: "close",
                  valueType: "none",
                  receiver: overlayAddress,
                },
                ...(extraSignalRoutes?.emits ?? []),
              ],
              listens: [
                {
                  routeKey: `${overlay.nodeKey}-submit`,
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
        nodes.widget({
          id: widgets[`${overlay.nodeKey}Commands`]!,
          parentLayoutNodeId: layouts[`${overlay.nodeKey}Footer`]!,
          typeKey: "command-toolbar",
          slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
          sortOrder: 0,
          label: overlay.title,
          config: {
            translate: false,
            key: `${overlay.nodeKey}-commands`,
            compact: true,
            wrap: false,
            showLabels: true,
            buttons: [
              { key: "cancel", emits: [{ capabilityId: "close", value: null }], label: overlay.cancelLabel },
              { key: "submit", emits: [{ capabilityId: "submit", value: null }], label: overlay.submitLabel, buttonType: "primary" },
            ],
            signalRoutes: {
              emits: [
                {
                  routeKey: `${overlay.nodeKey}-cancel`,
                  capabilityId: "close",
                  scope: "page",
                  channel: "dialog",
                  action: "close",
                  valueType: "none",
                  receiver: overlayAddress,
                },
                {
                  routeKey: `${overlay.nodeKey}-commands-submit`,
                  capabilityId: "submit",
                  scope: "page",
                  channel: "submit",
                  action: "activate",
                  valueType: "none",
                  receiver: formAddress,
                },
              ],
            },
          },
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
    overlays: overlays.map((overlay, overlayIndex) => ({
      id: overlayIds[overlay.nodeKey]!,
      overlayType: "modal" as const,
      headerLayoutNodeId: null,
      bodyLayoutNodeId: layouts[`${overlay.nodeKey}Body`]!,
      footerPresentation: "actions" as const,
      footerLayoutNodeId: layouts[`${overlay.nodeKey}Footer`]!,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: overlayIndex,
      label: overlay.title,
      config: {
        title: overlay.title,
        ...(overlay.width === undefined ? {} : { width: overlay.width }),
        /*
         * `remount` rather than `lazy-keep`: a dialog that creates a record and one that edits a row
         * both start from what they were given, and a body kept from the last time would open showing
         * the provider somebody looked at before.
         */
        mountPolicy: "remount",
        closeMode: "immediate",
        openActionKey: overlay.openActionKey,
        signalRoutes: {
          listens: [
            /*
             * The Table's own action channel, filtered by `openActionKey`. Without the filter this
             * Overlay would open for every action the Table announces, delete included.
             */
            {
              routeKey: `${overlay.nodeKey}-open`,
              capabilityId: "open",
              scope: "page",
              channel: "action",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: createPhiSignalAddress("cms", overlayIds[overlay.nodeKey]!),
            },
            {
              routeKey: `${overlay.nodeKey}-close`,
              capabilityId: "close",
              scope: "page",
              channel: "dialog",
              action: "close",
              valueType: "none",
              receiver: createPhiSignalAddress("cms", overlayIds[overlay.nodeKey]!),
            },
          ],
        },
      },
    })),
    regions: [scaffold.region],
    layoutNodes,
    contentWidgets,
  };
}
