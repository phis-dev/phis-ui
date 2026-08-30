import { DEFAULT_PHI_CMS_VISIBILITY_MASK } from "../constants/phi-cms";

export function resolvePhiCmsVisibilityMask(mask: number | null | undefined) {
  return Number.isInteger(mask) && (mask ?? 0) !== 0 ? (mask as number) : DEFAULT_PHI_CMS_VISIBILITY_MASK;
}

export function matchesPhiCmsVisibility(mask: number | null | undefined, contextMask: number | null | undefined) {
  const resolvedMask = resolvePhiCmsVisibilityMask(mask);
  const resolvedContextMask = Number.isInteger(contextMask) ? (contextMask as number) : 0;
  return (resolvedMask & resolvedContextMask) !== 0;
}

