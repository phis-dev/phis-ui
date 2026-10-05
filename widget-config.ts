/**
 * The config primitives a Widget's `parseConfig` is built from.
 *
 * A Widget declares `parseConfig`, and every config carries the renderable base fields the runtime
 * expects. Without these a Module package would have to reproduce that base parser, which forks contract
 * logic into every package that ships a Widget.
 */
export {
  readBoolean,
  readCssSize,
  readInteger,
  readNavItems,
  readNumber,
  readRenderableBlockConfig,
  readString,
} from "./components/widgets/config/parser-primitives";
export type { PhiCmsWidgetConfigBase } from "./components/widgets/config/parser-primitives";
/* A block's size and lengths are read where every other reader of a block reads them (D1). */
export {
  normalizePhiRenderableBlockResponsiveSize,
  normalizePhiRenderableBlockSize,
  readPhiResponsiveLength,
} from "./helpers/renderable-block-normalizers";
