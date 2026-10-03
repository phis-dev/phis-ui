import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { PHI_COLOR, PHI_SPACE } from "../../../../theme/antd-css-var-contract";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  createPhiSignalSubcontrolAddress,
  type PhiSignalRoute,
} from "../../../../types/signals";
import type { PhiBlockRuntime } from "../../../../types/widget-runtime";
import { createPhiBuilderControllerAddress } from "../controller/address";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import {
  PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS,
  PHI_BUILDER_INSPECTOR_LAYOUT_IDS,
  PHI_BUILDER_INSPECTOR_OVERLAY_IDS,
  PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS,
  PHI_BUILDER_INSPECTOR_WIDGET_IDS,
} from "../inspector-overlay-addresses";
import { PHI_BUILDER_EFFECTS_SECTIONS } from "../effects-form-values";
import { PHI_BUILDER_EFFECTS_FORM_IDS } from "../page-meta-form";
import { PHI_BUILDER_SIGNAL_WIRING_FORM_ID } from "../signal-wiring-form";
import { getPhiEffectsWidgetLabels } from "../../../../components/widgets/label-sets/effects";
import { getPhiInspectorWidgetLabels } from "../../../../components/widgets/label-sets/inspector";
import { getPhiSignalsWidgetLabels } from "../../../../components/widgets/label-sets/signals";
import type { PhiInspectorWidgetLabels } from "../../../../components/widgets/label-types/inspector";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";

const PHI_BUILDER_INSPECTOR_SECTIONS = {
  region: [
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionGeometry, "builder-region-geometry-inspector", "geometry"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionViewport, "builder-region-viewport-inspector", "viewport"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionPadding, "builder-region-padding-inspector", "padding"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionBackground, "builder-region-background-inspector", "background"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionBorder, "builder-region-border-inspector", "border"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.regionShadow, "builder-region-shadow-inspector", "shadow"],
  ],
  layout: [
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutSettings, "builder-layout-settings-inspector", "settings"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutAnchor, "builder-layout-anchor-inspector", "anchor"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutPadding, "builder-layout-padding-inspector", "padding"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutViewport, "builder-layout-viewport-inspector", "viewport"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutBackground, "builder-layout-background-inspector", "background"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutBorder, "builder-layout-border-inspector", "border"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutShadow, "builder-layout-shadow-inspector", "shadow"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.layoutSignals, "builder-layout-signals-inspector", "signals"],
  ],
  widget: [
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.widgetSettings, "builder-widget-settings-inspector", "settings"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.widgetGeometry, "builder-widget-geometry-inspector", "geometry"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.widgetViewport, "builder-widget-viewport-inspector", "viewport"],
    [PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS.widgetSignals, "builder-widget-signals-inspector", "signals"],
  ],
} as const;

function resolveBuilderInspectorSectionTitle(
  labels: PhiInspectorWidgetLabels,
  sectionKey: keyof PhiInspectorWidgetLabels["sections"],
) {
  return labels.sections[sectionKey];
}

/**
 * The Builder's own Overlays: three Inspector Drawers, the Effects editor, and Signal wiring.
 *
 * They are a Module contribution rather than part of the Builder Area shell preset, and that is the
 * whole point of this file. A shell preset is a starting point an operator may save over -- and the
 * saved snapshot then becomes the only source of truth for that Area, which is what
 * `/builder/phis/ui/shells` promises. The Inspectors are not shell content an operator authors; they
 * are the tool doing the authoring. Declared in the shell, they disappeared the moment somebody saved
 * the Builder Area's own shell: the Drawers no longer existed, the Controller's `dialog/activate` had
 * nobody to reach, and every Inspector click did nothing at all.
 *
 * Contributed here, they are composed onto whatever Area tree is resolved -- code preset or saved
 * snapshot alike -- for as long as the Builder Module is active in the Builder Area.
 */
