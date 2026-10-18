"use client";

import { usePathname } from "next/navigation";
import { readPhiVisitorPathname } from "../../helpers/static-render-path";

/**
 * The page's path as the visitor opened it, the same on the server and in the browser. Client code reads
 * the path through this and never through `usePathname`, which answers the static tree's rewritten
 * address during a static render (`helpers/static-render-path.ts`, scripts/validate-visitor-pathname.mjs).
 */
export function usePhiPathname(): string {
  return readPhiVisitorPathname(usePathname() ?? "/");
}
