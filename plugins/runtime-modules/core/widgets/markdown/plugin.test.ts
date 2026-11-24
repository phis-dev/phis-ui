import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const readField = vi.hoisted(() => vi.fn());
vi.mock("../../../../../server-helpers/record-fields", () => ({ resolvePhiWidgetRecordField: readField }));
vi.mock("./server", () => ({ PhiMarkdownWidget: () => null }));

import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { PhiRecordMarkdownFlag } from "../../../../../constants/record-field-kinds";
import { PHI_MARKDOWN_WIDGET_PLUGIN } from "./plugin";

const runtime = { locale: { current: "de" } } as never;
const registry = {} as never;

/** The config the Widget hands its renderer, or null where it draws nothing. */
async function render(field: unknown, flags = 0) {
  readField.mockResolvedValueOnce({ bound: true, field });
  const element = await PHI_MARKDOWN_WIDGET_PLUGIN.render({
    widget: { id: 7, flags } as never,
    config: PHI_MARKDOWN_WIDGET_PLUGIN.parseConfig({ recordField: "description" }),
    runtime,
    registry,
    tree: {} as never,
  });
  return element ? (element as { props: { config: Record<string, unknown> } }).props.config : null;
}

/*
 * A record's Markdown says the language it is written in. Source text is translated from it, as any
 * Markdown is, unit by unit (TRANSLATIONS.md); a person's translation is drawn as they wrote it.
 */
describe("a Markdown Widget bound to a field of the page record", () => {
  it("translates source text from the language the record names", async () => {
    expect(await render({ kind: "markdown", value: { text: "# Chaise\n\nEn chêne.", sourceLocale: "fr", flags: 0 } }))
      .toMatchObject({ sourceMode: "inline", markdown: "# Chaise\n\nEn chêne.", sourceLocale: "fr", translate: true });
  });

  it("draws a person's translation as written", async () => {
    expect(await render({
      kind: "markdown",
      value: { text: "# Stuhl", sourceLocale: "fr", flags: PhiRecordMarkdownFlag.Translated },
    })).toMatchObject({ markdown: "# Stuhl", translate: false });
  });

  it("never translates where the node says NoTranslate", async () => {
    expect(await render({ kind: "markdown", value: { text: "# Chaise", sourceLocale: "fr", flags: 0 } }, PhiCmsFlags.NoTranslate))
      .toMatchObject({ markdown: "# Chaise", translate: false });
  });

  it("draws a text field as written, and nothing for an empty or missing field", async () => {
    expect(await render({ kind: "text", value: "Oak chair" })).toMatchObject({ markdown: "Oak chair", translate: false });
    expect(await render({ kind: "markdown", value: { text: "  ", sourceLocale: "fr", flags: 0 } })).toBeNull();
    expect(await render(null)).toBeNull();
  });
});
