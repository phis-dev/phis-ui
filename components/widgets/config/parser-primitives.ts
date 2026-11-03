import { isPhiRecord } from "../../../helpers/is-record";
import type { PhiNavItem } from "../../shell/shell-types";
import type {
  PhiRenderableBlockBase,
} from "../../../types/renderable-block";
import { mergePhiCmsRenderableBlockConfigDefaults } from "../../../helpers/cms-config-serialization";
import { readPhiViewerAccessPolicy } from "../../../types/access";
import { createPhiConfigReader } from "./strict-config-reader";

export type PhiCmsWidgetConfigBase = Record<string, unknown> & PhiRenderableBlockBase;

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function readInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

export function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export function readNumberList(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const numbers = value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry));
  return numbers.length > 0 ? numbers : undefined;
}

export function readCssSize(value: unknown) {
  return readNumber(value) ?? readString(value);
}

/*
 * The fields every block carries, checked strictly before they are normalized
 * (`strict-config-reader.ts`): a render mode, visibility or size of the wrong kind is an error naming the
 * field, not the default put in its place. The check is one level deep -- a surface, a size or the
 * effects must be what they claim to be; what is inside them is still normalized as before.
 *
 * The normalization itself stays lenient, because the Builder runs it on drafts while an author edits.
 * This reader is what a stored config is read with: every Widget's `parseConfig` and the Layouts'.
 */
function assertPhiRenderableBlockBaseConfig(config: Record<string, unknown>) {
  const reader = createPhiConfigReader(config);
  const sizeLike = (value: unknown) =>
    isPhiRecord(value) || typeof value === "string" || (typeof value === "number" && Number.isFinite(value))
      ? value
      : undefined;
  reader.oneOf("renderMode", ["live", "preview", "editor"] as const);
  reader.oneOf("visibility", ["visible", "hidden", "collapsed"] as const);
  reader.value("accessPolicy", "an access policy", (value) => readPhiViewerAccessPolicy(value) ?? undefined);
  reader.value("viewportFlags", "a whole number from 0 to 6", (value) =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6 ? value : undefined);
  reader.boolean("enabled");
  reader.boolean("debugMode");
  reader.value("anchor", "an anchor", (value) => (isPhiRecord(value) || typeof value === "string" ? value : undefined));
  reader.integer("zIndex");
  reader.number("opacity");
  reader.value("surface", "a surface", (value) => (isPhiRecord(value) ? value : undefined));
  reader.string("className");
  reader.value("size", "a size", sizeLike);
  reader.value("minSize", "a size", sizeLike);
  reader.value("maxSize", "a size", sizeLike);
  reader.value("collapsedSizeHint", "a size", sizeLike);
  reader.value("effects", "effects", (value) => (isPhiRecord(value) ? value : undefined));
}

export function readRenderableBlockConfig(config: Record<string, unknown>): PhiRenderableBlockBase {
  assertPhiRenderableBlockBaseConfig(config);
  return mergePhiCmsRenderableBlockConfigDefaults(config);
}

export function readNavItems(value: unknown): PhiNavItem[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((rawItem, index): PhiNavItem | null => {
      if (!isPhiRecord(rawItem)) {
        return null;
      }

      const item = rawItem as Record<string, unknown>;
      const href = readString(item.href);
      return {
        key: readString(item.key) ?? `item-${index}`,
        label: readString(item.label) ?? "",
        ...(href ? { href } : {}),
        icon: readString(item.icon),
        external: readBoolean(item.external),
        newTab: readBoolean(item.newTab),
        disabled: readBoolean(item.disabled),
        separator: readBoolean(item.separator) === true,
        action: readString(item.action) === "logout" ? "logout" : undefined,
        children: readNavItems(item.children),
      };
    })
    .filter((item): item is PhiNavItem => item !== null);

  return items.length > 0 ? items : undefined;
}
