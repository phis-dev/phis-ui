import type { ReactNode } from "react";
import { renderToStaticMarkup as renderBare } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vitest";

import { PhiMediaDeliveryPolicy, PhiMediaKind, PhiMediaLifecycleStatus } from "../../constants/media";
import type { PhiMediaAssetTile } from "../../types/media";
import { PhiConfigProvider } from "../root/phi-config-provider";
import { resolvePhiRootThemeState } from "../root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PhiMediaAssetTileControl, type PhiMediaAssetTileControlAsset, type PhiMediaAssetTileControlProps } from "./phi-media-asset-tile-control";

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

/** A tile asks for the fields it reads: a Module's own Asset shape with those fits, a full tile still does. */
describe("PhiMediaAssetTileControl's asset", () => {
  const listing = {
    id: 7,
    kind: PhiMediaKind.Pdf,
    originalName: "terms.pdf",
    title: "Terms",
    altText: null,
    contentType: "application/pdf",
    deliveryUrl: "/media/7/terms.pdf",
    thumbnailUrl: null,
    previewUrl: null,
    deliveryPolicy: PhiMediaDeliveryPolicy.Public,
    lifecycleStatus: PhiMediaLifecycleStatus.Ready,
    width: null,
    height: null,
    sku: "A-1",
  };

  it("draws an Asset that carries only what the tile reads", () => {
    const html = renderToStaticMarkup(<PhiMediaAssetTileControl asset={listing} minColumnWidth={120} showIdLabel />);
    expect(html).toContain("Terms");
    expect(html).toContain("#7");
  });

  it("hands the Asset back in the type it was passed in", () => {
    expectTypeOf<PhiMediaAssetTile>().toMatchTypeOf<PhiMediaAssetTileControlAsset>();
    expectTypeOf<PhiMediaAssetTileControlProps<typeof listing>["onSelect"]>()
      .toEqualTypeOf<((asset: typeof listing) => void) | undefined>();
  });
});
