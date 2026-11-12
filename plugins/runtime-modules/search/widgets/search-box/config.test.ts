import { describe, expect, it } from "vitest";

import { PHI_SEARCH_BOX_WIDGET_DEFINITION } from "./config";

const parse = (raw: Record<string, unknown>) => PHI_SEARCH_BOX_WIDGET_DEFINITION.parseConfig(raw);

describe("search box config", () => {
  it("leaves the variant to the input where none is stated", () => {
    expect(parse({}).variant).toBeUndefined();
  });

  it("reads each variant it knows", () => {
    expect(parse({ variant: "input" }).variant).toBe("input");
    expect(parse({ variant: "icon-only" }).variant).toBe("icon-only");
    expect(parse({ variant: "auto" }).variant).toBe("auto");
  });

  it("drops a variant it does not know, as it drops an unknown size", () => {
    expect(parse({ variant: "drawer" }).variant).toBeUndefined();
    expect(parse({ controlSize: "huge" }).controlSize).toBeUndefined();
  });

  it("says Search where the author stated nothing, and nothing where the author cleared it", () => {
    expect(parse({}).placeholder).toBe("Search");
    expect(parse({ placeholder: "" }).placeholder).toBe("");
    expect(parse({ placeholder: "  Find a page " }).placeholder).toBe("Find a page");
  });
});
