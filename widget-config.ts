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
/*
 * Strict reading (THIRD_PARTY_MODULES.md, "Reading a config"). A `parseConfig` built on it throws for a
 * value that is present and wrong, naming the field; the Site then refuses to store it and a live page
 * leaves the Widget out. The lenient readers above stay for what has not moved yet.
 */
export {
  PhiConfigError,
  createPhiConfigReader,
  isPhiConfigError,
} from "./components/widgets/config/strict-config-reader";
export type { PhiConfigReader } from "./components/widgets/config/strict-config-reader";
/* A block's size and lengths are read where every other reader of a block reads them (D1). */
export {
  normalizePhiRenderableBlockResponsiveSize,
  normalizePhiRenderableBlockSize,
  readPhiResponsiveLength,
} from "./helpers/renderable-block-normalizers";
