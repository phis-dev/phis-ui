import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./translate", () => ({
  trBulkForLocale: vi.fn(async (_locale: string, msgs: string[], ctx: string) =>
    msgs.map((msg) => (msg ? `site[${ctx}]:${msg}` : ""))),
  trGlobalBulkForLocale: vi.fn(async (_locale: string, msgs: string[], ctx: string) =>
    msgs.map((msg) => (msg ? `global[${ctx}]:${msg}` : ""))),
}));

import { trBulkForLocale, trGlobalBulkForLocale } from "./translate";
import { translatePhiCmsTreeWidgetTexts } from "./cms-widget-texts";
import type { PhiCmsConfigField } from "../types/cms-plugins";

const selectFields: PhiCmsConfigField[] = [
  { key: "label", type: "string", label: "Label" },
  { key: "value", type: "string", label: "Value" },
  {
    key: "options",
    type: "collection",
    label: "Options",
    itemKeyField: "value",
    itemFields: [
      { key: "value", type: "string", label: "Value" },
      { key: "label", type: "string", label: "Label" },
      { key: "description", type: "string", label: "Description" },
    ],
  },
];

const registry = {
  runtimeWidgetPluginsByType: new Map<string, unknown>([
    ["select", { fields: selectFields }],
    ["markdown", { fields: [{ key: "title", type: "string", label: "Title" }], translatesOwnText: true }],
    ["card", {
      fields: [],
      configTexts: [
        { key: "badge", register: "label" },
        { key: "features", item: "text", values: "values", register: "message" },
      ],
    }],
  ]),
  previewWidgetPluginsByType: new Map(),
} as never;

const runtime = { locale: { current: "de" }, site: { key: "acme", name: "Acme" } } as never;

function widget(id: string, widgetType: string, config: Record<string, unknown>) {
  return { id, widgetType, config } as never;
}

function tree(contentWidgets: unknown[]) {
  return { regions: [], overlays: [], layoutNodes: [], contentWidgets } as never;
}

describe("a page's Widget words, translated in one pass", () => {
  it("translates the label and the options' words, and leaves the values alone", async () => {
    const result = await translatePhiCmsTreeWidgetTexts(tree([
      widget("a", "select", {
        label: "Area",
        value: "public",
        options: [{ value: "accounting", label: "Accounting", description: "Books." }],
      }),
    ]), registry, runtime);

    expect((result as { contentWidgets: { config: unknown }[] }).contentWidgets[0]!.config).toEqual({
      label: "site[Web UI label]:Area",
      value: "public",
      options: [{
        value: "accounting",
        label: "site[Web UI label]:Accounting",
        description: "site[Web UI message]:Books.",
      }],
    });
  });

  it("sends a Preset's words to the platform's store and the Site's to the Site's", async () => {
    const result = await translatePhiCmsTreeWidgetTexts(tree([
      widget("a", "select", { label: "Area", textSource: "preset" }),
      widget("b", "select", { label: "Contact", textSource: "site" }),
    ]), registry, runtime);
    const configs = (result as { contentWidgets: { config: { label: string } }[] }).contentWidgets.map((entry) => entry.config.label);

    expect(configs).toEqual(["global[Web UI label]:Area", "site[Web UI label]:Contact"]);
  });

  it("asks once per store and register, whatever the number of Widgets", async () => {
    vi.mocked(trBulkForLocale).mockClear();
    vi.mocked(trGlobalBulkForLocale).mockClear();
    await translatePhiCmsTreeWidgetTexts(tree([
      widget("a", "select", { label: "One" }),
      widget("b", "select", { label: "Two" }),
      widget("c", "select", { label: "Three", textSource: "preset" }),
    ]), registry, runtime);

    expect(trBulkForLocale).toHaveBeenCalledTimes(1);
    expect(trBulkForLocale).toHaveBeenCalledWith("de", ["One", "Two"], "Web UI label");
    expect(trGlobalBulkForLocale).toHaveBeenCalledTimes(1);
  });

  it("leaves a content Widget to translate its own words", async () => {
    const input = tree([widget("m", "markdown", { title: "Intro" })]);
    const result = await translatePhiCmsTreeWidgetTexts(input, registry, runtime);

    expect(result).toBe(input);
  });

  it("translates what a Widget declares beyond its fields, a list entry's values kept out of the sentence", async () => {
    vi.mocked(trBulkForLocale).mockClear();
    const result = await translatePhiCmsTreeWidgetTexts(tree([
      widget("c", "card", {
        badge: "Popular",
        features: [{ text: "Up to %1 users on {site.name}", values: ["10"] }],
      }),
    ]), registry, runtime);

    expect(trBulkForLocale).toHaveBeenCalledWith("de", ["Up to %1 users on %2"], "Web UI message");
    expect((result as { contentWidgets: { config: unknown }[] }).contentWidgets[0]!.config).toEqual({
      badge: "site[Web UI label]:Popular",
      features: [{ text: "site[Web UI message]:Up to 10 users on Acme", values: ["10"] }],
    });
  });

  it("fills a node's placeholders without sending its words where a Preset left them as written", async () => {
    vi.mocked(trBulkForLocale).mockClear();
    const result = await translatePhiCmsTreeWidgetTexts(tree([
      { ...(widget("c", "card", { features: [{ text: "Up to %1 users", values: ["10"] }] }) as object), flags: 1 << 5 },
    ]), registry, runtime);

    expect(trBulkForLocale).not.toHaveBeenCalled();
    expect((result as { contentWidgets: { config: { features: { text: string }[] } }[] }).contentWidgets[0]!.config.features[0]!.text)
      .toBe("Up to 10 users");
  });
});
