import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhiConfigProvider } from "../root/phi-config-provider";
import { resolvePhiRootThemeState } from "../root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PHI_GALLERY_WIDGET_DEFAULT_LABELS } from "../widgets/label-types/gallery";
import { PhiSequenceRun, type PhiSequenceThumbnail } from "./phi-sequence-run";

const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });

const items = ["a", "b", "c"].map((name) => <span key={name}>{name}</span>);
const thumbnails: PhiSequenceThumbnail[] = ["a", "b", "c"].map((name) => ({
  key: name,
  label: `Picture ${name}`,
  content: <i>{name}</i>,
}));

function render(visibleCount: number, withThumbnails: PhiSequenceThumbnail[] | undefined, count = 3) {
  return renderToStaticMarkup(
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
    <PhiSequenceRun
      items={items.slice(0, count)}
      settings={{ visibleCount, controls: "both" }}
      labels={PHI_GALLERY_WIDGET_DEFAULT_LABELS}
      thumbnails={withThumbnails?.slice(0, count)}
    />
    </PhiConfigProvider>,
  );
}

describe("PhiSequenceRun thumbnails", () => {
  it("draws the row, with the first marked, and no dots, over one visible picture", () => {
    const html = render(1, thumbnails);
    expect(html.match(/aria-label="Picture [abc]"/g)).toHaveLength(3);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-label="Picture a"[^>]*aria-current="true"/);
    expect(html).not.toContain("Show pictures");
  });

  it("draws the dots as before when no thumbnails are asked for", () => {
    expect(render(1, undefined)).toContain("Show pictures 1 to 1");
  });

  it("does nothing with several pictures visible", () => {
    const html = render(2, thumbnails);
    expect(html).not.toContain("Picture a");
    expect(html).toContain("Show pictures");
  });

  it("draws no row over a single picture", () => {
    expect(render(1, thumbnails, 1)).not.toContain("Picture a");
  });
});
