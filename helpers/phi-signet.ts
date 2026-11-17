import { createHash } from "node:crypto";

const PHI_SIGNET_DATA_URL = /^data:(image\/(?:png|svg\+xml|x-icon|webp))((?:;(?:utf8|charset=[A-Za-z0-9-]+))*)(;base64)?,(.*)$/su;
const PHI_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/u;
const PHI_PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type PhiSignetImage = { contentType: string; bytes: Uint8Array };

/**
 * The picture a data URL carries, or null for anything the route does not deliver.
 *
 * Only PNG, SVG, ICO and WebP, and only as `;base64` -- or, for SVG alone, as text (`;utf8` or none),
 * percent-decoded, which is how a drawing is written inline. A raster as text is not a thing, and any
 * other media type is somebody's mistake or somebody's attempt; both answer null, which the route
 * turns into a 404.
 */
export function decodePhiSignetDataUrl(source: string): PhiSignetImage | null {
  const match = PHI_SIGNET_DATA_URL.exec(source.trim());
  if (!match) return null;
  const [, contentType, , base64, payload] = match;
  if (base64) {
    const compact = payload.replace(/\s+/gu, "");
    if (!compact || compact.length % 4 === 1 || !PHI_BASE64.test(compact)) return null;
    const bytes = Buffer.from(compact, "base64");
    return bytes.length > 0 ? { contentType, bytes: new Uint8Array(bytes) } : null;
  }
  if (contentType !== "image/svg+xml" || !payload) return null;
  try {
    return { contentType, bytes: new TextEncoder().encode(decodeURIComponent(payload)) };
  } catch {
    return null;
  }
}

/** The pixel size a PNG's header states, or null for bytes that are not a PNG with a header. */
export function readPhiPngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  if (PHI_PNG_SIGNATURE.some((value, index) => bytes[index] !== value)) return null;
  // The first chunk is always IHDR: length (4), the name (4), then width and height, big endian.
  if (String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]) !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * A short identifier of what a Signet shows, for the address the head names.
 *
 * Of the picture's own bytes where the Signet is inline, so the same picture is the same address
 * whichever Set or record carries it and a changed one is a new address -- which is what lets that
 * address be cached for a year. Of the Asset's id where it is a library picture: the bytes are not
 * known where the head is written, so a picture replaced in place under the same id keeps its address
 * (and is therefore delivered with a short cache, see the route).
 */
export function buildPhiSignetVersion(identity: Uint8Array | string): string {
  return createHash("sha256").update(identity).digest("hex").slice(0, 10);
}
