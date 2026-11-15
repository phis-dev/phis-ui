import type { ReactNode } from "react";
import { renderToStaticMarkup as renderBare } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhiConfigProvider } from "../root/phi-config-provider";
import { resolvePhiRootThemeState } from "../root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PhiNumberControl } from "./phi-number-control";

/* A labelled Control reads the root config, so it renders inside a real one. */
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

/* The spin buttons carry names of their own; the field is the input. */
const inputOf = (html: string) => /<input [^>]*>/.exec(html)?.[0] ?? "";

describe("PhiNumberControl accessible name", () => {
  it("names the field by ariaLabel where it shows no label", () => {
    const html = renderToStaticMarkup(<PhiNumberControl value={3} ariaLabel="Columns" onChange={() => undefined} />);
    expect(inputOf(html)).toContain('aria-label="Columns"');
    expect(inputOf(html)).not.toContain("aria-labelledby");
  });

  it("names the field by its visible label, which wins over ariaLabel", () => {
    const html = renderToStaticMarkup(
      <PhiNumberControl value={3} label="Rows" ariaLabel="Columns" onChange={() => undefined} />,
    );
    const labelId = /<span id="([^"]+)"[^>]*>Rows<\/span>/.exec(html)?.[1];
    expect(labelId).toBeTruthy();
    expect(inputOf(html)).toContain(`aria-labelledby="${labelId}"`);
    expect(inputOf(html)).not.toContain("aria-label=");
    expect(html).not.toContain("Columns");
  });

  it("names the field by its label alone as before", () => {
    const html = renderToStaticMarkup(<PhiNumberControl value={3} label="Rows" onChange={() => undefined} />);
    expect(inputOf(html)).toContain("aria-labelledby=");
    expect(inputOf(html)).not.toContain("aria-label=");
  });
});
