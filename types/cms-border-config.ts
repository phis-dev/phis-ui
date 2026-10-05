import { isPhiRecord } from "../helpers/is-record";
import {
  readCssSize,
  readNumber,
  readString,
} from "../components/widgets/config/parser-primitives";
import type { PhiCmsBorderWidgetConfig } from "./cms-config";

/*
 * The border reader, apart from the CMS config it belongs to. The Overlay container reads an Overlay's
 * border on every page, and the rest of `cms-config.ts` -- layout, grid and padding normalizers -- is not
 * something every page should download for it.
 */
export function readPhiCmsBorderWidgetConfig(value: unknown): PhiCmsBorderWidgetConfig | undefined {
  if (!isPhiRecord(value)) {
    const border = readString(value);
    if (border == null) {
      return undefined;
    }

    if (border === "none") {
      return {
        borderStyle: "none",
      };
    }

    const match = border.match(/^([0-9.]+)px\s+([a-z-]+)\s+(.+)$/i);
    if (!match) {
      return undefined;
    }

    const borderWidth = Number.parseFloat(match[1]);
    const borderStyle = match[2] as PhiCmsBorderWidgetConfig["borderStyle"];
    const borderColor = match[3]?.trim();

    return {
      ...(Number.isFinite(borderWidth) ? { borderWidth } : {}),
      ...(borderStyle == null ? {} : { borderStyle }),
      ...(borderColor ? { borderColor } : {}),
    };
  }

  const raw = value as Record<string, unknown>;
  const next: PhiCmsBorderWidgetConfig = {
    borderWidth: readNumber(raw.borderWidth),
    borderStyle:
      typeof raw.borderStyle === "string" && raw.borderStyle.trim().length > 0
        ? (raw.borderStyle as PhiCmsBorderWidgetConfig["borderStyle"])
        : undefined,
    borderColor: readString(raw.borderColor),
    borderTopLeftRadius: readCssSize(raw.borderTopLeftRadius),
    borderTopRightRadius: readCssSize(raw.borderTopRightRadius),
    borderBottomLeftRadius: readCssSize(raw.borderBottomLeftRadius),
    borderBottomRightRadius: readCssSize(raw.borderBottomRightRadius),
  };

  return Object.values(next).some((entry) => entry != null) ? next : undefined;
}
