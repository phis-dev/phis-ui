import { describe, expect, it } from "vitest";

import {
  PHI_FORM_SIDE_END_HALF,
  PHI_FORM_SIDE_START_HALF,
  PHI_FORM_STACKED_FULL,
  PHI_FORM_STACKED_LAYOUT,
  PHI_FORM_RESPONSIVE_MIN_WIDTH,
} from "../components/forms/form-descriptor-contract";
import { PhiCmsPageType, PhiCmsStatus } from "../constants/phi-cms";
import { checkPhiPresetTreeContract } from "../module-page-check";
import { assertPhiCmsPresetTreeContract } from "../plugins/runtime-modules/descriptor-compiler";
import { PHI_LAYOUT } from "../theme/phi-tokens";
import { PHI_VIEWER_ACCESS_ANYONE } from "../types/access";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../types/cms";
import { createPhiPresetCmsInstanceIdMap } from "../types/cms-instance-id";
import type { PhiFormDescriptor } from "../types";
import {
  PHI_DIALOG_BODY_CONFIG,
  PHI_DIALOG_WIDTH,
  PHI_DIALOG_WIDTH_SINGLE_COLUMN,
  isPhiFormSingleColumn,
  resolvePhiDialogFormWidth,
} from "./cms-dialog";
import { createPhiCmsPresetNodes } from "./cms-preset-nodes";

/* A dialog is as wide as its Form needs: one column narrow, two at the reading measure. */

const text = (value: string) => ({ kind: "literal", value }) as const;
const field = (key: string, placement?: PhiFormDescriptor["fields"][number]["placement"]) => ({
  key,
  fieldProviderKey: "@phis/ui/form-fields/text",
  label: text(key),
  ...(placement ? { placement } : {}),
}) as PhiFormDescriptor["fields"][number];
const form = (fields: PhiFormDescriptor["fields"], layout?: PhiFormDescriptor["layout"]) =>
  ({ fields, ...(layout ? { layout } : {}) }) as PhiFormDescriptor;

const ONE_COLUMN = form([field("name"), field("email")]);
const TWO_COLUMNS = form([field("first", PHI_FORM_SIDE_START_HALF), field("last", PHI_FORM_SIDE_END_HALF)]);

describe("PHI_DIALOG_WIDTH_SINGLE_COLUMN", () => {
  it("leaves a Form the width at which its labels stand beside its fields, inside the body's inset", () => {
    expect(PHI_LAYOUT.contentMaxNarrow).toBe(PHI_FORM_RESPONSIVE_MIN_WIDTH.medium);
    const narrow = `calc(${PHI_FORM_RESPONSIVE_MIN_WIDTH.medium}px + 2 * ${PHI_DIALOG_BODY_CONFIG.padding})`;
    expect(PHI_DIALOG_WIDTH_SINGLE_COLUMN).toEqual({ compact: PHI_DIALOG_WIDTH.compact, medium: narrow, wide: narrow });
  });
});

describe("isPhiFormSingleColumn", () => {
  it("reads the default layout and stacked fields as one column", () => {
    expect(isPhiFormSingleColumn(ONE_COLUMN)).toBe(true);
    expect(isPhiFormSingleColumn(form([field("a"), field("b", PHI_FORM_STACKED_FULL)]))).toBe(true);
    expect(isPhiFormSingleColumn(form([field("a")], PHI_FORM_STACKED_LAYOUT))).toBe(true);
  });

  it("reads a field that leaves room beside it as two columns, with or without a neighbour", () => {
    expect(isPhiFormSingleColumn(TWO_COLUMNS)).toBe(false);
    expect(isPhiFormSingleColumn(form([field("a"), field("zip", PHI_FORM_SIDE_START_HALF)]))).toBe(false);
  });

  it("asks only the widths that have columns: a half at compact alone is still one column", () => {
    const compactHalf = { label: { compact: { start: 1, end: 13 } }, control: { compact: { start: 1, end: 13 } } };
    expect(isPhiFormSingleColumn(form([field("a", {
      label: { ...compactHalf.label, medium: { start: 1, end: 25 } },
      control: { ...compactHalf.control, medium: { start: 1, end: 25 } },
    })]))).toBe(true);
    expect(isPhiFormSingleColumn(form([field("a", { control: { compact: { start: 1, end: 25 }, wide: { start: 1, end: 13 } } })])))
      .toBe(false);
  });

  it("chooses the dialog's width from it", () => {
    expect(resolvePhiDialogFormWidth(ONE_COLUMN)).toBe(PHI_DIALOG_WIDTH_SINGLE_COLUMN);
    expect(resolvePhiDialogFormWidth(TWO_COLUMNS)).toBe(PHI_DIALOG_WIDTH);
  });
});

