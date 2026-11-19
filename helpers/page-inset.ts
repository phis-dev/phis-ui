import { resolvePhiCmsAreaMask } from "../constants/cms-areas";
import { PHI_PAGE } from "../theme/antd-css-var-contract";

const PHI_PUBLIC_AREA_MASK = resolvePhiCmsAreaMask("public");

/**
 * Which of the Theme's Page insets a Page stands in by (THEME.md "Page padding"): Public's
 * (`PHI_PAGE.padding`) for a Page of Public alone, the signed-in Areas' (`PHI_PAGE.signedInPadding`) for
 * every other. Read where the base Pages are built and where a preset Page is checked, so both agree.
 */
export function resolvePhiPageInset(areaMask: number | null | undefined) {
  const mask = areaMask ?? 0;
  const publicPage = mask !== 0 && (mask & ~PHI_PUBLIC_AREA_MASK) === 0;
  return publicPage ? PHI_PAGE.padding : PHI_PAGE.signedInPadding;
}

/** The inset as the four sides of a Region's config. */
export function resolvePhiPageInsetConfig(areaMask: number | null | undefined) {
  const inset = resolvePhiPageInset(areaMask);
  return {
    paddingTop: inset.top,
    paddingRight: inset.right,
    paddingBottom: inset.bottom,
    paddingLeft: inset.left,
  };
}
