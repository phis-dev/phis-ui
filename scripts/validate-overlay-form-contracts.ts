import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { parsePhiFormDescriptor, resolvePhiFormEffectiveColumnCount, resolvePhiFormLayout, shouldPhiFormSubmitOnKeyDown } from "../components/forms/form-descriptor-contract";
import { PHI_FORM_FIELD_PROVIDER_KEYS, PHI_FORM_VALIDATION_PROVIDER_KEYS, PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS, PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS } from "../components/forms/form-provider-contract";
import {
  PHI_CMS_OVERLAY_MASK_APPEARANCES,
  PHI_OVERLAY_FOOTER_PRESENTATIONS,
  parsePhiCmsOverlayConfig,
  readPhiOverlayCloseRequest,
} from "../types/cms-overlay";
import { resolvePhiOverlayMaskPresentation } from "../components/controls/phi-overlay-control-contract";
import {
  evaluatePhiRuntimeConditionExpression,
  matchesPhiRuntimeValueCondition,
  readPhiRuntimeConditionExpression,
  resolvePhiRuntimeConditionControllerRequirements,
} from "../types/runtime-condition";
import { createPhiControllerSignalAddress } from "../types/signals";
import {
  PHI_BUILDER_INSPECTOR_SECTION_WIDGET_DEFINITIONS,
  PHI_BUILDER_INSPECTOR_SECTION_WIDGET_SPECS,
} from "../plugins/runtime-modules/builder/widgets/chrome/config";
import {
  PHI_BUILDER_EFFECTS_FORM_IDS,
  PHI_BUILDER_PAGE_META_FORM_ID,
} from "../plugins/runtime-modules/builder/page-meta-form";
import {
  PHI_BUILDER_SIGNAL_WIRING_FORM,
  PHI_BUILDER_SIGNAL_WIRING_FORM_ID,
} from "../plugins/runtime-modules/builder/signal-wiring-form";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/builder/ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/asset/ids";
import {
  PHI_ASSET_FOLDER_FORM_DESCRIPTOR,
  PHI_ASSET_FOLDER_FORM_ID,
  PHI_ASSET_METADATA_FORM_DESCRIPTOR,
} from "../components/media/asset-metadata-form";
import { PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR } from "../components/media/asset-form-field-providers";
import { createPhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";

const controllerAddress = createPhiControllerSignalAddress("@test/pkg/modules/user-management/controller", "users", "default");
assert.deepEqual(PHI_OVERLAY_FOOTER_PRESENTATIONS, ["none", "actions", "custom"]);
assert.deepEqual(PHI_CMS_OVERLAY_MASK_APPEARANCES, ["transparent", "normal", "blurred"]);
const disabledCondition = {
  source: "controller",
  controllerAddress,
  valuePath: "permissions.readOnly",
  operator: "truthy",
} as const;
const disabledWhen = { match: "all", conditions: [disabledCondition] } as const;

const form = parsePhiFormDescriptor({
  schemaVersion: 1,
  key: "@test/pkg/modules/user-management/forms/edit-user",
  layout: { columns: { compact: 1, medium: 2 }, gap: { compact: "sm", medium: "base" } },
  fields: [{
    key: "email",
    fieldProviderKey: "@test/pkg/modules/user-management/form-field:email",
    disabledWhen,
  }],
});
assert.throws(() => parsePhiFormDescriptor({
  schemaVersion: 1,
  key: "@test/pkg/modules/user-management/forms/legacy-actions",
  fields: [],
  actions: [],
}), /actions are forbidden/u);
assert.throws(() => parsePhiFormDescriptor({
  schemaVersion: 1,
  key: "@test/pkg/modules/user-management/forms/legacy-modal",
  fields: [],
  presentation: { mode: "modal" },
}), /presentation is forbidden/u);
const submitKey = {
  key: "Enter",
  defaultPrevented: false,
  isComposing: false,
  multiline: false,
  contentEditable: false,
  managedKeyboardScope: false,
};
assert.equal(shouldPhiFormSubmitOnKeyDown(submitKey), true);
assert.equal(shouldPhiFormSubmitOnKeyDown({ ...submitKey, key: "Escape" }), false);
assert.equal(shouldPhiFormSubmitOnKeyDown({ ...submitKey, isComposing: true }), false);
assert.equal(shouldPhiFormSubmitOnKeyDown({ ...submitKey, multiline: true }), false);
assert.equal(shouldPhiFormSubmitOnKeyDown({ ...submitKey, managedKeyboardScope: true }), false);
assert.deepEqual(
  [PHI_FORM_FIELD_PROVIDER_KEYS.table, PHI_FORM_FIELD_PROVIDER_KEYS.tree].map((key) =>
    PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS.find((provider) => provider.key === key)?.valueType),
  ["json", "json"],
);
assert.deepEqual(
  Object.values(PHI_FORM_VALIDATION_PROVIDER_KEYS).filter((key) =>
    !PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS.some((provider) => provider.key === key)),
  [],
);
assert.deepEqual(resolvePhiFormLayout(form.layout).gap, {
  compact: "sm",
  medium: "base",
  wide: "base",
});
assert.equal(resolvePhiFormEffectiveColumnCount(4, "compact"), 1);
assert.equal(resolvePhiFormEffectiveColumnCount(4, "medium"), 2);
assert.equal(resolvePhiFormEffectiveColumnCount(4, "wide"), 4);
assert.equal(resolvePhiFormEffectiveColumnCount(3, "wide"), 3);
assert.equal(resolvePhiFormLayout().labelPlacement, "side");
assert.deepEqual(resolvePhiFormLayout().labelGrid.compact, { span: 24, offset: 0 });
assert.deepEqual(resolvePhiFormLayout().labelGrid.medium, { span: 8, offset: 0 });
assert.equal(evaluatePhiRuntimeConditionExpression(disabledWhen, { controllers: {} }), "unavailable");
assert.equal(matchesPhiRuntimeValueCondition(disabledCondition, {
  controllers: { [controllerAddress]: { permissions: { readOnly: false } } },
}), false);
assert.equal(matchesPhiRuntimeValueCondition(disabledCondition, {
  controllers: { [controllerAddress]: { permissions: { readOnly: true } } },
}), true);
assert.equal(matchesPhiRuntimeValueCondition(disabledCondition, { controllers: {} }), false);
const formCondition = readPhiRuntimeConditionExpression({
  match: "any",
  conditions: [
    { source: "form", valuePath: "transition.type", operator: "equals", value: "rotate" },
    {
      match: "all",
      conditions: [
        { source: "form", valuePath: "transition.type", operator: "equals", value: "slide" },
        { source: "form", valuePath: "transition.mode", operator: "equals", value: "in" },
      ],
    },
  ],
});
assert.ok(formCondition);
assert.equal(evaluatePhiRuntimeConditionExpression(formCondition, {
  form: { transition: { type: "rotate", mode: "out" } },
}), "matched");
assert.equal(evaluatePhiRuntimeConditionExpression(formCondition, {
  form: { transition: { type: "slide", mode: "in" } },
}), "matched");
assert.equal(evaluatePhiRuntimeConditionExpression(formCondition, {
  form: { transition: { type: "slide", mode: "out" } },
}), "not-matched");

const overlay = parsePhiCmsOverlayConfig({
  controlSize: "medium",
  width: { compact: "90%", medium: 720 },
  closeMode: "request",
  padding: 999,
});
assert.equal(overlay.controlSize, "medium");
assert.deepEqual(overlay.width, { compact: "90%", medium: 720, wide: undefined });
assert.equal(overlay.closeMode, "request");
assert.equal("padding" in overlay, false);
assert.deepEqual(readPhiOverlayCloseRequest({ source: "close-button" }), {
  source: "close-button",
});
assert.equal(readPhiOverlayCloseRequest({ intent: "close", source: "button" }), null);
assert.equal(parsePhiCmsOverlayConfig({ width: { compact: "90%", medium: 720 } }, "drawer").width, undefined);
assert.equal(parsePhiCmsOverlayConfig({ size: 480 }, "drawer").size, 480);
assert.equal(parsePhiCmsOverlayConfig({ size: 480 }, "modal").size, undefined);
assert.equal(parsePhiCmsOverlayConfig({ controlSize: "wide" }).controlSize, undefined);
assert.deepEqual(parsePhiCmsOverlayConfig({}).mask, {
  appearance: "normal",
  allowOutsideInteraction: false,
  closable: true,
});
assert.deepEqual(parsePhiCmsOverlayConfig({
  mask: { appearance: "transparent", allowOutsideInteraction: false, closable: false },
}).mask, {
  appearance: "transparent",
  allowOutsideInteraction: false,
  closable: false,
});
assert.deepEqual(resolvePhiOverlayMaskPresentation({
  appearance: "transparent",
  allowOutsideInteraction: false,
  closable: false,
}), {
  adapterMask: { enabled: true, blur: false, closable: false },
  maskStyle: {
    background: "transparent",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
  },
});
assert.deepEqual(resolvePhiOverlayMaskPresentation({
  appearance: "normal",
  allowOutsideInteraction: true,
  closable: false,
}).maskStyle, {
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  pointerEvents: "none",
});
assert.deepEqual(resolvePhiOverlayMaskPresentation({
  appearance: "blurred",
  allowOutsideInteraction: true,
  closable: true,
}), {
  adapterMask: { enabled: true, blur: true, closable: true },
  maskStyle: {},
});

assert.deepEqual(resolvePhiRuntimeConditionControllerRequirements({
  emits: [{
    routeKey: "request-permissions",
    capabilityId: "conditionStateRequest",
    scope: "page",
    channel: "condition",
    action: "reload",
    valueType: "none",
    receiver: controllerAddress,
  }],
}), [{
  type: "@test/pkg/modules/user-management/controller/users",
  instanceKey: "default",
  enabled: true,
}]);

assert.equal(PHI_BUILDER_INSPECTOR_SECTION_WIDGET_SPECS.length, 18);
assert.equal(new Set(PHI_BUILDER_INSPECTOR_SECTION_WIDGET_SPECS.map((entry) => entry.typeKey)).size, 18);
assert.equal(
  PHI_BUILDER_INSPECTOR_SECTION_WIDGET_DEFINITIONS.every(
    ({ definition }) => definition.slotSizePolicy === "fill-inline",
  ),
  true,
);
const builderFormIds = PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG
  .get(PHI_BUILDER_RUNTIME_MODULE_ID)?.forms?.map((entry) => entry.formId) ?? [];
assert.equal(builderFormIds.includes(PHI_BUILDER_PAGE_META_FORM_ID), true);
assert.equal(Object.values(PHI_BUILDER_EFFECTS_FORM_IDS).every((formId) => builderFormIds.includes(formId)), true);
const assetModule = PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.get(PHI_ASSET_RUNTIME_MODULE_ID);
assert.equal(assetModule?.widgets?.some((entry) => entry.definition.typeKey === "image-inspector"), true);
assert.equal(assetModule?.widgets?.some((entry) => entry.definition.typeKey === "asset-focal-rect"), true);
assert.equal(PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR.presentation, "hidden");
assert.equal(assetModule?.forms?.some((entry) => entry.formId === PHI_ASSET_FOLDER_FORM_ID), true);
assert(assetModule);
assert.throws(
  () => createPhiRuntimeModuleCatalog(
    [...PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values()].map((entry) =>
      entry.definition.moduleId === PHI_ASSET_RUNTIME_MODULE_ID
        ? {
            ...entry,
            definition: {
              ...entry.definition,
              formProviders: {
                ...entry.definition.formProviders,
                handlers: (entry.definition.formProviders?.handlers ?? []).filter(
                  (provider) => provider.handlerKey !== "site.asset.folder.create",
                ),
              },
            },
          }
        : entry),
    PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.areaDefinitions,
  ),
  /requires missing owned submit handler "site\.asset\.folder\.create"/u,
);
assert.deepEqual(PHI_ASSET_METADATA_FORM_DESCRIPTOR.layout.labelGrid.compact, { span: 8, offset: 0 });
assert.deepEqual(PHI_ASSET_METADATA_FORM_DESCRIPTOR.layout.controlGrid.compact, { span: 16, offset: 0 });
const assetFolderField = PHI_ASSET_METADATA_FORM_DESCRIPTOR.fields.find((field) => field.key === "folderId");
assert.equal(assetFolderField?.config?.allowClear, true);
const assetFolderParentField = PHI_ASSET_FOLDER_FORM_DESCRIPTOR.fields.find((field) => field.key === "parentPath");
assert.equal(assetFolderParentField?.config?.allowRoot, true);
const inspectorSectionSource = await readFile(new URL("../plugins/runtime-modules/builder/clients/inspector-section-widget.tsx", import.meta.url), "utf8");
const inspectorSectionPluginSource = await readFile(new URL("../plugins/runtime-modules/builder/widgets/inspector-section/plugin.tsx", import.meta.url), "utf8");
const effectsToolSource = await readFile(new URL("../plugins/runtime-modules/builder/clients/widget-effects-editor.tsx", import.meta.url), "utf8");
const builderPresetSource = await readFile(new URL("../components/regions/presets/phi-default-builder-area-preset-tree.ts", import.meta.url), "utf8");
const builderClientManifestSource = await readFile(new URL("../plugins/runtime-modules/client-manifests/builder.tsx", import.meta.url), "utf8");
const commonClientManifestSource = await readFile(new URL("../plugins/runtime-modules/client-manifests/common.ts", import.meta.url), "utf8");
const formHandlerResolutionSource = await readFile(new URL("../gateway/form-handler-resolution.ts", import.meta.url), "utf8");
const runtimeWidgetsSource = await readFile(new URL("../plugins/runtime-modules/core/widgets.ts", import.meta.url), "utf8");
assert.match(formHandlerResolutionSource, /isKnownSpecialCmsRoot\(firstSegment\)/u);
assert.doesNotMatch(formHandlerResolutionSource, /segments\[1\]/u);
assert.match(formHandlerResolutionSource, /buildPhiLocalCmsAreaPayload/u);
assert.match(formHandlerResolutionSource, /x-forwarded-host/u);
await assert.rejects(() => readFile(new URL("../components/builder/clients/inspector-host.tsx", import.meta.url), "utf8"));
await assert.rejects(() => readFile(new URL("../components/builder/controller-host.tsx", import.meta.url), "utf8"));
assert.doesNotMatch(inspectorSectionSource, /PhiInspectorCollapsibleSections|PhiCollapsibleLayout|usePhiSignalListener/u);
assert.match(inspectorSectionSource, /PhiBuilderRegionInspectorSectionWidgetClient/u);
assert.match(inspectorSectionSource, /PhiBuilderLayoutInspectorSectionWidgetClient/u);
assert.match(inspectorSectionSource, /PhiBuilderWidgetInspectorSectionWidgetClient/u);
assert.match(inspectorSectionPluginSource, /PhiBuilderInspectorSectionWidget/u);
assert.doesNotMatch(inspectorSectionPluginSource, /InspectorHost|controller-host|inspector-host/u);
assert.doesNotMatch(builderPresetSource, /builder-inspector-host/u);
assert.doesNotMatch(builderPresetSource, /builder-workspace-host/u);
assert.doesNotMatch(builderPresetSource, /layoutDrawerRight|regionDrawerRight/u);
assert.match(
  builderPresetSource,
  /headerLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS\.layoutMediaInspectorHeader,[\s\S]*?bodyLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS\.layoutMediaInspector,[\s\S]*?footerLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS\.layoutMediaInspectorFooter/u,
);
assert.match(
  builderPresetSource,
  /typeKey: "collapsible",[\s\S]*?id: PHI_ASSET_INSPECTOR_LAYOUT_IDS\.layoutMediaInspector,[\s\S]*?previewTitle[\s\S]*?metadataTitle/u,
);
assert.match(
  builderPresetSource,
  /typeKey: "image-inspector",[\s\S]*?parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS\.layoutMediaInspector,[\s\S]*?slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS\[0\]\.slotIndex/u,
);
assert.match(
  builderPresetSource,
  /typeKey: "form",[\s\S]*?id: PHI_ASSET_INSPECTOR_WIDGET_IDS\.widgetMediaMetadataForm,[\s\S]*?parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS\.layoutMediaInspector,[\s\S]*?slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS\[1\]\.slotIndex/u,
);
assert.match(
  builderPresetSource,
  /id: PHI_ASSET_INSPECTOR_OVERLAY_IDS\.overlayMediaFocalRect,[\s\S]*?bodyLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS\.layoutMediaFocalRectBody,[\s\S]*?footerLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS\.layoutMediaFocalRectFooter/u,
);
assert.match(
  builderPresetSource,
  /typeKey: "content",[\s\S]*?id: PHI_ASSET_INSPECTOR_LAYOUT_IDS\.layoutMediaFocalRectBody,[\s\S]*?padding: 0,[\s\S]*?background: PHI_COLOR\.bgLayout/u,
);
assert.match(
  builderPresetSource,
  /typeKey: "image-inspector",[\s\S]*?id: PHI_ASSET_MEDIA_PAGE_WIDGET_IDS\.widgetMediaInspector,[\s\S]*?capabilityId: "focalRectOpen"[\s\S]*?receiver: createPhiSignalAddress\("cms", PHI_ASSET_INSPECTOR_OVERLAY_IDS\.overlayMediaFocalRect\)/u,
);
assert.match(
  builderPresetSource,
  /typeKey: "asset-focal-rect",[\s\S]*?id: PHI_ASSET_INSPECTOR_WIDGET_IDS\.widgetMediaFocalRect,[\s\S]*?parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS\.layoutMediaFocalRectBody/u,
);
assert.match(
  builderPresetSource,
  /typeKey: "command-toolbar",[\s\S]*?id: PHI_ASSET_INSPECTOR_WIDGET_IDS\.widgetMediaFocalRectCommands,[\s\S]*?parentLayoutNodeId: PHI_ASSET_INSPECTOR_LAYOUT_IDS\.layoutMediaFocalRectFooter/u,
);
assert.match(builderClientManifestSource, /PhiCmsWidgetType\.AssetFocalRect/u);
assert.doesNotMatch(commonClientManifestSource, /AssetFocalRect/u);
assert.match(
  builderPresetSource,
  /isStructurePage \|\| isPagesPage[\s\S]*?creationPreset: \{ layoutKind: "verticalflex", preset: "panel" \},[\s\S]*?typeKey: "flex-vertical"/u,
);
assert.match(builderPresetSource, /appearance: "transparent"/u);
assert.match(builderPresetSource, /allowOutsideInteraction: false/u);
assert.match(builderPresetSource, /innerPadding: PHI_SPACE\.sm/u);
assert.match(builderPresetSource, /defaultOpenSlotKeys: \["slot_0"\]/u);
assert.match(
  builderPresetSource,
  /label: "Builder inspector header",[\s\S]*?paddingLeft: PHI_SPACE\.lg,[\s\S]*?background: "transparent"/u,
);
assert.doesNotMatch(effectsToolSource, /usePhiSignalDispatcher|createPhiSignalAddress/u);
assert.match(effectsToolSource, /openPhiDeveloperBuilderEffectsEditor/u);
assert.match(builderPresetSource, /PHI_BUILDER_PAGE_META_FORM_ID/u);
assert.match(builderPresetSource, /PHI_BUILDER_EFFECTS_FORM_IDS/u);
assert.doesNotMatch(runtimeWidgetsSource, /PHI_(?:BACKGROUND|GEOMETRY)_WIDGET_DEFINITION/u);

/**
 * Signal wiring is an overlay like any other now. It used to be a Modal of its own -- `PhiModalControl`
 * with a hand-written form and a hand-built footer -- which is why the overlay consolidation dropped it
 * instead of moving it, leaving the scaffold's wiring button pointing at nothing.
 */
assert.equal(builderFormIds.includes(PHI_BUILDER_SIGNAL_WIRING_FORM_ID), true);
/*
 * Nothing on this surface may ship a hard-coded English string. The Signals label set already carried the
 * wiring vocabulary from the Modal that predated the overlay contract; the Form reads its field labels
 * from there, and the preset takes the Modal title, the Table columns and the footer actions from the
 * same place.
 */
assert.ok(PHI_BUILDER_SIGNAL_WIRING_FORM.descriptor.labelSetKey, "The wiring Form declares a label set.");
assert.ok(
  typeof PHI_BUILDER_SIGNAL_WIRING_FORM.loadLabels === "function",
  "The wiring Form loads its labels.",
);
for (const field of parsePhiFormDescriptor(PHI_BUILDER_SIGNAL_WIRING_FORM.descriptor).fields) {
  assert.equal(field.label?.kind, "label", `${field.key} must take its label from the label set.`);
}
{
  const descriptor = parsePhiFormDescriptor(PHI_BUILDER_SIGNAL_WIRING_FORM.descriptor);
  assert.deepEqual(
    descriptor.fields.map((field) => field.key),
    ["senderAddress", "senderCapabilityId", "receiverAddress", "receiverCapabilityId"],
  );
  for (const field of descriptor.fields) {
    // Every select cascades, so none of them may carry a static list: what can be chosen depends on the
    // endpoint chosen before it, and a receiver input has to match the sender output.
    assert.ok(field.optionsProvider, `${field.key} must resolve its options from a provider.`);
    assert.equal(field.options, undefined, `${field.key} must not carry a static option list.`);
  }
}
assert.match(builderPresetSource, /PHI_BUILDER_SIGNAL_WIRING_FORM_ID/u);
assert.match(
  builderPresetSource,
  /PHI_BUILDER_INSPECTOR_OVERLAY_IDS\.signalWiring,[\s\S]*?overlayType: "modal"[\s\S]*?footerPresentation: "actions"/u,
  "Wiring is a preset-declared Modal whose actions live in the overlay footer.",
);

/**
 * An overlay with `closeMode: "request"` does not close itself: the close button and a click on the mask
 * emit a close request and wait for an answer. Where nothing answers, the overlay simply cannot be
 * closed -- which is how the wiring Modal shipped, since its request route existed but its controller
 * branch only handled the footer commands.
 */
{
  const controllerSource = await readFile(
    new URL("../plugins/runtime-modules/builder/workspace-controller.tsx", import.meta.url),
    "utf8",
  );
  const requestChannels = [...builderPresetSource.matchAll(
    /capabilityId: "closeRequest"[^}]*?channel: "([A-Za-z]+)"/gu,
  )].map((match) => match[1]!);
  assert.ok(requestChannels.length >= 2, "The Builder preset declares close requests to answer.");
  for (const channel of requestChannels) {
    const branchIndex = controllerSource.indexOf(`signal.channel === "${channel}"`);
    assert.notEqual(branchIndex, -1, `The controller must handle close requests on "${channel}".`);
    assert.match(
      controllerSource.slice(branchIndex, branchIndex + 4000),
      /PHI_SIGNAL_VALUE_SCHEMAS\.overlayCloseRequest\b/u,
      `The "${channel}" branch must answer the overlay's close request, not only its commands.`,
    );
  }
}

