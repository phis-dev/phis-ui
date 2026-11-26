import type { ReactNode } from "react";
import { renderToStaticMarkup as renderBare } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhiConfigProvider } from "../../../root/phi-config-provider";
import { resolvePhiRootThemeState } from "../../../root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../../../theme/phi-theme-palette";
import { renderPhiValueContent, renderPhiValueWithLead, renderPhiValueWithSecondary, type PhiRenderedValueLabels } from "./phi-rendered-value";

const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });
const labels = { interval: {} } as unknown as PhiRenderedValueLabels;
const ADDRESS = "/api/site/media/12/variants/10?r=3&v=2";

function render(children: ReactNode) {
  return renderBare(
    <PhiConfigProvider
      locale={undefined}
      fonts={{}}
      fontFamilies={[]}
      mode="light"
      theme={themeState.themes.light}
      presets={PHI_CORE_THEME_PRESET_PLUGINS}
      customColors={resolvePhiPublishedThemeCustomColors(siteTheme, "light", PHI_CORE_THEME_PRESET_PLUGINS)}
      rootClassName=""
      rootStyle={{}}
      controlShape="rounded"
    >
      {children}
    </PhiConfigProvider>,
  );
}

describe("the image renderer", () => {
  it("draws the server's address as a small decorative picture, lazily, without the optimiser", () => {
    const html = render(renderPhiValueContent(ADDRESS, { renderer: "image" }, labels));
    expect(html).toContain(`src="${ADDRESS.replace("&", "&amp;")}"`);
    expect(html).toContain('alt=""');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('width="32"');
    expect(html).toContain("object-fit:contain");
    expect(html).not.toContain("/_next/image");
  });

  it("draws nothing for an empty value or an address that is not on this Site", () => {
    for (const value of [null, "", "https://elsewhere.test/a.png", "//elsewhere.test/a.png", "/\\elsewhere.test", 12]) {
      expect(renderPhiValueContent(value, { renderer: "image" }, labels)).toBeNull();
    }
  });
});

describe("what stands ahead of a value", () => {
  it("puts the picture and then the icon ahead of the value", () => {
    const html = render(renderPhiValueWithLead("Studio Pro", { image: ADDRESS, icon: "star" }));
    expect(html.indexOf("<img")).toBeGreaterThan(-1);
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("Studio Pro"));
    expect(html).toContain('alt=""');
  });

  it("leaves the value as it was where the row has neither", () => {
    expect(renderPhiValueWithLead("Studio Pro", { image: null, icon: "" })).toBe("Studio Pro");
    expect(renderPhiValueWithLead("Studio Pro", { image: "https://elsewhere.test/a.png" })).toBe("Studio Pro");
  });
});

describe("the tag renderers", () => {
  it("keeps a badge inside its place and ends a word that does not fit in an ellipsis", () => {
    const html = render(renderPhiValueContent("unregistered", { renderer: "badge", valueMap: { unregistered: "Not registered" } }, labels));
    expect(html).toMatch(/class="[^"]*ant-tag[^"]*"[^>]*style="[^"]*max-width:100%/);
    expect(html).toMatch(/<span style="[^"]*overflow:hidden;text-overflow:ellipsis;white-space:nowrap[^"]*">Not registered<\/span>/);
  });

  it("caps every tag of a tags value, and the row of tags itself", () => {
    const html = render(renderPhiValueContent(["a", "b"], { renderer: "tags" }, labels));
    expect(html.match(/max-width:100%;min-width:0/g)).toHaveLength(2);
    expect(html).toMatch(/display:inline-flex;max-width:100%/);
  });
});

describe("what an empty value says", () => {
  it("draws the column's empty text for no value, whatever the renderer", () => {
    for (const renderer of ["datetime", "date", "text", "badge", "tags", "money", "interval", "image"] as const) {
      for (const value of [null, undefined, "", []]) {
        expect(renderPhiValueContent(value, { renderer, emptyText: "Unlimited" }, labels)).toBe("Unlimited");
      }
    }
  });

  it("is not a value: valueMap does not reach it, and a value that is there is drawn as it was", () => {
    expect(renderPhiValueContent(null, { emptyText: "Unlimited", valueMap: { "": "Never" } }, labels)).toBe("Unlimited");
    expect(renderPhiValueContent("active", { emptyText: "Unlimited", valueMap: { active: "Active" } }, labels)).toBe("Active");
    expect(renderPhiValueContent(0, { emptyText: "Unlimited" }, labels)).toBe("0");
    expect(renderPhiValueContent(false, { renderer: "checkbox", emptyText: "Unlimited" }, labels)).not.toBe("Unlimited");
  });

  it("leaves an empty cell empty where the column says nothing", () => {
    expect(renderPhiValueContent(null, { renderer: "datetime" }, labels)).toBeNull();
    expect(renderPhiValueContent("", {}, labels)).toBeNull();
  });
});

describe("a value with a second line", () => {
  it("draws the second value under the first, muted, smaller and set in", () => {
    const html = render(renderPhiValueWithSecondary("Studio Pro", renderPhiValueContent("draft", {
      renderer: "badge", valueMap: { draft: "Draft" },
    }, labels)));
    expect(html.indexOf("Studio Pro")).toBeLessThan(html.indexOf("Draft"));
    expect(html).toMatch(/display:flex;flex-direction:column/);
    expect(html).toMatch(/color:var\(--phi-color-text-secondary\);font-size:smaller;padding-inline-start:var\(--phi-padding-xxs\)/);
  });

  it("leaves the value as it was where there is nothing to say under it, and says its empty text", () => {
    expect(renderPhiValueWithSecondary("Studio Pro", renderPhiValueContent(null, { renderer: "datetime" }, labels))).toBe("Studio Pro");
    expect(renderPhiValueWithSecondary("Studio Pro", null)).toBe("Studio Pro");
    const html = render(renderPhiValueWithSecondary("Studio Pro", renderPhiValueContent(null, { renderer: "datetime", emptyText: "Never" }, labels)));
    expect(html).toContain("Never");
  });
});
