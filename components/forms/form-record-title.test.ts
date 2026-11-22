import { describe, expect, it } from "vitest";

import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../helpers/cms-preset-nodes";
import { checkPhiPresetTreeContract } from "../../module-page-check";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../types/cms";
import { createPhiPresetCmsInstanceIdMap } from "../../types/cms-instance-id";
import type { PhiFormDescriptor } from "../../types";
import { createPhiSignalAddress } from "../../types/signals";
import { parsePhiFormWidgetConfig } from "./form-widget-config";
import {
  PHI_FORM_RECORD_TITLE_CAPABILITY,
  readPhiFormWidgetTitleFromRecord,
  resolvePhiFormRecordTitle,
} from "./form-record-title";

/*
 * A dialog named by the record its Form reads ("Gallery: Private Cloud"): the sentence a Form text with
 * `%1`, translated, the value the record's and never translated, an empty title where there is nothing
 * to name it by -- which the Overlay answers with its own (`components/overlays/phi-overlay-title.test.ts`).
 */

const GALLERY_OF = { kind: "label", key: "galleryOf", fallback: "Gallery: %1" } as const;
const titleFromRecord = { template: GALLERY_OF, field: "product" };

describe("the title a record gives", () => {
  it("is the sentence with the record's value, after the read", () => {
    expect(resolvePhiFormRecordTitle(titleFromRecord, { id: 7, product: "Private Cloud" })).toBe("Gallery: Private Cloud");
    expect(resolvePhiFormRecordTitle(titleFromRecord, { product: "  Private Cloud " })).toBe("Gallery: Private Cloud");
    expect(resolvePhiFormRecordTitle({ ...titleFromRecord, field: "number" }, { number: 1042 })).toBe("Gallery: 1042");
  });

  it("is empty where the record has no value for it, so the dialog keeps its own", () => {
    for (const record of [{ product: "" }, { product: "   " }, { product: null }, {}, { product: { title: "x" } }, { product: Number.NaN }]) {
      expect(resolvePhiFormRecordTitle(titleFromRecord, record)).toBe("");
    }
  });

  it("is empty before a row is read: the create dialog's Form, and a row asked for but not here yet", () => {
    expect(resolvePhiFormRecordTitle(titleFromRecord, null)).toBe("");
    // A Form placed with no titleFromRecord takes none, and the Form announces nothing.
    expect(parsePhiFormWidgetConfig({ formId: "@phis/ui/modules/test/forms/create" }).titleFromRecord).toBeNull();
  });

  it("follows the row: a second row's read gives the second row's name", () => {
    const rows = [{ product: "Private Cloud" }, { product: "Backup" }, { product: "" }];
    expect(rows.map((row) => resolvePhiFormRecordTitle(titleFromRecord, row))).toEqual(["Gallery: Private Cloud", "Gallery: Backup", ""]);
  });

  it("translates the sentence and not the value", () => {
    expect(resolvePhiFormRecordTitle(titleFromRecord, { product: "Private Cloud" }, { galleryOf: "Galerie : %1" }))
      .toBe("Galerie : Private Cloud");
    // A key the Form's labels lack falls back, as every Form text does.
    expect(resolvePhiFormRecordTitle(titleFromRecord, { product: "Private Cloud" }, { other: "x" })).toBe("Gallery: Private Cloud");
    // A literal is the text itself; the value goes in as it is, `$` and `%1` included.
    expect(resolvePhiFormRecordTitle({ template: { kind: "literal", value: "Edit %1" }, field: "name" }, { name: "A$&B %1" }))
      .toBe("Edit A$&B %1");
  });
});

describe("titleFromRecord on a Form placement", () => {
  it("is read with its sentence and field", () => {
    expect(parsePhiFormWidgetConfig({ titleFromRecord: { template: GALLERY_OF, field: " product " } }).titleFromRecord)
      .toEqual({ template: GALLERY_OF, field: "product" });
    expect(readPhiFormWidgetTitleFromRecord(null)).toBeNull();
  });

  it("refuses a title that names no field, or a sentence without exactly one %1", () => {
    expect(() => readPhiFormWidgetTitleFromRecord("Gallery: %1")).toThrow(/is no \{ template, field \}/u);
    expect(() => readPhiFormWidgetTitleFromRecord({ template: GALLERY_OF })).toThrow(/field must name/u);
    expect(() => readPhiFormWidgetTitleFromRecord({ template: "Gallery: %1", field: "product" })).toThrow(/Form text/u);
    expect(() => readPhiFormWidgetTitleFromRecord({ template: { kind: "label", key: "galleryOf" }, field: "product" })).toThrow(/Form text/u);
    for (const fallback of ["Gallery", "Gallery: %1 %1", "Gallery: %2", "%1 of %2"]) {
      expect(() => readPhiFormWidgetTitleFromRecord({ template: { ...GALLERY_OF, fallback }, field: "product" })).toThrow(/%1 exactly once/u);
    }
  });
});

