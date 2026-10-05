import { isPhiRecord } from "../../../helpers/is-record";
import type { PhiNavItem } from "../../shell/shell-types";
import type {
  PhiRenderableBlockBase,
} from "../../../types/renderable-block";
import { mergePhiCmsRenderableBlockConfigDefaults } from "../../../helpers/cms-config-serialization";

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

export function readRenderableBlockConfig(config: Record<string, unknown>): PhiRenderableBlockBase {
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
