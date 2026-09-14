import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { PHI_COLOR, PHI_SPACE } from "../../../theme/antd-css-var-contract";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  createPhiSignalAddress,
  createPhiSignalSubcontrolAddress,
} from "../../../types/signals";
import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import { createPhiBuilderControllerAddress } from "../../../plugins/runtime-modules/builder/controller/address";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../../../plugins/runtime-modules/builder/ids";
import {
  PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS,
  PHI_BUILDER_INSPECTOR_LAYOUT_IDS,
  PHI_BUILDER_INSPECTOR_OVERLAY_IDS,
  PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS,
  PHI_BUILDER_INSPECTOR_WIDGET_IDS,
} from "../../../plugins/runtime-modules/builder/inspector-overlay-addresses";
import { PHI_BUILDER_EFFECTS_SECTIONS } from "../../../plugins/runtime-modules/builder/effects-form-values";
import { PHI_BUILDER_EFFECTS_FORM_IDS } from "../../../plugins/runtime-modules/builder/page-meta-form";
import { PHI_BUILDER_SIGNAL_WIRING_FORM_ID } from "../../../plugins/runtime-modules/builder/signal-wiring-form";
import { getPhiInspectorWidgetLabels } from "../../widgets/label-sets/inspector";
import { getPhiSignalsWidgetLabels } from "../../widgets/label-sets/signals";
import type { PhiInspectorWidgetLabels } from "../../widgets/label-types/inspector";

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
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  };
  const [inspectorLabels, signalsLabels] = await Promise.all([
    getPhiInspectorWidgetLabels(labelOptions),
    getPhiSignalsWidgetLabels(labelOptions),
  ]);

  return {
    page,
    regions: [],
    overlays: [
      ...([
      [PHI_BUILDER_INSPECTOR_OVERLAY_IDS.regionInspector, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorHeader, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorBody, "Region inspector", "region"],
      [PHI_BUILDER_INSPECTOR_OVERLAY_IDS.layoutInspector, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorHeader, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorBody, "Layout inspector", "layout"],
      [PHI_BUILDER_INSPECTOR_OVERLAY_IDS.widgetInspector, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorHeader, PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorBody, "Widget inspector", "widget"],
    ] as const).map(([id, headerLayoutNodeId, bodyLayoutNodeId, title, view], index) => ({
      id,
      overlayType: "drawer" as const,
      headerLayoutNodeId,
      bodyLayoutNodeId,
      footerPresentation: "none" as const,
      footerLayoutNodeId: null,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: index,
      label: title,
      config: {
        title: null,
        placement: "right",
        size: 377,
        mountPolicy: "lazy-keep",
        effect: "glass",
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
      {
        id: PHI_BUILDER_INSPECTOR_OVERLAY_IDS.effectsEditor,
        overlayType: "modal" as const,
        headerLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsHeader,
        bodyLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody,
        footerPresentation: "actions" as const,
        footerLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsFooter,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 10,
        label: "Builder effects",
        config: {
          title: "Effects",
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
      },
      {
        /*
         * Signal wiring. The Modal, its Form and its footer actions are declared here rather than built
         * as a React Modal of its own -- the wiring surface predates the overlay contract and was dropped
         * during the overlay consolidation because of it.
         */
        id: PHI_BUILDER_INSPECTOR_OVERLAY_IDS.signalWiring,
        overlayType: "modal" as const,
        headerLayoutNodeId: null,
        bodyLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        footerPresentation: "actions" as const,
        footerLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringFooter,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
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
      },
    ],
    layoutNodes: [
      ...([[
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.regionInspectorHeader,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorHeader,
      ], [
        PHI_BUILDER_INSPECTOR_LAYOUT_IDS.widgetInspectorHeader,
      ]] as const).map(([id]) => buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        id,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder inspector header",
        config: {
          anchor: { horizontal: "left", vertical: "middle" },
          gap: PHI_SPACE.sm,
          padding: 0,
          paddingLeft: PHI_SPACE.lg,
          background: "transparent",
          border: "none",
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
      ]] as const).map(([id, sections]) => buildPhiCmsLayoutNode({
        typeKey: "collapsible",
        id,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder inspector sections",
        config: {
          ghost: true,
          bordered: false,
          padding: PHI_SPACE.sm,
          innerPadding: PHI_SPACE.sm,
          slotTitles: sections.map(([, , sectionKey]) =>
            resolveBuilderInspectorSectionTitle(inspectorLabels, sectionKey)
          ),
          defaultOpenSlotKeys: ["slot_0"],
        },
      })),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "flex", preset: "panel" },
        typeKey: "flex",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsHeader,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder effects header",
        config: { anchor: { horizontal: "center", vertical: "middle" }, gap: 0, padding: 0, width: "100%", background: "transparent", border: "none" },
      }),
      buildPhiCmsLayoutNode({
        typeKey: "stack",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder effects body",
        config: { mountPolicy: "eager", slotTransition: "fade-over", defaultActiveSlotKey: "slot_0", padding: PHI_SPACE.base, width: "100%", background: PHI_COLOR.bgLayout, border: "none" },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsFooter,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder effects footer",
        config: {},
      }),
      buildPhiCmsLayoutNode({
        /*
         * The creation preset has to name the Layout's OWN kind. The horizontal Flex panel preset sets
         * `paddingTop: 0` and `paddingBottom: 0` -- right for a row of controls, wrong for a column --
         * and those per-side values outrank the scalar `padding` below, which is how the wiring body
         * ended up with side padding only.
         */
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder signal wiring body",
        config: { gap: PHI_SPACE.sm, padding: PHI_SPACE.base, width: "100%", background: "transparent", border: "none" },
      }),
      buildPhiCmsLayoutNode({
        creationPreset: { layoutKind: "flex", preset: "overlay-actions" },
        typeKey: "flex",
        id: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringFooter,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
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
      ]] as const).map(([id, parentLayoutNodeId]) => buildPhiCmsWidgetNode({
        typeKey: "builder-inspector-header",
        id,
        siteId: page.siteId,
        parentLayoutNodeId,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder inspector header",
        config: {},
        contentId: null,
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
      ]] as const).flatMap(([parentLayoutNodeId, sections]) => sections.map(([id, typeKey, sectionKey], slotIndex) => buildPhiCmsWidgetNode({
        typeKey,
        id,
        siteId: page.siteId,
        parentLayoutNodeId,
        slotIndex,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
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
        contentId: null,
      }))),
      buildPhiCmsWidgetNode({
        typeKey: "tab-bar",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsTabs,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsHeader,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
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
        contentId: null,
      }),
      ...PHI_BUILDER_EFFECTS_SECTIONS.map((section, slotIndex) => {
        const id = PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS[section];
        return buildPhiCmsWidgetNode({
          typeKey: "form",
          id,
          siteId: page.siteId,
          parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsBody,
          slotIndex,
          sortOrder: 0,
          status: PhiCmsStatus.Published,
          flags: 0,
          visibilityMask: page.visibilityMask,
          label: section === "appearance" ? "Appearance" : section === "transitions" ? "Transitions" : "Viewport",
          config: {
            formId: PHI_BUILDER_EFFECTS_FORM_IDS[section],
            formConfig: {},
            execution: { mode: "signal" },
            source: null,
            signalRoutes: {
              emits: [
                { routeKey: `builder-effects-${section}-values`, capabilityId: "submitValues", scope: "area", channel: `effectsForm:${section}`, action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues, receiver: createPhiBuilderControllerAddress() },
                { routeKey: `builder-effects-${section}-validation`, capabilityId: "validationFailed", scope: "area", channel: `effectsFormValidation:${section}`, action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValidity, receiver: createPhiBuilderControllerAddress() },
              ],
              listens: [
                { routeKey: `builder-effects-${section}-submit-form`, capabilityId: "submit", scope: "area", channel: "submit", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", id) },
                { routeKey: `builder-effects-${section}-reset-form`, capabilityId: "reset", scope: "area", channel: "reset", action: "activate", valueType: "none", receiver: createPhiSignalAddress("cms", id) },
              ],
            },
          },
          contentId: null,
        });
      }),
      buildPhiCmsWidgetNode({
        typeKey: "command-toolbar",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsCommands,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.effectsFooter,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder effects commands",
        config: {
          key: "builder-effects-commands",
          compact: false,
          wrap: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", buttonType: "default" },
            { key: "save", emits: [{ capabilityId: "command", value: "save" }], actionKey: "save", buttonType: "primary" },
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
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "form",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringForm,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Signal wiring",
        config: {
          formId: PHI_BUILDER_SIGNAL_WIRING_FORM_ID,
          formConfig: {},
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
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "table",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringRoutes,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringBody,
        // The vertical Flex Layout has sequential slots: one child per slot, so the Table takes the slot
        // after the Form rather than sharing its own. Sharing one displaced the Form entirely, and with
        // it the Form instance the overlay waits for before it opens.
        slotIndex: 1,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
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
        contentId: null,
      }),
      buildPhiCmsWidgetNode({
        typeKey: "command-toolbar",
        id: PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringCommands,
        siteId: page.siteId,
        parentLayoutNodeId: PHI_BUILDER_INSPECTOR_LAYOUT_IDS.signalWiringFooter,
        slotIndex: 0,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "Builder signal wiring commands",
        config: {
          key: "builder-signal-wiring-commands",
          compact: false,
          wrap: true,
          showLabels: true,
          controlSize: "medium",
          buttons: [
            { key: "cancel", emits: [{ capabilityId: "command", value: "cancel" }], actionKey: "cancel", label: signalsLabels.routes.cancel, buttonType: "default" },
            /*
             * The primary action reads "Apply", not "Save": it commits one route into the draft, and the
             * Page is saved separately. `actionKey` still names `save` so the button keeps that icon and
             * its loading affordance.
             */
            { key: "apply", emits: [{ capabilityId: "command", value: "apply" }], actionKey: "save", label: signalsLabels.routes.apply, buttonType: "primary" },
          ],
          signalRoutes: {
            emits: [{ routeKey: "builder-signal-wiring-command", capabilityId: "command", scope: "area", channel: "signalWiring", action: "activate", valueType: "string", receiver: createPhiBuilderControllerAddress() }],
            listens: [],
          },
        },
        contentId: null,
      }),
    ],
  };
}
