import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhiConfigProvider } from "../../../../../components/root/phi-config-provider";
import { resolvePhiRootThemeState } from "../../../../../components/root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../../../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../../../../theme/phi-theme-palette";

import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/search";
import { PhiSearchBoxWidgetClient, type PhiSearchBoxWidgetClientConfig } from "./client";

/* The magnifier is a link before hydration, and a link reads the Site's config, so it renders inside a real one. */
const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });

const render = (config: Partial<PhiSearchBoxWidgetClientConfig>) => renderToStaticMarkup(
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
    <PhiSearchBoxWidgetClient
      labels={PHI_SEARCH_WIDGET_DEFAULT_LABELS}
      config={{ placeholder: "", initialQuery: "", action: "/en/search", ...config }}
    />
  </PhiConfigProvider>,
);

describe("search box, as the server sends it", () => {
  it("is a GET form to the results Page where nothing else is stated", () => {
    const html = render({});
    expect(html).toContain("phi-search-box--input");
    expect(html).toMatch(/<form[^>]*action="\/en\/search"/);
    expect(html).toMatch(/<form[^>]*method="get"/);
    expect(html).toMatch(/name="q"/);
    expect(html).not.toContain("phi-search-box__magnifier");
  });

  it("is a magnifier that links to the results Page until the page has hydrated", () => {
    const html = render({ variant: "icon-only" });
    expect(html).toContain("phi-search-box__magnifier");
    expect(html).toMatch(/<a[^>]*href="\/en\/search"/);
    expect(html).not.toContain("<form");
  });

  it("draws both the field and the magnifier for auto, the stylesheet showing one", () => {
    const html = render({ variant: "auto" });
    expect(html).toContain("phi-search-box__field");
    expect(html).toContain("phi-search-box__magnifier");
  });

  it("goes nowhere on the Builder's canvas", () => {
    const html = render({ interactive: false, action: undefined });
    expect(html).not.toMatch(/action=/);
    expect(html).toMatch(/<input[^>]*readonly/i);
    expect(render({ interactive: false, action: undefined, variant: "icon-only" })).not.toMatch(/href=/);
  });
});
