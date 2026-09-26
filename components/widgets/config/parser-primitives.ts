import type { PhiNavItem } from "../../shell/shell-types";
import type {
  PhiRenderableBlockBase,
  PhiRenderableBlockResponsiveSize,
  PhiResponsiveLength,
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

/**
 * One stored length, plain or per profile.
 *
 * A profile value is `{ compact?, medium?, wide? }` and at least one of the three has to be a length,
 * or it is not a profile value and states nothing. Read here rather than accepted as it stands, so a
 * stored object cannot carry anything else into the config.
 */
export function readResponsiveCssSize(value: unknown): PhiResponsiveLength | undefined {
  const scalar = readCssSize(value);
  if (scalar !== undefined) {
    return scalar;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const compact = readCssSize(raw.compact);
  const medium = readCssSize(raw.medium);
  const wide = readCssSize(raw.wide);
  if (compact === undefined && medium === undefined && wide === undefined) {
    return undefined;
  }

  return {
    ...(compact === undefined ? {} : { compact }),
    ...(medium === undefined ? {} : { medium }),
    ...(wide === undefined ? {} : { wide }),
  };
}

export function readRenderableBlockSize(value: unknown): PhiRenderableBlockResponsiveSize | undefined {
  const scalar = readResponsiveCssSize(value);
  if (scalar !== undefined) {
    return { width: scalar };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const width = readResponsiveCssSize(raw.width);
  const height = readResponsiveCssSize(raw.height);
  return width === undefined && height === undefined ? undefined : { width, height };
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
      if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
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
