import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * What a `record` condition is judged against: the Page record's fields, as the bound Widgets read them.
 *
 * The read is the Widgets' own request-memoised one, so it is mocked here; what is under test is that a
 * tree asking nothing reads nothing, and that each field arrives as the value a `recordField` would draw.
 */

vi.mock("server-only", () => ({}));
const resolvePhiPageRecordFields = vi.fn();
vi.mock("./record-fields", () => ({ resolvePhiPageRecordFields: (...args: unknown[]) => resolvePhiPageRecordFields(...args) }));

import { resolvePhiCmsTreeRecordConditionFields } from "./cms-node-record";
import type { PhiCmsContentWidgetNode, PhiResolvedCmsRenderableTree } from "../types/cms";

function widget(visibleWhen: unknown): PhiCmsContentWidgetNode {
  return { config: { visibleWhen } } as unknown as PhiCmsContentWidgetNode;
}

function treeWith(...widgets: PhiCmsContentWidgetNode[]) {
  return {
    layoutNodes: [],
    overlays: [],
    contentWidgets: widgets,
  } as unknown as Pick<PhiResolvedCmsRenderableTree, "layoutNodes" | "contentWidgets" | "overlays">;
}

const registry = {} as Parameters<typeof resolvePhiCmsTreeRecordConditionFields>[1];
const runtime = {} as Parameters<typeof resolvePhiCmsTreeRecordConditionFields>[2];
const hasIcon = { source: "record", valuePath: "icon", operator: "truthy" };
const icon = { src: "https://cdn.example/icon.svg", alt: "Chair" };

describe("resolvePhiCmsTreeRecordConditionFields", () => {
  beforeEach(() => resolvePhiPageRecordFields.mockReset());

  it("reads nothing for a tree that asks nothing of the record", async () => {
    const tree = treeWith(widget({ source: "page", valuePath: "query.token", operator: "truthy" }), widget(undefined));
    await expect(resolvePhiCmsTreeRecordConditionFields(tree, registry, runtime)).resolves.toBeNull();
    expect(resolvePhiPageRecordFields).not.toHaveBeenCalled();
  });

  it("answers each field as its value, by its key", async () => {
    resolvePhiPageRecordFields.mockResolvedValue({
      status: "ok",
      fields: new Map([["icon", { kind: "picture", value: icon }], ["title", { kind: "text", value: "Chair" }]]),
    });
    await expect(resolvePhiCmsTreeRecordConditionFields(treeWith(widget(hasIcon)), registry, runtime))
      .resolves.toEqual({ icon, title: "Chair" });
  });

  it("answers no record for a Page that is about none", async () => {
    resolvePhiPageRecordFields.mockResolvedValue({ status: "none" });
    await expect(resolvePhiCmsTreeRecordConditionFields(treeWith(widget(hasIcon)), registry, runtime)).resolves.toBeNull();
  });

  // The bound Widgets draw nothing for a record whose fields could not be read, and the conditions agree.
  it("answers a record without fields where they could not be read", async () => {
    resolvePhiPageRecordFields.mockResolvedValue({ status: "unavailable", reason: "down" });
    await expect(resolvePhiCmsTreeRecordConditionFields(treeWith(widget(hasIcon)), registry, runtime)).resolves.toEqual({});
  });
});
