/*
 * A value per measured width is part of stored descriptors -- a Form's gaps and ranges -- so its shape
 * and its cascade are read from `@phis/contracts/layout`, where phis-server reads them too.
 */
export {
  resolvePhiResponsiveValue,
  type PhiResolvedResponsiveValue,
  type PhiResponsiveValue,
} from "@phis/contracts/layout";
