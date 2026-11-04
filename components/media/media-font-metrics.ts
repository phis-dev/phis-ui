import { isPhiFontSubsetKey, type PhiFontCoverage, type PhiFontMetrics } from "@phis/contracts/media";

import {
  requirePhiField,
  type PhiConfigReader,
} from "../widgets/config/strict-config-reader";

/*
 * A font's metrics, read as the contract states them (`@phis/contracts/media`).
 *
 * The server measures them once, at upload, and writes every field. Two readers took them on trust: the
 * public reference projection checked nothing below `font`, and the font list of the Theme took a stored
 * `meta.font` for metrics as soon as it had a unit grid -- a record missing its ascent would have set a
 * fallback face with `NaN` overrides. Both read through this now, so a wrong record is an error naming
 * the field. `coverage` is the one field allowed to be absent: a font uploaded before cuts existed has
 * none and is delivered whole.
 */

const nullableNumber = (reader: PhiConfigReader, key: string) => reader.number(key) ?? null;
const requiredNumber = (reader: PhiConfigReader, key: string) =>
  requirePhiField(reader, key, "a number", reader.number);

function readPhiFontCoverage(reader: PhiConfigReader): PhiFontCoverage {
  const subsets = requirePhiField(reader, "subsets", "a list of subset keys", (key) =>
    reader.value(key, "a list of subset keys", (value) =>
      Array.isArray(value) && value.every(isPhiFontSubsetKey) ? value : undefined));
  const restRanges = reader.value("restRanges", "a list of [start, end] code point ranges", (value) =>
    Array.isArray(value) && value.every((entry) =>
      Array.isArray(entry) && entry.length === 2 &&
      Number.isInteger(entry[0]) && Number.isInteger(entry[1]) &&
      entry[0] >= 0 && entry[0] <= entry[1] && entry[1] <= 0x10ffff)
      ? value as [number, number][]
      : undefined) ?? [];
  return { subsets, restRanges };
}

export function readPhiFontMetricsFields(reader: PhiConfigReader): PhiFontMetrics {
  const unitsPerEm = requiredNumber(reader, "unitsPerEm");
  if (unitsPerEm <= 0) reader.fail("unitsPerEm", "a positive number");
  const coverage = reader.object("coverage", readPhiFontCoverage);
  return {
    format: requirePhiField(reader, "format", "a font container", (key) =>
      reader.oneOf(key, ["sfnt", "woff", "woff2"] as const)),
    familyName: reader.string("familyName")?.trim() || null,
    unitsPerEm,
    ascent: requiredNumber(reader, "ascent"),
    descent: requiredNumber(reader, "descent"),
    lineGap: requiredNumber(reader, "lineGap"),
    capHeight: nullableNumber(reader, "capHeight"),
    xHeight: nullableNumber(reader, "xHeight"),
    xWidthAvg: nullableNumber(reader, "xWidthAvg"),
    xWidthAvgSource: reader.oneOf("xWidthAvgSource", ["glyphs", "os2"] as const) ?? null,
    category: reader.oneOf("category", ["serif", "sans-serif", "monospace"] as const) ?? null,
    ...(coverage ? { coverage } : {}),
  };
}