/**
 * The wiring overlay lists what the block already carries and can remove a row. The Table runs without
 * the provider's session key on purpose: the wiring Form writes routes straight into the draft config,
 * so a staged session would be a second truth to keep in step.
 */
{
  const controllerSource = await readFile(
    new URL("../plugins/runtime-modules/builder/workspace-controller.tsx", import.meta.url),
    "utf8",
  );
  const tableBlock = builderPresetSource.slice(
    builderPresetSource.indexOf("PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringRoutes"),
  ).slice(0, 3000);
  assert.match(tableBlock, /resourceKey: "signalRoutes"/u, "The wiring Table binds the Signal routes resource.");
  assert.doesNotMatch(tableBlock, /sessionKey/u, "The wiring Table reads the block's own routes, not a staged session.");
  assert.match(tableBlock, /key: "delete"/u, "A listed route must be removable.");
  assert.doesNotMatch(
    tableBlock,
    /title: "[A-Z]/u,
    "The wiring Table's column titles come from the Signals label set, not from literals.",
  );
  assert.match(tableBlock, /features:\s*\{[\s\S]*?actions:/u, "Table actions live under `features`, not `presentation`.");
  /*
   * The body is a vertical Flex Layout, whose slots are sequential: one child per slot. Sharing a slot
   * displaced the Form entirely -- and with it the Form instance the overlay waits for before it opens,
   * so the wiring button did nothing at all.
   */
  const formSlot = builderPresetSource.slice(builderPresetSource.indexOf("PHI_BUILDER_INSPECTOR_WIDGET_IDS.signalWiringForm"), 1_000_000)
    .slice(0, 800).match(/slotIndex:\s*([A-Za-z0-9_.]+)/u)?.[1];
  const tableSlot = tableBlock.match(/slotIndex:\s*([A-Za-z0-9_.]+)/u)?.[1];
  assert.ok(formSlot && tableSlot, "Both wiring body Widgets declare a slot.");
  assert.notEqual(formSlot, tableSlot, "The wiring Form and its routes Table need separate sequential slots.");
  assert.match(
    controllerSource,
    /signal\.channel === "signalWiringRoutes"[\s\S]{0,1200}?readPhiTableActionSignalValue/u,
    "The controller must answer the wiring Table's row action.",
  );
}

{
  /*
   * One authoring gesture, one history entry. A control that emits while it is being used reaches the
   * draft store once per intermediate value -- a single drag across the strength slider left 11 entries
   * behind, out of a history that holds 50. What ends a gesture is an event rather than a delay: a
   * different field, an undo, or the Inspector being put away, whose standing value is the one kept.
   */
  const historySource = await readFile(new URL("../components/state/history-store.ts", import.meta.url), "utf8");
  assert.match(
    historySource,
    /openGestures\.get\(scopeKey\) === entry\.coalesceKey/u,
    "Consecutive records of the same gesture must collapse into one entry.",
  );
  assert.doesNotMatch(
    historySource,
    /coalesceWindowMs|Date\.now\(\)/u,
    "A gesture must end on an event, not on a timer that a slow hand outlives.",
  );
  const workspaceStoreSource = await readFile(new URL("../plugins/runtime-modules/builder/developer-workspace-store.ts", import.meta.url), "utf8");
  assert.match(
    workspaceStoreSource,
    /next\.inspectorOpen === false\)\s*\{[\s\S]{0,600}?phiBuilderHistory\.endGesture\(\)/u,
    "Putting the Inspector away must end the gesture it was being used for.",
  );
  const inspectorControllerSource = await readFile(new URL("../plugins/runtime-modules/builder/inspector-controller.ts", import.meta.url), "utf8");
  assert.match(
    inspectorControllerSource,
    /historyCoalesceKey: resolveInspectorCoalesceKey\(/u,
    "Inspector edits must say which gesture they belong to, or every emit is its own entry again.",
  );
  assert.match(
    inspectorControllerSource,
    /function resolveInspectorCoalesceKey[\s\S]*?state\.nodeId[\s\S]*?field/u,
    "The gesture is identified by the node and the field, so a different field starts a new entry.",
  );
}

console.log("Overlay and Form contracts validated.");
