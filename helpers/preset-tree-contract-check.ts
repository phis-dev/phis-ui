import type { PhiFormDescriptor } from "@phis/contracts/forms";

import { buildPhiBasePageLayoutNode, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../components/regions/presets/phi-base-page-layout";
import { PhiCmsLayoutType } from "../constants/cms-layout-type-keys";
import { PhiCmsWidgetType } from "../constants/cms-widget-types";
import type { PhiCmsLayoutNode, PhiCmsPageNode, PhiResolvedCmsPageTree } from "../types/cms";
import { isPhiCmsInstanceId, readPhiCmsInstanceIdDescriptor } from "../types/cms-instance-id";
import {
  PHI_DIALOG_BLEED_BODY_CONFIG,
  PHI_DIALOG_BODY_CONFIG,
  PHI_DIALOG_COMMANDS_CONFIG,
  PHI_DIALOG_WIDTH,
  isPhiFormSingleColumn,
} from "./cms-dialog";
import { resolvePhiLayoutCreationPreset } from "./cms-layout-defaults";

/**
 * The rules every preset tree is held to (THIRD_PARTY_MODULES.md, "Checking a Page preset"), as findings.
 *
 * One source for two callers. The descriptor compiler runs it on every tree a preset loads while a Site
 * serves the Page and throws the first finding (`assertPhiCmsPresetTreeContract`): the Page answers 500. A
 * Module package runs it, from `@phis/ui/module/page-check`, over every tree its presets build in its own
 * tests, with its own Forms, so the same tree fails there before it ships.
 *
 * The rules: every node a preset instance id, none twice, every parent, Region root, Overlay root and Page
 * root resolved; the base page layout node only as the canonical scaffold; an actions Footer the canonical
 * Flex preset; a modal's body and actions the dialog's (`helpers/cms-dialog.ts`), and a modal at the default
 * `PHI_DIALOG_WIDTH` not holding only Forms of one column. The findings come in the order the compiler used
 * to throw them, so its first is the error it always gave.
 *
 * `page` is the Page the tree was asked for: a tree whose Page or Regions belong to another is refused.
 * `forms` are the Forms the caller can see, by id or as definitions; a Form not among them -- one stored on
 * the Site, one of another Module -- is not judged, and without `forms` the dialog width is not checked.
 */

export type PhiPresetTreeContractFinding = {
  /** The node's id, or "page" for the Page itself. */
  node: string;
  message: string;
};

type PresetTreeForm = { descriptor: PhiFormDescriptor };

function stablePresetNodeJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stablePresetNodeJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stablePresetNodeJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function readFormsById(
  forms: ReadonlyMap<string, PresetTreeForm> | Iterable<PresetTreeForm & { formId: string }> | undefined,
): ReadonlyMap<string, PresetTreeForm> | undefined {
  if (!forms || forms instanceof Map) return forms as ReadonlyMap<string, PresetTreeForm> | undefined;
  return new Map([...(forms as Iterable<PresetTreeForm & { formId: string }>)].map((form) => [form.formId, form]));
}

export function checkPhiPresetTreeContract(
  tree: PhiResolvedCmsPageTree,
  options: {
    page?: PhiCmsPageNode;
    forms?: ReadonlyMap<string, PresetTreeForm> | Iterable<PresetTreeForm & { formId: string }>;
  } = {},
): PhiPresetTreeContractFinding[] {
  const findings: PhiPresetTreeContractFinding[] = [];
  const report = (node: string, message: string) => findings.push({ node, message });
  const expectedPage = options.page;
  const forms = readFormsById(options.forms);
  const layoutIds = new Set<string>();
  const allIds = new Set<string>();
  if (
    expectedPage &&
    (tree.page.siteId !== expectedPage.siteId ||
      tree.page.areaMask !== expectedPage.areaMask ||
      tree.page.path !== expectedPage.path)
  ) {
    report("page", "Preset loader returned a Page outside its requested context.");
  }
  const checkId = (node: { id: string }, kind: string) => {
    if (!isPhiCmsInstanceId(node.id) || readPhiCmsInstanceIdDescriptor(node.id)?.origin !== "preset") {
      report(String(node.id), `${kind} has invalid instance id "${String(node.id)}".`);
    }
    if (allIds.has(node.id)) {
      report(node.id, `Preset tree contains duplicate instance id "${node.id}".`);
    }
    allIds.add(node.id);
  };
  for (const node of tree.overlays) checkId(node, "Preset Overlay");
  for (const node of tree.layoutNodes) {
    checkId(node, "Preset layout node");
    layoutIds.add(node.id);
  }
  for (const node of tree.contentWidgets) checkId(node, "Preset widget node");
  for (const node of tree.layoutNodes) {
    if (node.parentLayoutNodeId != null && !layoutIds.has(node.parentLayoutNodeId)) {
      report(node.id, `Preset layout "${node.id}" has unresolved parent "${node.parentLayoutNodeId}".`);
    }
  }
  for (const node of tree.contentWidgets) {
    if (!layoutIds.has(node.parentLayoutNodeId)) {
      report(node.id, `Preset widget "${node.id}" has unresolved parent "${node.parentLayoutNodeId}".`);
    }
  }
  for (const region of tree.regions) {
    if (expectedPage && region.pageId !== expectedPage.id) {
      report(region.rootLayoutNodeId, `Preset region "${region.regionType}" belongs to a different Page.`);
    }
    if (!layoutIds.has(region.rootLayoutNodeId)) {
      report(region.rootLayoutNodeId, `Preset region "${region.regionType}" has unresolved root "${region.rootLayoutNodeId}".`);
    }
  }
  const layoutsById = new Map(tree.layoutNodes.map((node) => [node.id, node]));
  checkBasePageLayoutNode(tree, layoutsById, report);
  for (const overlay of tree.overlays) {
    if (!layoutIds.has(overlay.bodyLayoutNodeId)) {
      report(overlay.id, `Preset Overlay "${overlay.id}" has unresolved Body root "${overlay.bodyLayoutNodeId}".`);
    }
    if (overlay.headerLayoutNodeId != null && !layoutIds.has(overlay.headerLayoutNodeId)) {
      report(overlay.id, `Preset Overlay "${overlay.id}" has unresolved Header root "${overlay.headerLayoutNodeId}".`);
    }
    if (overlay.footerPresentation === "none") {
      continue;
    }
    const footerLayout = layoutsById.get(overlay.footerLayoutNodeId);
    if (!footerLayout) {
      report(overlay.id, `Preset Overlay "${overlay.id}" has unresolved Footer root "${overlay.footerLayoutNodeId}".`);
      continue;
    }
    if (overlay.footerPresentation === "actions") {
      if (footerLayout.widgetType !== PhiCmsLayoutType.Flex) {
        report(overlay.id, `Preset Overlay "${overlay.id}" actions Footer must use the Phi Flex Layout.`);
        continue;
      }
      const expectedConfig = resolvePhiLayoutCreationPreset("flex", "overlay-actions");
      const mismatch = Object.entries(expectedConfig).find(([key, value]) =>
        JSON.stringify(footerLayout.config[key]) !== JSON.stringify(value));
      if (mismatch) {
        report(
          overlay.id,
          `Preset Overlay "${overlay.id}" actions Footer does not match the canonical Layout preset at "${mismatch[0]}".`,
        );
        continue;
      }
      if (overlay.overlayType === "modal") {
        checkDialogCommands(overlay.id, footerLayout.id, tree.contentWidgets, report);
      }
    }
  }
  for (const overlay of tree.overlays) {
    if (overlay.overlayType !== "modal") continue;
    const body = layoutsById.get(overlay.bodyLayoutNodeId);
    if (body) checkDialogBody(overlay.id, body, report);
    if (forms) checkDialogWidth(overlay, tree, forms, report);
  }
  for (const rootLayoutNodeId of [
    tree.page.heroRootLayoutNodeId,
    tree.page.headerBottomRootLayoutNodeId,
    tree.page.siderRightRootLayoutNodeId,
    tree.page.footerTopRootLayoutNodeId,
    tree.page.drawerRightRootLayoutNodeId,
    tree.page.contentRootLayoutNodeId,
  ]) {
    if (rootLayoutNodeId != null && !layoutIds.has(rootLayoutNodeId)) {
      report("page", `Preset Page has unresolved root "${rootLayoutNodeId}".`);
    }
  }
  return findings;
}

type Report = (node: string, message: string) => void;

/**
 * Equal id must mean equal node: the shared page scaffold carries the same instance id in every
 * built-in preset tree, which stays sound only while every copy is the canonical node. A preset that
 * wants different chrome gets its own Layout node in a slot -- a deviating copy of the scaffold is a
 * contract violation, not a customisation.
 */
function checkBasePageLayoutNode(
  tree: PhiResolvedCmsPageTree,
  layoutsById: ReadonlyMap<string, PhiCmsLayoutNode>,
  report: Report,
) {
  for (const node of [...tree.overlays, ...tree.contentWidgets]) {
    if (node.id === PHI_BASE_PAGE_LAYOUT_NODE_ID) {
      report(node.id, "The base page layout instance id is reserved for the scaffold Layout node.");
    }
  }
  const node = layoutsById.get(PHI_BASE_PAGE_LAYOUT_NODE_ID);
  if (!node) {
    return;
  }
  const canonical = buildPhiBasePageLayoutNode(tree.page);
  const mismatch = (Object.keys(canonical) as (keyof PhiCmsLayoutNode)[])
    .find((key) => stablePresetNodeJson(node[key]) !== stablePresetNodeJson(canonical[key]));
  if (mismatch) {
    report(
      node.id,
      `Preset tree carries a deviating base page layout node: "${String(mismatch)}" is ` +
      `${stablePresetNodeJson(node[mismatch])}, canonical is ${stablePresetNodeJson(canonical[mismatch])}.`,
    );
  }
}

/*
 * A dialog's body and actions are one answer for every dialog (`helpers/cms-dialog.ts`), checked here as
 * the footer Layout is: a Preset that builds its dialog node by node must arrive at the same look as one
 * that calls `dialog`. A vertical Flex carries the whole body config; a Layout of another kind -- a Stack
 * of tabs -- carries the ground and the inset, which are what make it the dialog's body.
 */
function checkDialogBody(
  overlayId: string,
  body: { id: string; widgetType: string; config: Record<string, unknown> },
  report: Report,
) {
  // The bleed body is the other answer, for content that runs to the edge; it is matched whole.
  const bleed = PHI_DIALOG_BLEED_BODY_CONFIG.padding === body.config.padding;
  const required: Record<string, unknown> = bleed
    ? PHI_DIALOG_BLEED_BODY_CONFIG
    : body.widgetType === PhiCmsLayoutType.FlexVertical
      ? PHI_DIALOG_BODY_CONFIG
      : { surface: PHI_DIALOG_BODY_CONFIG.surface, padding: PHI_DIALOG_BODY_CONFIG.padding };
  const mismatch = Object.entries(required).find(([key, value]) =>
    JSON.stringify(body.config[key]) !== JSON.stringify(value));
  if (mismatch) {
    report(
      overlayId,
      `Preset Overlay "${overlayId}" Body "${body.id}" does not match the dialog body (${bleed ? "PHI_DIALOG_BLEED_BODY_CONFIG" : "PHI_DIALOG_BODY_CONFIG"}) at "${mismatch[0]}".`,
    );
  }
}

function checkDialogCommands(
  overlayId: string,
  footerLayoutId: string,
  widgets: readonly { id: string; widgetType: string; parentLayoutNodeId: string; config: Record<string, unknown> }[],
  report: Report,
) {
  for (const widget of widgets) {
    if (widget.parentLayoutNodeId !== footerLayoutId || widget.widgetType !== PhiCmsWidgetType.CommandToolbar) continue;
    const mismatch = Object.entries(PHI_DIALOG_COMMANDS_CONFIG).find(([key, value]) => widget.config[key] !== value);
    if (mismatch) {
      report(
        widget.id,
        `Preset Overlay "${overlayId}" actions "${widget.id}" do not match the dialog actions (PHI_DIALOG_COMMANDS_CONFIG) at "${mismatch[0]}".`,
      );
    }
  }
}

/*
 * A dialog is as wide as its Form needs (`helpers/cms-dialog.ts`): one column takes
 * `PHI_DIALOG_WIDTH_SINGLE_COLUMN`, two keep `PHI_DIALOG_WIDTH`. What is refused is the one width a Preset
 * did not choose -- the default, holding nothing but Forms of one column. Any other width was stated, by a
 * caller that knows what else the body holds; a Form the caller cannot see is not judged.
 */
function checkDialogWidth(
  overlay: { id: string; bodyLayoutNodeId: string; config: Record<string, unknown> },
  tree: PhiResolvedCmsPageTree,
  forms: ReadonlyMap<string, PresetTreeForm>,
  report: Report,
) {
  if (stablePresetNodeJson(overlay.config.width) !== stablePresetNodeJson(PHI_DIALOG_WIDTH)) return;
  const bodyLayoutIds = new Set<string>([overlay.bodyLayoutNodeId]);
  for (let grown = true; grown;) {
    grown = false;
    for (const node of tree.layoutNodes) {
      if (node.parentLayoutNodeId != null && bodyLayoutIds.has(node.parentLayoutNodeId) && !bodyLayoutIds.has(node.id)) {
        bodyLayoutIds.add(node.id);
        grown = true;
      }
    }
  }
  const formIds = tree.contentWidgets
    .filter((widget) => widget.widgetType === PhiCmsWidgetType.Form && bodyLayoutIds.has(widget.parentLayoutNodeId))
    .map((widget) => widget.config.formId);
  if (formIds.length === 0) return;
  const descriptors = formIds.map((formId) => (typeof formId === "string" ? forms.get(formId) : undefined)?.descriptor);
  if (descriptors.every((descriptor) => descriptor != null && isPhiFormSingleColumn(descriptor))) {
    report(
      overlay.id,
      `Preset Overlay "${overlay.id}" holds the one-column Form "${String(formIds[0])}" at the full dialog width ` +
      "(PHI_DIALOG_WIDTH). Hand the Form to `dialog` as `body.form`, or state `width: PHI_DIALOG_WIDTH_SINGLE_COLUMN`.",
    );
  }
}
