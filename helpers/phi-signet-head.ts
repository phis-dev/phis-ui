import type { PhiThemeSignet } from "../theme/phi-theme-signet";
import { PHI_SIGNET_APPLE_MIN_SIZE, PHI_SIGNET_PATH, PHI_SIGNET_VERSION_PARAM } from "./phi-signet-paths";
import { buildPhiSignetAssetIdentity, buildPhiSignetVersion, decodePhiSignetDataUrl, readPhiPngSize } from "./phi-signet";

/** What the document head needs to say about the Signet; `appleHref` only where a raster of 180 px or more is known. */
export type PhiSignetHead = {
  href: string;
  type?: string;
  sizes?: string;
  apple?: { href: string; type: string; sizes: string };
};

function buildPhiSignetHref(version: string) {
  return `${PHI_SIGNET_PATH}?${PHI_SIGNET_VERSION_PARAM}=${version}`;
}

/**
 * The head entries for a Signet, or null where it cannot be delivered and the head says nothing.
 *
 * Only the Site's own Signet has an address of its own. A Set's -- the Site follows, nothing saved --
 * is named as the data URL it is: Chrome and Firefox show it, Safari does not, and the save that takes it
 * into the Media library is what gives that Site an icon there.
 *
 * A data URL that does not decode is not named: pointing the tab at an address that answers 404 would
 * be worse than leaving the browser its own `/favicon.ico` request. An Asset is named by its id and, where
 * the Core states it (0.4.1), its revision, type and size -- the bytes are not at hand here. Without those
 * fields (an older Core, a draft) it is named by the id alone and without a type or a size, and the
 * response carries its type; the Apple path answers for itself from the bytes.
 */
export function describePhiSignetHead(signet: PhiThemeSignet | null | undefined): PhiSignetHead | null {
  if (!signet) return null;
  if (signet.from === "set") return signet.kind === "data" ? { href: signet.source } : null;
  if (signet.kind === "asset") {
    const href = buildPhiSignetHref(buildPhiSignetVersion(buildPhiSignetAssetIdentity(signet)));
    const sizes = signet.width != null && signet.height != null ? `${signet.width}x${signet.height}` : undefined;
    const apple = signet.contentType === "image/png" && signet.width != null && signet.height != null &&
      signet.width >= PHI_SIGNET_APPLE_MIN_SIZE && signet.height >= PHI_SIGNET_APPLE_MIN_SIZE
      ? { href, type: signet.contentType, sizes: sizes as string }
      : undefined;
    return {
      href,
      ...(signet.contentType ? { type: signet.contentType } : {}),
      ...(sizes ? { sizes } : {}),
      ...(apple ? { apple } : {}),
    };
  }
  const image = decodePhiSignetDataUrl(signet.source);
  if (!image) return null;
  const href = buildPhiSignetHref(buildPhiSignetVersion(image.bytes));
  const dimensions = image.contentType === "image/png" ? readPhiPngSize(image.bytes) : null;
  const sizes = dimensions ? `${dimensions.width}x${dimensions.height}` : undefined;
  const apple = dimensions && dimensions.width >= PHI_SIGNET_APPLE_MIN_SIZE && dimensions.height >= PHI_SIGNET_APPLE_MIN_SIZE
    ? { href, type: image.contentType, sizes: sizes as string }
    : undefined;
  return {
    href,
    type: image.contentType,
    ...(sizes ? { sizes } : {}),
    ...(apple ? { apple } : {}),
  };
}
