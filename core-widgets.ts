/*
 * What a Module writes when it places a Core Widget: the shared envelope, each listed Widget's
 * placement, and the vocabulary they use. The node factories in `@phis/ui/helpers` read the same
 * contract, so a placement written with them is checked against it by type key.
 */
export * from "./types/core-widget-placements";
export type {
  PhiCmsWidgetPlacementConfig,
  PhiCmsWidgetPlacementFields,
} from "./helpers/cms-node-factories";
export * from "./types/draft-status";
