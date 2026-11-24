import { isPhiRecord } from "../helpers/is-record";

/*
 * What a link preview shows of a Page: the picture a messenger or a social network draws beside the
 * title and the description (NEXT_INTEGRATION.md, "Link previews").
 */

/**
 * The picture of a link preview: a Media Asset of the Site's own Space, by id, and what it shows.
 *
 * One shape wherever a preview picture is stated -- a Page's config (`page.layoutConfig.shareImage`) and
 * the Theme's Brand (`brand.shareImage`). The id sits under `assetId`, which is how persisted config names
 * an Asset, so phi-server indexes it and refuses to delete the picture while it is stated. `alt` falls
 * back to the Asset's own alt text. Only a publicly delivered image is ever shown: any other answers as no
 * picture.
 */
export type PhiShareImage = {
  assetId: number;
  alt?: string | null;
};

/** `value` as a share image, or `null` where it is none: a live page leaves out what it cannot read. */
export function readPhiShareImage(value: unknown): PhiShareImage | null {
  if (!isPhiRecord(value)) return null;
  const { assetId, alt } = value;
  if (typeof assetId !== "number" || !Number.isSafeInteger(assetId) || assetId <= 0) return null;
  const text = typeof alt === "string" ? alt.trim() : "";
  return text ? { assetId, alt: text } : { assetId };
}

/** The key of a Page's config the share image is stated under. */
export const PHI_PAGE_SHARE_IMAGE_CONFIG_KEY = "shareImage";

const PHI_X_ACCOUNT_PATTERN = /^@[A-Za-z0-9_]{1,15}$/u;

/** `value` where it is an X account name, `@` included (`@phisys`); anything else is no account. */
export function readPhiXAccount(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return PHI_X_ACCOUNT_PATTERN.test(trimmed) ? trimmed : null;
}
