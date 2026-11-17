import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The search index asks a Widget for its words where no request is: at start-up and on a timer. A Widget
 * that translates must name the runtime it was given to the translation and never find it in the request's
 * scope -- which is empty here, as it was in the built Site, where it failed with "Missing phi request
 * runtime" for every Markdown and Simple Text Widget at every start.
 */

vi.mock("server-only", () => ({}));
vi.mock("../../../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "http://phis.test", internalToken: "token" }),
}));
const trBulk = vi.hoisted(() => vi.fn(async (_options: { siteKey: string; locale: string }, messages: string[]) =>
  messages.map((message) => (message ? `de:${message}` : ""))));
vi.mock("../../../../gateway/tr", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../gateway/tr")>()),
  trBulk,
}));

import type { PhiBlockRuntime } from "../../../../types";
import type { PhiCmsContentWidgetNode } from "../../../../types/cms";
import { PHI_MARKDOWN_WIDGET_PLUGIN } from "./markdown/plugin";
import { PHI_SIMPLE_TEXT_WIDGET_PLUGIN } from "./simple-text/plugin";

const runtime = {
  site: { key: "site-1", name: "Site", publicUrl: "https://site.test", timeZone: "UTC", availableLocales: [] },
  locale: { current: "de" },
  area: "public",
  viewer: { access: "anonymous" },
} as unknown as PhiBlockRuntime;

function node(widgetType: string, config: Record<string, unknown>) {
  return { id: 1, widgetType, flags: 0, config } as unknown as PhiCmsContentWidgetNode;
}

beforeEach(() => {
  trBulk.mockClear();
});

describe("searchText with an explicit runtime and no request scope", () => {
  it("reads a Markdown Widget's translated words", async () => {
    const widget = node("markdown", { sourceMode: "inline", markdown: "# Imprint\n\nRegister court Wangs", eyebrow: "Legal" });
    const lines = await PHI_MARKDOWN_WIDGET_PLUGIN.searchText!({
      widget,
      config: PHI_MARKDOWN_WIDGET_PLUGIN.parseConfig(widget.config as Record<string, unknown>),
      runtime,
    });
    expect(lines.join("\n")).toContain("Register court Wangs");
    expect(lines.join("\n")).toContain("de:");
    expect(trBulk.mock.calls.every(([options]) => options.siteKey === "site-1" && options.locale === "de")).toBe(true);
  });

  it("reads a Simple Text Widget's translated words", async () => {
    const widget = node("simple-text", { text: "Commercial register" });
    const lines = await PHI_SIMPLE_TEXT_WIDGET_PLUGIN.searchText!({
      widget,
      config: PHI_SIMPLE_TEXT_WIDGET_PLUGIN.parseConfig(widget.config as Record<string, unknown>),
      runtime,
    });
    expect(lines).toEqual(["de:Commercial register"]);
  });
});