const page: PhiCmsPageNode = {
  id: 7,
  siteId: 3,
  areaMask: 2,
  path: "/admin/example",
  pageType: PhiCmsPageType.Standard,
  status: PhiCmsStatus.Published,
  flags: 0,
  visibilityMask: 2,
  accessPolicy: PHI_VIEWER_ACCESS_ANYONE,
  titleMsgId: null,
  descriptionMsgId: null,
  heroRootLayoutNodeId: null,
  headerBottomRootLayoutNodeId: null,
  siderRightRootLayoutNodeId: null,
  footerTopRootLayoutNodeId: null,
  drawerRightRootLayoutNodeId: null,
  contentRootLayoutNodeId: null,
  layoutConfig: {},
};

const ids = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: "@phis/ui/modules/dialog-width-test",
  presetKey: "dialog-width-test",
}, ["overlay", "body", "form", "secondForm"]);

const FORM_ID = "@phis/ui/modules/dialog-width-test/forms/one";

function dialogTree(input: { form?: PhiFormDescriptor; width?: unknown }): PhiResolvedCmsPageTree {
  const nodes = createPhiCmsPresetNodes(page);
  const dialog = nodes.dialog({
    id: ids.overlay,
    bodyLayoutNodeId: ids.body,
    sortOrder: 0,
    label: "dialog",
    config: { title: "Dialog", ...(input.width === undefined ? {} : { width: input.width }) },
    ...(input.form ? { body: { form: { descriptor: input.form } } } : {}),
  });
  return {
    page: nodes.page({}),
    pageMeta: { title: { msgId: 0, source: "Example", value: "Example" }, description: null },
    regions: [],
    overlays: [dialog.overlay],
    layoutNodes: dialog.layouts,
    contentWidgets: [nodes.widget({
      typeKey: "form",
      id: ids.form,
      parentLayoutNodeId: ids.body,
      slotIndex: 0,
      label: "form",
      config: { formId: FORM_ID },
    })],
  };
}

describe("dialog on createPhiCmsPresetNodes", () => {
  it("takes the width of the Form it is handed, and the reading measure without one", () => {
    expect(dialogTree({ form: ONE_COLUMN }).overlays[0]!.config.width).toBe(PHI_DIALOG_WIDTH_SINGLE_COLUMN);
    expect(dialogTree({ form: TWO_COLUMNS }).overlays[0]!.config.width).toBe(PHI_DIALOG_WIDTH);
    expect(dialogTree({}).overlays[0]!.config.width).toBe(PHI_DIALOG_WIDTH);
  });

  it("keeps a width the caller states", () => {
    const wide = { compact: "calc(100vw - 32px)", medium: 960 };
    expect(dialogTree({ form: ONE_COLUMN, width: wide }).overlays[0]!.config.width).toBe(wide);
  });
});

/** The Forms by id, as the compiler holds the ones its Modules ship. */
const forms = (descriptor: PhiFormDescriptor) => new Map([[FORM_ID, { descriptor }]]);

