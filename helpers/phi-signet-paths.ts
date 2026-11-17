/**
 * Where a Site's Signet is delivered, and how the browser's own guesses reach it.
 *
 * One address under `/api/site`, the door every Site already mounts, so no Site file names it. The
 * proxy rewrites `/favicon.ico` and the two Apple touch icon paths to it (`next/site-proxy.ts`), which
 * is how a browser that never read the document head -- Safari asks for these on its own -- still gets
 * the mark. `as` says which of those it was.
 */
export const PHI_SIGNET_PATH = "/api/site/signet";
export const PHI_SIGNET_VERSION_PARAM = "v";
export const PHI_SIGNET_ALIAS_PARAM = "as";
export type PhiSignetAlias = "favicon" | "apple";

/** The paths a browser asks for unprompted, and which answer each one stands for. */
export const PHI_SIGNET_ALIAS_PATHS: Readonly<Record<string, PhiSignetAlias>> = {
  "/favicon.ico": "favicon",
  "/apple-touch-icon.png": "apple",
  "/apple-touch-icon-precomposed.png": "apple",
};

/** The smallest square an Apple touch icon may be; a smaller one is scaled up and looks it. */
export const PHI_SIGNET_APPLE_MIN_SIZE = 180;