export async function buildPhiBuilderInspectorAreaOverlayTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labelOptions = {
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  };
  const [inspectorLabels, signalsLabels, effectsLabels] = await Promise.all([
    getPhiInspectorWidgetLabels(labelOptions),
    getPhiSignalsWidgetLabels(labelOptions),
    getPhiEffectsWidgetLabels(labelOptions),
  ]);

  const nodes = createPhiCmsPresetNodes(page);
  return {
    page,
    regions: [],
    overlays: [
      ...([
      [PHI_BUILDER_INSPECTOR_OVERLAY_IDS.regionInspector, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorHeader, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorBody, "Region inspector", "region"],
      [PHI_BUILDER_INSPECTOR_OVERLAY_IDS.layoutInspector, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorHeader, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorBody, "Layout inspector", "layout"],
      [PHI_BUILDER_INSPECTOR_OVERLAY_IDS.widgetInspector, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorHeader, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorBody, "Widget inspector", "widget"],
    ] as const).map(([id, headerLayoutNodeId, bodyLayoutNodeId, title, view], index) => nodes.overlay({
      id,
      overlayType: "drawer",
      headerLayoutNodeId,
      bodyLayoutNodeId,
      sortOrder: index,
      label: title,
      config: {
        title: null,
        placement: "right",
        size: 377,
        mountPolicy: "lazy-keep",
        surface: { background: { base: { kind: "none" }, filter: "glass" } },
        mask: {
          appearance: "transparent",
          allowOutsideInteraction: false,
          closable: true,
        },
        signalRoutes: {
          emits: [{ routeKey: `builder-${view}-inspector-visibility`, capabilityId: "openChange", scope: "area", channel: "inspectorVisibility", action: "change", valueType: "boolean", receiver: createPhiBuilderControllerAddress() }],
          listens: [
            { routeKey: `builder-${view}-inspector-open`, capabilityId: "open", scope: "area", channel: "dialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", id) },
            { routeKey: `builder-${view}-inspector-close`, capabilityId: "close", scope: "area", channel: "dialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", id) },
          ],
        },
      },
      })),
      nodes.overlay({
        id: PHI_BUILDER_INSPECTOR_OVERLAY_IDS.effectsEditor,
        overlayType: "modal",
        headerLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsHeader,
        bodyLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody,
        footerPresentation: "actions",
        footerLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsFooter,
        sortOrder: 10,
        label: "Builder effects",
        config: {
          title: effectsLabels.modalTitle,
          controlSize: "medium",
          mountPolicy: "eager",
          closeMode: "request",
          signalRoutes: {
            emits: [
              { routeKey: "builder-effects-visibility", capabilityId: "openChange", scope: "area", channel: "effectsVisibility", action: "change", valueType: "boolean", receiver: createPhiBuilderControllerAddress() },
              { routeKey: "builder-effects-close-request", capabilityId: "closeRequest", scope: "area", channel: "effects", action: "close", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest, receiver: createPhiBuilderControllerAddress() },
            ],
            listens: [
              { routeKey: "builder-effects-open", capabilityId: "open", scope: "area", channel: "dialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.effectsEditor) },
              { routeKey: "builder-effects-close", capabilityId: "close", scope: "area", channel: "dialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.effectsEditor) },
            ],
          },
        },
      }),
      nodes.overlay({
        /*
         * Signal wiring. The Modal, its Form and its footer actions are declared here rather than built
         * as a React Modal of its own -- the wiring surface predates the overlay contract and was dropped
         * during the overlay consolidation because of it.
         */
        id: PHI_BUILDER_INSPECTOR_OVERLAY_IDS.signalWiring,
        overlayType: "modal",
        bodyLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        footerPresentation: "actions",
        footerLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringFooter,
        sortOrder: 11,
        label: "Builder signal wiring",
        config: {
          title: signalsLabels.routes.modalTitle,
          controlSize: "medium",
          mountPolicy: "eager",
          closeMode: "request",
          signalRoutes: {
            emits: [
              { routeKey: "builder-signal-wiring-visibility", capabilityId: "openChange", scope: "area", channel: "signalWiringVisibility", action: "change", valueType: "boolean", receiver: createPhiBuilderControllerAddress() },
              { routeKey: "builder-signal-wiring-close-request", capabilityId: "closeRequest", scope: "area", channel: "signalWiring", action: "close", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest, receiver: createPhiBuilderControllerAddress() },
            ],
            listens: [
              { routeKey: "builder-signal-wiring-open", capabilityId: "open", scope: "area", channel: "dialog", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.signalWiring) },
              { routeKey: "builder-signal-wiring-close", capabilityId: "close", scope: "area", channel: "dialog", action: "close", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_OVERLAY_IDS.signalWiring) },
            ],
          },
        },
      }),
    ],
    layoutNodes: [
      ...([[
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorHeader,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorHeader,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorHeader,
      ]] as const).map(([id]) => nodes.layout({
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        id,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Builder inspector header",
        config: {
          anchor: { horizontal: "left", vertical: "middle" },
          gap: PHI_SPACE.sm,
          padding: 0,
          paddingLeft: PHI_SPACE.lg,
        },
      })),
      ...([[
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.region,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.layout,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.widget,
      ]] as const).map(([id, sections]) => nodes.layout({
        typeKey: "collapsible",
        id,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Builder inspector sections",
        config: {
          ghost: true,
          // One section at a time: the Drawer is long enough that two open sections push the second
          // one past the fold. Settings stays the section that opens with the Drawer, so it mounts
          // and can hide its own slot when the layout declares nothing for it.
          accordion: true,
          padding: PHI_SPACE.sm,
          innerPadding: PHI_SPACE.sm,
          slotTitles: sections.map(([, , sectionKey]) =>
            resolveBuilderInspectorSectionTitle(inspectorLabels, sectionKey)
          ),
          defaultOpenSlotKeys: ["slot_0"],
        },
      })),
      nodes.layout({
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsHeader,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Builder effects header",
        config: { anchor: { horizontal: "center", vertical: "middle" }, gap: 0, padding: 0 },
      }),
      nodes.layout({
        typeKey: "stack",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Builder effects body",
        config: {
          mountPolicy: "eager",
          slotTransition: "fade-over",
          defaultActiveSlotKey: "slot_0",
          padding: PHI_SPACE.base,
          surface: { background: { base: { kind: "color", color: PHI_COLOR.bgLayout } } },
        },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsFooter,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Builder effects footer",
        config: {},
      }),
      nodes.layout({
        /*
         * The creation preset has to name the Layout's OWN kind. The horizontal Flex panel preset sets
         * `paddingTop: 0` and `paddingBottom: 0` -- right for a row of controls, wrong for a column --
         * and those per-side values outrank the scalar `padding` below, which is how the wiring body
         * ended up with side padding only.
         */
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Builder signal wiring body",
        config: { gap: PHI_SPACE.sm, padding: PHI_SPACE.base },
      }),
      nodes.layout({
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringFooter,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Builder signal wiring footer",
        config: {},
      }),
    ],
    contentWidgets: [
      ...([[
        PHI_BUILDER_INSPECTOR_WIDGET_IDS.regionInspectorHeaderWidget,
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorHeader,
      ], [
        PHI_BUILDER_INSPECTOR_WIDGET_IDS.layoutInspectorHeaderWidget,
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorHeader,
      ], [
        PHI_BUILDER_INSPECTOR_WIDGET_IDS.widgetInspectorHeaderWidget,
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorHeader,
      ]] as const).map(([id, parentLayoutNodeId]) => nodes.widget({
        typeKey: "builder-inspector-header",
        id,
        parentLayoutNodeId,
        slotIndex: 0,
        label: "Builder inspector header",
        config: {},
      })),
      ...([[
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.region,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.layout,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorBody,
        PHI_BUILDER_INSPECTOR_SECTIONS.widget,
      ]] as const).flatMap(([parentLayoutNodeId, sections]) => sections.map(([id, typeKey, sectionKey], slotIndex) => nodes.widget({
        typeKey,
        id,
        parentLayoutNodeId,
        slotIndex,
        sortOrder: 0,
        label: `Builder ${resolveBuilderInspectorSectionTitle(inspectorLabels, sectionKey)}`,
        config: {
          signalRoutes: {
            emits: [{
              routeKey: `${typeKey}-change`,
              capabilityId: "change",
              scope: "area",
              channel: "inspector",
              action: "change",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderInspector,
              receiver: createPhiBuilderControllerAddress(),
            }],
          },
        },
      }))),
      nodes.widget({
        typeKey: "tab-bar",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsTabs,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsHeader,
        slotIndex: 0,
        label: "Builder effects tabs",
        config: {
          key: "builder-effects-tabs",
          value: "0",
          valueMode: "stack-slot-index",
          controlSize: "small",
          signalRoutes: {
            emits: [
              { routeKey: "builder-effects-stack-meta-request", capabilityId: "stackMeta", scope: "area", channel: "stackMeta", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody) },
              { routeKey: "builder-effects-stack-slot-change", capabilityId: "activeSlotIndex", scope: "area", channel: "activeSlotIndex", action: "change", valueType: "number", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody) },
            ],
            listens: [
              { routeKey: "builder-effects-stack-meta-response", capabilityId: "stackMeta", scope: "area", channel: "stackMeta", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.stackMeta, receiver: "broadcast" },
            ],
          },
        },
      }),
      ...PHI_BUILDER_EFFECTS_SECTIONS.map((section, slotIndex) => {
        const id = PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS[section];
        return nodes.widget({
          typeKey: "form",
          id,
          parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody,
          slotIndex,
          sortOrder: 0,
          /*
           * The caption of the tab above, not just a name for the node.
           *
           * A Stack publishes the labels of its children through `stackMeta` (`resolvePhiStackSlotMeta`)
           * and the tab bar reads them from there -- it has no `slotTitles` of its own, that vocabulary
           * belongs to the Collapsible. So the three tabs are named here, from the Effects set, and were
           * three English words written into this preset for as long as they were only node names.
           */
          label: effectsLabels.sections[
            section === "appearance" ? "transparency" : section === "transitions" ? "transitions" : "viewportEffects"
          ],
          config: {
            formId: PHI_BUILDER_EFFECTS_FORM_IDS[section],
            formConfig: {},
            /*
             * The Form takes the width of the Modal, because the Modal already chose one.
             *
             * Unstated, the parser answers with the house measure `PHI_LAYOUT.contentMax` -- 610, the
             * width a labelled form wants where it stands on a page and the page is wider than any form
             * should be. A `medium` Modal leaves 688 inside the body's `base` padding, so that cap left
             * 78 over, and the Stack's centred anchor split it into 39 of empty ground on either side:
             * the fields stood 55 from the sides and 16 from the top, which reads as a padding nobody
             * wrote. Here the placement is the answer the cap is for -- a box whose width is already the
             * decision -- so the Form really does take its slot.
             */
            maxFormWidth: "100%",
            execution: { mode: "signal" },
            source: null,
            signalRoutes: {
              emits: [
                { routeKey: `builder-effects-${section}-values`, capabilityId: "submitValues", scope: "area", channel: `effectsForm:${section}`, action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues, receiver: createPhiBuilderControllerAddress() },
                { routeKey: `builder-effects-${section}-validation`, capabilityId: "validationFailed", scope: "area", channel: `effectsFormValidation:${section}`, action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValidity, receiver: createPhiBuilderControllerAddress() },
                /*
                 * Appearance alone says its values on the way, because it alone can be shown on the way.
                 *
                 * A transparency is a style the node simply has, so the canvas can draw the value under
                 * the finger. A transition and a viewport effect are motions: showing one means replaying
                 * it, which is what the preview button on the node is for, and a message per keystroke
                 * would only restart an animation nobody has finished describing.
                 */
                ...(section === "appearance"
                  ? [{ routeKey: `builder-effects-${section}-live`, capabilityId: "valuesChange", scope: "area", channel: `effectsPreview:${section}`, action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues, receiver: createPhiBuilderControllerAddress() } satisfies PhiSignalRoute]
                  : []),
              ],
              listens: [
                { routeKey: `builder-effects-${section}-submit-form`, capabilityId: "submit", scope: "area", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", id) },
                { routeKey: `builder-effects-${section}-reset-form`, capabilityId: "reset", scope: "area", channel: "reset", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", id) },
              ],
            },
          },
        });
      }),
      nodes.widget({
        typeKey: "command-toolbar",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsCommands,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsFooter,
        slotIndex: 0,
        label: "Builder effects commands",
        config: {
          key: "builder-effects-commands",
          /*
           * The two buttons as one group, the way the Area settings footer states it: they are the two
           * ends of a single decision, and a gap between them reads as two unrelated offers. Wrapping
           * follows from that and is not stated -- a compact group does not wrap.
           */
          compact: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", label: effectsLabels.cancel, variant: "normal" },
            { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", label: effectsLabels.save, variant: "primary" },
          ],
          signalRoutes: {
            emits: [{ routeKey: "builder-effects-command", capabilityId: "command", scope: "area", channel: "effects", action: "activate", valueType: "string", receiver: createPhiBuilderControllerAddress() }],
            listens: [{
              routeKey: "builder-effects-save-loading",
              capabilityId: "loading",
              scope: "area",
              channel: "effectsSubmitting",
              action: "change",
              valueType: "boolean",
              receiver: createPhiSignalSubcontrolAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsCommands, "save"),
            }],
          },
        },
      }),
      nodes.widget({
        typeKey: "form",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringForm,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "Signal wiring",
        config: {
          formId: PHI_BUILDER_SIGNAL_WIRING_FORM_ID,
          formConfig: {},
          // The same answer the Effects Forms give, for the same reason: this Modal is `medium` too, so
          // the house cap of 610 would leave 78 of its 688 over and the fields would sit 55 from the
          // sides against 16 from the top.
          maxFormWidth: "100%",
          execution: { mode: "signal" },
          source: null,
          signalRoutes: {
            emits: [
              { routeKey: "builder-signal-wiring-values", capabilityId: "submitValues", scope: "area", channel: "signalWiringForm", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues, receiver: createPhiBuilderControllerAddress() },
              { routeKey: "builder-signal-wiring-validation", capabilityId: "validationFailed", scope: "area", channel: "signalWiringFormValidation", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValidity, receiver: createPhiBuilderControllerAddress() },
            ],
            listens: [
              { routeKey: "builder-signal-wiring-submit-form", capabilityId: "submit", scope: "area", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringForm) },
              { routeKey: "builder-signal-wiring-reset-form", capabilityId: "reset", scope: "area", channel: "reset", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringForm) },
            ],
          },
        },
      }),
      nodes.widget({
        typeKey: "table",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringRoutes,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        // The vertical Flex Layout has sequential slots: one child per slot, so the Table takes the slot
        // after the Form rather than sharing its own. Sharing one displaced the Form entirely, and with
        // it the Form instance the overlay waits for before it opens.
        slotIndex: 1,
        sortOrder: 0,
        label: "Signal routes",
        config: {
          /*
           * Deliberately queried WITHOUT the provider's session key: these rows are the routes the block
           * actually carries, read from the draft config, not a staged copy. The wiring Form writes
           * directly, so a staging session would only be a second truth to keep in step.
           */
          source: {
            providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalRoutesTable,
            resourceKey: "signalRoutes",
          },
          initialQuery: { page: 1, pageSize: 20, filters: { direction: "emit" } },
          presentation: {
            layout: { mode: "auto", overflowX: "auto" },
            columns: [
              { key: "capabilityId", fieldKey: "capabilityId", title: signalsLabels.routes.capability, renderer: "code", sizing: { mode: "content" } },
              { key: "channel", fieldKey: "channel", title: signalsLabels.routes.channel, sizing: { mode: "content" } },
              { key: "action", fieldKey: "action", title: signalsLabels.routes.action, sizing: { mode: "content" } },
              { key: "valueType", fieldKey: "valueType", title: signalsLabels.routes.valueType, sizing: { mode: "content" } },
              { key: "receiver", fieldKey: "receiver", title: signalsLabels.routes.receiver, renderer: "code", sizing: { mode: "fill", minWidth: 220 } },
            ],
            /*
             * The empty state reuses the route vocabulary rather than inventing a sentence: this Widget
             * has no routes yet, which is a normal starting point and not an error.
             */
            emptyState: { title: signalsLabels.routes.title },
            controlSize: "small",
          },
          features: {
            pagination: { enabled: false },
            sorting: { mode: "none" },
            tools: { mode: "self-contained", reload: false },
            actions: {
              row: [{ key: "delete", label: signalsLabels.routes.delete, icon: "delete", display: "icon", execution: "signal" }],
            },
          },
          signalRoutes: {
            emits: [{
              routeKey: "builder-signal-wiring-route-action",
              capabilityId: "actionActivate",
              scope: "area",
              channel: "signalWiringRoutes",
              action: "activate",
              valueType: "json",
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
              receiver: createPhiBuilderControllerAddress(),
            }],
            listens: [{
              routeKey: "builder-signal-wiring-routes-reload",
              capabilityId: "reload",
              scope: "area",
              channel: "reload",
              action: "activate",
              valueType: "none",
              receiver: createPhiSignalAddress("cms", PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringRoutes),
            }],
          },
        },
      }),
      nodes.widget({
        typeKey: "command-toolbar",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringCommands,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringFooter,
        slotIndex: 0,
        label: "Builder signal wiring commands",
        config: {
          key: "builder-signal-wiring-commands",
          /*
           * The two buttons as one group, the way the Area settings footer states it: they are the two
           * ends of a single decision, and a gap between them reads as two unrelated offers. Wrapping
           * follows from that and is not stated -- a compact group does not wrap.
           */
          compact: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", label: signalsLabels.routes.cancel, variant: "normal" },
            /*
             * The primary action reads "Apply", not "Save": it commits one route into the draft, and the
             * Page is saved separately. `actionKey` still names `save` so the button keeps that icon and
             * its loading affordance.
             */
            { key: "apply", emits: [{ capabilityId: "command", value: "apply" }], actionKey: "save", label: signalsLabels.routes.apply, variant: "primary" },
          ],
          signalRoutes: {
            emits: [{ routeKey: "builder-signal-wiring-command", capabilityId: "command", scope: "area", channel: "signalWiring", action: "activate", valueType: "string", receiver: createPhiBuilderControllerAddress() }],
            listens: [],
          },
        },
      }),
    ],
  };
}