describe("the descriptor compiler's dialog width", () => {

  it("refuses a one-column Form at the default full width", () => {
    expect(() => assertPhiCmsPresetTreeContract(dialogTree({}), page, forms(ONE_COLUMN)))
      .toThrow(/one-column Form .* PHI_DIALOG_WIDTH_SINGLE_COLUMN/u);
  });

  it("passes the width `dialog` chose, a Form of two columns, a stated width and a Form it cannot see", () => {
    expect(() => assertPhiCmsPresetTreeContract(dialogTree({ form: ONE_COLUMN }), page, forms(ONE_COLUMN))).not.toThrow();
    expect(() => assertPhiCmsPresetTreeContract(dialogTree({}), page, forms(TWO_COLUMNS))).not.toThrow();
    expect(() => assertPhiCmsPresetTreeContract(dialogTree({ width: 720 }), page, forms(ONE_COLUMN))).not.toThrow();
    expect(() => assertPhiCmsPresetTreeContract(dialogTree({}), page, new Map())).not.toThrow();
  });
});

/*
 * The same rules from the verify-time door, as findings: what a Module runs in its own tests with its own
 * Forms (THIRD_PARTY_MODULES.md, "Checking a Page preset"). phis-shop 0.8.13 shipped a dialog of two
 * one-column Forms at the default width; the compiler refused it on a live Site, the package's tests could not.
 */
describe("checkPhiPresetTreeContract", () => {
  const SECOND_FORM_ID = "@phis/ui/modules/dialog-width-test/forms/two";
  const definitions = (descriptor: PhiFormDescriptor) => [
    { formId: FORM_ID, descriptor },
    { formId: SECOND_FORM_ID, descriptor },
  ];
  /** Two Forms in one dialog body, as the shop's Gallery dialog held them. */
  function twoFormDialog(width?: unknown): PhiResolvedCmsPageTree {
    const tree = dialogTree(width === undefined ? {} : { width });
    const first = tree.contentWidgets[0]!;
    return {
      ...tree,
      contentWidgets: [first, { ...first, id: ids.secondForm, slotIndex: 1, label: "second form", config: { formId: SECOND_FORM_ID } }],
    };
  }

  it("reports a dialog at PHI_DIALOG_WIDTH holding only one-column Forms, on the Overlay", () => {
    const findings = checkPhiPresetTreeContract(twoFormDialog(), { page, forms: definitions(ONE_COLUMN) });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ node: ids.overlay });
    expect(findings[0]!.message).toMatch(/one-column Form .* PHI_DIALOG_WIDTH_SINGLE_COLUMN/u);
    // The compiler throws the same words.
    expect(() => assertPhiCmsPresetTreeContract(twoFormDialog(), page, new Map(definitions(ONE_COLUMN).map((entry) => [entry.formId, entry]))))
      .toThrow(findings[0]!.message);
  });

  it("finds nothing where the width is stated, a Form has two columns, or no Form is handed over", () => {
    expect(checkPhiPresetTreeContract(twoFormDialog(PHI_DIALOG_WIDTH_SINGLE_COLUMN), { page, forms: definitions(ONE_COLUMN) })).toEqual([]);
    expect(checkPhiPresetTreeContract(twoFormDialog({ compact: "calc(100vw - 32px)", medium: 960 }), { page, forms: definitions(ONE_COLUMN) }))
      .toEqual([]);
    expect(checkPhiPresetTreeContract(twoFormDialog(), { page, forms: definitions(TWO_COLUMNS) })).toEqual([]);
    expect(checkPhiPresetTreeContract(twoFormDialog(), { page })).toEqual([]);
  });

  it("takes the Forms by id as the compiler holds them, too", () => {
    expect(checkPhiPresetTreeContract(dialogTree({}), { page, forms: forms(ONE_COLUMN) })).toHaveLength(1);
  });

  it("holds the tree to the rest of the contract as well, finding by finding", () => {
    const tree = dialogTree({ form: ONE_COLUMN });
    const broken: PhiResolvedCmsPageTree = {
      ...tree,
      page: { ...tree.page, path: "/admin/elsewhere" },
      contentWidgets: [{ ...tree.contentWidgets[0]!, parentLayoutNodeId: ids.secondForm }],
    };
    expect(checkPhiPresetTreeContract(broken, { page }).map((finding) => finding.message)).toEqual([
      "Preset loader returned a Page outside its requested context.",
      `Preset widget "${ids.form}" has unresolved parent "${ids.secondForm}".`,
    ]);
  });
});
