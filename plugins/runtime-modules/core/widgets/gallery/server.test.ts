import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const readField = vi.hoisted(() => vi.fn());
const readSource = vi.hoisted(() => vi.fn());
vi.mock("../../../../../server-helpers/record-fields", () => ({ resolvePhiWidgetRecordField: readField }));
vi.mock("../../../../../server-helpers/record-source", () => ({ resolvePhiRecordSource: readSource }));
vi.mock("../../../../../components/widgets/label-sets/gallery", async () => {
  const { PHI_GALLERY_WIDGET_DEFAULT_LABELS } = await import("../../../../../components/widgets/label-types/gallery");
  return { getPhiGalleryWidgetLabels: async () => PHI_GALLERY_WIDGET_DEFAULT_LABELS };
});
vi.mock("../../../../../components/widgets/label-sets/runtime-options", () => ({ buildPhiWidgetLabelTranslatorOptions: () => ({}) }));

import { PhiGalleryWidgetServer } from "./server";

const runtime = { locale: { current: "en" } } as never;
const registry = {} as never;

async function render(config: Record<string, unknown>) {
  const element = await PhiGalleryWidgetServer({ runtime, registry, config: config as never });
  return element ? (element.props as { componentProps: { images?: unknown[]; pictures?: unknown[] } }).componentProps : null;
}

/*
 * Having no picture is the Gallery's own case to show: the client draws the empty state for an empty
 * list, so the server hands it one rather than nothing at all.
 */
describe("a Gallery without pictures", () => {
  it("hands an empty list on for a record field that has none", async () => {
    readField.mockResolvedValueOnce({ bound: true, field: null });
    expect(await render({ recordField: "pictures" })).toMatchObject({ pictures: [] });
  });

  it("hands an empty list on for an empty Folder and for no Folder at all", async () => {
    readField.mockResolvedValue({ bound: false });
    readSource.mockResolvedValueOnce({ status: "ok", record: [] });
    expect(await render({ source: { providerKey: "core/folder", params: {} } })).toMatchObject({ images: [] });
    expect(await render({ source: null })).toMatchObject({ images: [] });
  });
});