const page: PhiCmsPageNode = {
  id: 7, siteId: 3, areaMask: 2, path: "/admin/example", pageType: PhiCmsPageType.Standard, status: PhiCmsStatus.Published,
  flags: 0, visibilityMask: 2, accessPolicy: PHI_VIEWER_ACCESS_ANYONE, titleMsgId: null, descriptionMsgId: null,
  heroRootLayoutNodeId: null, headerBottomRootLayoutNodeId: null, siderRightRootLayoutNodeId: null, footerTopRootLayoutNodeId: null,
  drawerRightRootLayoutNodeId: null, contentRootLayoutNodeId: null, layoutConfig: {},
};
const ids = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: "@phis/ui/modules/record-title-test",
  presetKey: "record-title-test",
}, ["overlay", "body", "form"]);
const FORM_ID = "@phis/ui/modules/record-title-test/forms/gallery";
const forms = new Map([[FORM_ID, {
  descriptor: {
    fields: [
      { key: "id", fieldProviderKey: "@phis/ui/form-fields/hidden" },
      { key: "product", fieldProviderKey: "@phis/ui/form-fields/hidden" },
    ],
  } as unknown as PhiFormDescriptor,
}]]);
const overlay = createPhiSignalAddress("cms", ids.overlay);
const TITLE_ROUTE = { routeKey: "gallery-title", capabilityId: "title", scope: "page", channel: "title", action: "change", valueType: "string", receiver: overlay } as const;
const RECORD_TITLE_ROUTE = { ...TITLE_ROUTE, routeKey: "gallery-record-title", capabilityId: PHI_FORM_RECORD_TITLE_CAPABILITY } as const;

/** A Gallery dialog whose Form names the row in the dialog's title, as a Module's Page writes it. */
function galleryTree(input: {
  form?: Record<string, unknown>;
  overlayListens?: readonly Record<string, unknown>[];
} = {}): PhiResolvedCmsPageTree {
  const nodes = createPhiCmsPresetNodes(page);
  const dialog = nodes.dialog({
    id: ids.overlay,
    bodyLayoutNodeId: ids.body,
    sortOrder: 0,
    label: "gallery",
    config: { title: "Gallery", width: 720, signalRoutes: { listens: input.overlayListens ?? [TITLE_ROUTE] } },
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
      label: "gallery form",
      config: {
        formId: FORM_ID,
        source: { providerKey: "@phis/ui/record-title-test", resourceKey: "pictures" },
        openActionKey: "gallery",
        titleFromRecord,
        signalRoutes: { emits: [RECORD_TITLE_ROUTE] },
        ...input.form,
      } as never,
    })],
  };
}

const messages = (tree: PhiResolvedCmsPageTree) => checkPhiPresetTreeContract(tree, { page, forms }).map((finding) => finding.message);

describe("the descriptor compiler's record titles", () => {
  it("passes a Form that reads its record and sends its title to the Overlay's title input", () => {
    expect(messages(galleryTree())).toEqual([]);
  });

  it("refuses a title from a record the Form never reads, one that goes nowhere, and a route that carries none", () => {
    expect(messages(galleryTree({ form: { source: null } }))).toEqual([
      `Preset Form "${ids.form}" takes its title from a record it never reads: titleFromRecord needs a source.`,
    ]);
    expect(messages(galleryTree({ form: { signalRoutes: { emits: [] } } }))).toEqual([
      `Preset Form "${ids.form}" takes a titleFromRecord that goes nowhere: no route on "recordTitle".`,
    ]);
    expect(messages(galleryTree({ form: { titleFromRecord: null } }))).toEqual([
      `Preset Form "${ids.form}" routes "recordTitle" but takes no titleFromRecord, so it announces nothing.`,
    ]);
  });

  it("refuses a field the Form does not hold, and a sentence without its %1", () => {
    expect(messages(galleryTree({ form: { titleFromRecord: { ...titleFromRecord, field: "title" } } }))).toEqual([
      `Preset Form "${ids.form}" takes its title from "title", which is no field of "${FORM_ID}".`,
    ]);
    expect(messages(galleryTree({ form: { titleFromRecord: { template: { ...GALLERY_OF, fallback: "Gallery" }, field: "product" } } })))
      .toEqual([expect.stringMatching(/%1 exactly once/u)]);
  });

  it("refuses a title sent to an Overlay that does not hear it on that channel", () => {
    expect(messages(galleryTree({ overlayListens: [] }))).toEqual([
      `Preset Form "${ids.form}" sends its title to Overlay "${ids.overlay}", which has no "title" route on page title/change.`,
    ]);
    expect(messages(galleryTree({ overlayListens: [{ ...TITLE_ROUTE, channel: "heading" }] }))).toHaveLength(1);
    expect(messages(galleryTree({ form: { signalRoutes: { emits: [{ ...RECORD_TITLE_ROUTE, valueType: "none" }] } } })))
      .toEqual([`Preset Form "${ids.form}" route "gallery-record-title" must carry "recordTitle" as change/string.`]);
  });
});
