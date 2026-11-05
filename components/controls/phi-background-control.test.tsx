import type { ReactNode } from "react";
import { renderToStaticMarkup as renderBare } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhiConfigProvider } from "../root/phi-config-provider";
import { resolvePhiRootThemeState } from "../root/phi-root-theme-resolver";
import { PHI_ROOT_BACKGROUND_BASE_KINDS } from "../root/phi-root-background";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PHI_BACKGROUND_WIDGET_DEFAULT_LABELS } from "../widgets/label-types/background";
import { PhiBackgroundControl } from "./phi-background-control";

/* The Control reads the Site's palette from the root config, so it renders inside a real one. */
const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });

function renderToStaticMarkup(children: ReactNode) {
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

const overlaySection = `>${PHI_BACKGROUND_WIDGET_DEFAULT_LABELS.sections.overlay}<`;

/* What the Base Select shows as its chosen entry: the label of the option the value matches. */
const selectedBase = (html: string) =>
  html.match(/ant-select-content-has-value">(?:<span[^>]*>)+([^<]*)</u)?.[1] ?? null;

describe("PhiBackgroundControl and the Theme's ground", () => {
  it("chooses the Base with a Select rather than a segment row", () => {
    const html = renderToStaticMarkup(<PhiBackgroundControl value={null} onChange={() => {}} />);
    expect(html).toContain(`aria-label="${PHI_BACKGROUND_WIDGET_DEFAULT_LABELS.sections.base}"`);
    expect(html).toContain("ant-select");
    // The Overlay's kind is still a segment; the Base's is not among them.
    expect(html).not.toContain(`>${PHI_BACKGROUND_WIDGET_DEFAULT_LABELS.base.gradient}</div>`);
    expect(selectedBase(html)).toBe(PHI_BACKGROUND_WIDGET_DEFAULT_LABELS.base.none);
    expect(html).toContain(overlaySection);
  });

  it("offers Theme, and asks nothing further once it is chosen: no colour, no Overlay, no Filter", () => {
    const html = renderToStaticMarkup(
      <PhiBackgroundControl value={{ base: { kind: "theme" } }} onChange={() => {}} />,
    );
    expect(PHI_BACKGROUND_WIDGET_DEFAULT_LABELS.base.theme).toBe("Theme");
    expect(selectedBase(html)).toBe("Theme");
    expect(html).not.toContain(overlaySection);
    expect(html).not.toContain(`>${PHI_BACKGROUND_WIDGET_DEFAULT_LABELS.sections.filter}<`);
  });

  it("is not offered where the surface narrows it away, as the Root Background does", () => {
    const html = renderToStaticMarkup(
      <PhiBackgroundControl value={{ base: { kind: "theme" } }} baseKinds={PHI_ROOT_BACKGROUND_BASE_KINDS} onChange={() => {}} />,
    );
    expect(selectedBase(html)).not.toBe("Theme");
    expect(html).not.toContain(">Theme<");
  });
});
