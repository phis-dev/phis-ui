import type { PhiCmsConfigField, PhiCmsWidgetConfigText } from "../types/cms-plugins";
import { readPhiDotPath, splitPhiDotPath } from "./dot-path";
import { isPhiRecord } from "./is-record";

/**
 * Which of a Widget's config fields are words a reader reads, and so are translated.
 *
 * The name answers it: a field called `label`, `title` or `placeholder` -- or one that ends in `Label`,
 * `Title`, `Placeholder` or `Description` -- holds text, and nothing else does. `key`, `value`, `format`
 * or `timeZone` are what the Widget works with, and translating them would break it. A Widget does not
 * declare its texts one by one, so a new Widget whose label is called `label` is translated without
 * anybody remembering to say so; the few fields the name gets wrong say otherwise on the field (`text`).
 *
 * The register is the translator's context: a label is a noun phrase on a control (`Web UI label`), a
 * description a sentence (`Web UI message`), so a translator neither clips the one nor pads the other.
 */
export type PhiConfigTextRegister = "label" | "message";

const TEXT_FIELD_NAMES: Readonly<Record<string, PhiConfigTextRegister>> = {
  label: "label",
  title: "label",
  subtitle: "label",
  placeholder: "label",
  tooltip: "label",
  eyebrow: "label",
  footer: "label",
  alt: "label",
  description: "message",
};

const TEXT_FIELD_SUFFIXES: ReadonlyArray<readonly [string, PhiConfigTextRegister]> = [
  ["Label", "label"],
  ["Title", "label"],
  ["Placeholder", "label"],
  ["Description", "message"],
];

/** The register a field's name gives it, or null where the name says it is not text. */
export function readPhiConfigTextRegisterByName(key: string): PhiConfigTextRegister | null {
  const exact = TEXT_FIELD_NAMES[key];
  if (exact) return exact;
  for (const [suffix, register] of TEXT_FIELD_SUFFIXES) {
    if (key.length > suffix.length && key.endsWith(suffix)) return register;
  }
  return null;
}

/**
 * The register of one config field, or null where it is not translated: a `string` field by its name
 * unless the field states `text`, every other type never -- a link, an icon or a choice stores what it
 * means, not what it says.
 */
export function readPhiConfigFieldTextRegister(field: PhiCmsConfigField): PhiConfigTextRegister | null {
  if (field.type !== "string") return null;
  if (field.text !== undefined) return field.text === false ? null : field.text;
  // A dot path is named by its last segment: `presentation.emptyState.title` is a title.
  return readPhiConfigTextRegisterByName(splitPhiDotPath(field.key).at(-1) ?? field.key);
}

/** One text a config holds: where it stands, and how a translator is told to read it. */
export type PhiConfigTextLocation = {
  /** Keys and list positions from the config's root, ending at the text. */
  path: readonly (string | number)[];
  register: PhiConfigTextRegister;
  text: string;
  /** What stands in the text as `%1` onwards, filled after the translation. */
  values?: readonly string[];
};

/**
 * Every non-empty text a config holds, in field order: the fields themselves and, inside a
 * `collection`, each entry's -- a select's options are its `options[].label`.
 *
 * A field's key is a dot path, read as the Inspector writes it (`helpers/dot-path.ts`): a Table's
 * `presentation.columns` is the list at `presentation.columns`, and an entry's `secondary.emptyText` the
 * text inside the entry's `secondary`. Read as a flat key it named nothing, and a Table's Builder-set
 * column titles, hints, empty texts and the rest of its nested words were never translated
 * (owner, 2026-11-26).
 */
export function collectPhiConfigTexts(
  fields: readonly PhiCmsConfigField[],
  config: Readonly<Record<string, unknown>>,
  prefix: readonly (string | number)[] = [],
): PhiConfigTextLocation[] {
  const found: PhiConfigTextLocation[] = [];
  for (const field of fields) {
    const value = readPhiDotPath(config, field.key);
    const path = [...prefix, ...splitPhiDotPath(field.key)];
    if (field.type === "collection") {
      if (!Array.isArray(value)) continue;
      value.forEach((item, index) => {
        if (isPhiRecord(item)) {
          found.push(...collectPhiConfigTexts(field.itemFields, item, [...path, index]));
        }
      });
      continue;
    }
    const register = readPhiConfigFieldTextRegister(field);
    if (register && typeof value === "string" && value.trim()) {
      found.push({ path, register, text: value });
    }
  }
  return found;
}

/**
 * The texts a Widget declares beyond its fields (`configTexts`): a key's text, or each list entry's, with
 * the entry's values beside it.
 */
export function collectPhiDeclaredConfigTexts(
  declarations: readonly PhiCmsWidgetConfigText[],
  config: Readonly<Record<string, unknown>>,
): PhiConfigTextLocation[] {
  const found: PhiConfigTextLocation[] = [];
  for (const declaration of declarations) {
    const value = readPhiDotPath(config, declaration.key);
    const path = splitPhiDotPath(declaration.key);
    if (declaration.item === undefined) {
      if (typeof value === "string" && value.trim()) {
        found.push({ path, register: declaration.register, text: value });
      }
      continue;
    }
    if (!Array.isArray(value)) continue;
    value.forEach((entry, index) => {
      if (!isPhiRecord(entry)) return;
      const text = entry[declaration.item!];
      if (typeof text !== "string" || !text.trim()) return;
      const values = declaration.values ? entry[declaration.values] : undefined;
      found.push({
        path: [...path, index, declaration.item!],
        register: declaration.register,
        text,
        ...(Array.isArray(values) ? { values: values.map((entry) => String(entry)) } : {}),
      });
    });
  }
  return found;
}

/**
 * The config with each located text replaced by its answer, copied only along the paths written; an
 * empty answer keeps the text as written.
 */
export function writePhiConfigTexts(
  config: Readonly<Record<string, unknown>>,
  answers: ReadonlyArray<{ path: readonly (string | number)[]; text: string }>,
): Record<string, unknown> {
  const root: Record<string, unknown> = { ...config };
  for (const { path, text } of answers) {
    if (!text.trim()) continue;
    let target: Record<string | number, unknown> = root;
    for (let index = 0; index < path.length - 1; index += 1) {
      const step = path[index]!;
      const current: unknown = target[step];
      const copy: Record<string | number, unknown> = Array.isArray(current)
        ? [...current] as unknown as Record<number, unknown>
        : { ...(current as Record<string, unknown>) };
      target[step] = copy;
      target = copy;
    }
    target[path[path.length - 1]!] = text;
  }
  return root;
}
