/*
 * The list a plan card draws its features with: a tick for what is included, a dash for what is not.
 *
 * A Module that shows a plan's features from its own data -- a shop's product -- draws the same list
 * rather than a paragraph of dashes. An entry of its own because the list brings its markers, levels and
 * item surfaces with it, which every importer of `@phis/ui/controls` would otherwise carry too.
 */
export { PhiBulletListControl } from "./components/controls/phi-bullet-list-control";
export type { PhiBulletListControlProps } from "./components/controls/phi-bullet-list-control";
export type {
  PhiBulletListEntryState,
  PhiBulletListNode,
} from "./components/widgets/shared/bullet-list-vocabulary";
