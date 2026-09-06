import "server-only";

import { resolveSiteInternalReferences } from "../gateway/internal-references";
import {
  collectPhiBackgroundAssetIdsFromValues,
  projectPhiBackgroundAssetsIntoValue,
} from "../components/media/background-asset-projection";
import type { PhiSiteTheme } from "../gateway/site-config";

/**
 * Attaches delivery projections to the Theme Root Background before it reaches the client.
 *
 * The Root Background lives in the Theme record rather than in a CMS tree, so the tree-based
 * projection of the page render never sees it. Same rule, different carrier: an Asset-bound image
 * needs its delivery revision and focal facts to draw the right crop, and an id that does not
 * resolve keeps no projection and falls back to the original content URL.
 */
export async function projectPhiSiteThemeRootBackground(
  theme: PhiSiteTheme,
  {
    apiBaseUrl,
    internalToken,
    siteKey,
  }: {
    apiBaseUrl: string;
    internalToken: string;
    siteKey: string;
  },
): Promise<PhiSiteTheme> {
  const background = theme.root?.background;
  if (!background) {
    return theme;
  }

  const assetIds = collectPhiBackgroundAssetIdsFromValues([background.light, background.dark]);
  if (assetIds.length === 0) {
    return theme;
  }

  const projection = await resolveSiteInternalReferences({
    apiBaseUrl,
    internalToken,
    siteKey,
    assetIds,
  });
  const assets = new Map(
    [...projection.assets].map(([id, asset]) => [id, {
      deliveryUrl: asset.deliveryUrl,
      deliveryRevision: asset.deliveryRevision,
      variantVersion: asset.variantVersion,
      focalRect: asset.focalRect,
      width: asset.width,
      height: asset.height,
    }] as const),
  );

  return {
    ...theme,
    root: {
      ...theme.root,
      background: projectPhiBackgroundAssetsIntoValue(background, assets),
    },
  };
}
