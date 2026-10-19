import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../server-helpers/translate", () => ({
  trBulkForLocale: vi.fn(async (_locale: string, texts: string[]) =>
    texts.map((text) => (text === "Details" ? "Einzelheiten" : ""))),
}));

import { PhiCmsFlags } from "../../constants/phi-cms";
import { createPhiLayoutOwnTextTranslator } from "./phi-cms-layout-renderer";

/*
 * A Collapsible's panel titles are text in its own config, translated the way a Widget's are: unless the
 * node's NoTranslate flag says they already read as they should. The renderer hands the Layout the
 * translator, because the Layout plugin is loaded in the browser too and translating is a server matter.
 */
const runtime = { locale: { current: "de" } };
const collapsible = { translatesOwnText: true as const };

describe("a Layout's own text", () => {
  it("is read in the reader's language, and kept where the catalogue has no answer", async () => {
    const translate = createPhiLayoutOwnTextTranslator(collapsible, { flags: 0 }, runtime);
    expect(await translate(["Details", "Notes", ""])).toEqual(["Einzelheiten", "Notes", ""]);
  });

  it("stays as written under NoTranslate", async () => {
    const translate = createPhiLayoutOwnTextTranslator(collapsible, { flags: PhiCmsFlags.NoTranslate }, runtime);
    expect(await translate(["Details"])).toEqual(["Details"]);
  });

  it("stays as written for a Layout that does not translate its own text", async () => {
    const translate = createPhiLayoutOwnTextTranslator({}, { flags: 0 }, runtime);
    expect(await translate(["Details"])).toEqual(["Details"]);
  });
});
