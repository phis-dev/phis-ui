import { fileURLToPath } from "node:url";

import ts from "typescript";

import type { PhiCmsConfigField } from "../types/cms-plugins";

/**
 * Each Core Widget's placement type says what its Inspector writes, and nothing it does not.
 *
 * `types/core-widget-placements.ts` is what a Module outside Core compiles its placements against, and
 * it is written by hand, next to Widgets whose fields keep changing. A field the Inspector gains and the
 * type does not is a setting no Module can place; a key the type keeps after the Widget stopped reading
 * it is a setting every Module can place and none will see. Neither shows up anywhere else: the parser
 * drops what it does not know, and the Inspector never looks at the type.
 *
 * So both directions are checked. Every key an Inspector field writes -- the keys a composite field
 * writes instead of its own, and the keys it patches on change -- has to resolve in the placement type,
 * path by path. Every key of the placement type that is not the shared envelope has to be written by a
 * field, or be named below with the reason nobody edits it in the Inspector.
 */

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const placementsPath = fileURLToPath(new URL("../types/core-widget-placements.ts", import.meta.url));

/*
 * Keys a placement states that no Inspector field writes, per Widget, each with its reason. A key
 * listed here that a field starts writing, or that the type drops, is reported as well -- the list
 * shrinks with the code rather than collecting names.
 */
const CANVAS = "edited on the canvas, not in the Inspector";
const PLACEMENT_ONLY_KEYS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  markdown: { markdown: CANVAS },
  "simple-text": {},
  description: {},
  button: {
    key: "the Control's signal identity: `defaultConfig` gives one, a Preset names its own for routes",
  },
  image: {
    assetId: "set by the media picker on the canvas",
    variantVersion: "copied from the picked asset, so a new rendition is noticed",
    mask: CANVAS,
    sizes: "a Preset's responsive hint to the browser; nothing an author sets per image",
    trusted: "a Preset vouching for a foreign URL; in the Inspector it would switch the check off",
  },
  icon: { icon: CANVAS, color: CANVAS },
  spacer: {},
  html: { html: CANVAS, fontFamily: CANVAS, fontSize: CANVAS },
  table: {
    initialQuery: "the query a Preset opens the Table with",
    fixedFilters: "the filters a Preset fixes, which no reader changes",
  },
  form: {
    feedback: "whether a Settings panel reports a save; the shell decides it",
    links: "the ways out of a sign-in, placed by the Module that owns them",
    formConfig: "prepared for the Form Builder, which will edit it",
  },
  "collection-view": { initialQuery: "the query a Preset opens the Collection with" },
  "command-toolbar": { key: "the Control's signal identity, as for the Button" },
  "theme-mode-switch": {},
  "draft-status": {},
};

function writtenPaths(field: PhiCmsConfigField): string[] {
  const patched = [
    ...("patchOnChange" in field && field.patchOnChange ? Object.keys(field.patchOnChange) : []),
    ...("optionPresets" in field && field.optionPresets
      ? [...field.optionPresets.locks, ...(field.optionPresets.prefills ?? [])]
      : []),
  ];
  if (field.type === "radius") {
    return [field.topLeftKey, field.topRightKey, field.bottomLeftKey, field.bottomRightKey, ...patched];
  }
  if (field.type === "padding") {
    const keys = [
      field.paddingKey,
      field.gapKey,
      field.paddingTopKey,
      field.paddingRightKey,
      field.paddingBottomKey,
      field.paddingLeftKey,
    ].filter((key): key is string => key !== undefined);
    return [...(keys.length > 0 ? keys : [field.key]), ...patched];
  }
  if (field.type === "dimension" && (field.widthKey || field.heightKey)) {
    const keys = [field.widthKey, field.heightKey].filter((key): key is string => key !== undefined);
    return [...keys, ...patched];
  }
  return [field.key, ...patched];
}

const program = ts.createProgram([placementsPath], {
  strict: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  skipLibCheck: true,
  noEmit: true,
});
const checker = program.getTypeChecker();
const sourceFile = program.getSourceFile(placementsPath);
if (!sourceFile) {
  throw new Error(`Cannot read ${placementsPath}.`);
}

function exportedType(name: string): ts.Type {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile!);
  const symbol =
    moduleSymbol && checker.getExportsOfModule(moduleSymbol).find((entry) => entry.name === name);
  if (!symbol) {
    throw new Error(`types/core-widget-placements.ts exports no ${name}.`);
  }
  return checker.getDeclaredTypeOfSymbol(symbol);
}

/** Every property any member of a union has: a placement may be one shape or another. */
function propertiesOf(type: ts.Type): Map<string, ts.Symbol> {
  const properties = new Map<string, ts.Symbol>();
  const members = type.isUnion() ? type.types : [type];
  for (const member of members) {
    for (const property of checker.getPropertiesOfType(checker.getApparentType(member))) {
      if (!properties.has(property.name)) {
        properties.set(property.name, property);
      }
    }
  }
  return properties;
}

function typeOfProperty(property: ts.Symbol): ts.Type {
  return checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(property, sourceFile!));
}

function resolvesPath(type: ts.Type, path: readonly string[]): boolean {
  const [head, ...rest] = path;
  if (head === undefined) {
    return true;
  }
  const property = propertiesOf(checker.getNonNullableType(type)).get(head);
  return property !== undefined && resolvesPath(typeOfProperty(property), rest);
}

const envelopeKeys = new Set(propertiesOf(exportedType("PhiWidgetPlacementBase")).keys());
const placements = propertiesOf(exportedType("PhiCoreWidgetPlacements"));
const problems: string[] = [];

for (const typeKey of Object.keys(PLACEMENT_ONLY_KEYS)) {
  if (!placements.has(typeKey)) {
    problems.push(`${typeKey}: listed here but missing from PhiCoreWidgetPlacements.`);
  }
}

for (const [typeKey, property] of placements) {
  const placementOnly = PLACEMENT_ONLY_KEYS[typeKey];
  if (!placementOnly) {
    problems.push(`${typeKey}: in PhiCoreWidgetPlacements but not in this validator's list.`);
    continue;
  }
  const configModule: Record<string, unknown> =
    await import(`../plugins/runtime-modules/core/widgets/${typeKey}/config`);
  const definition = Object.values(configModule).find(
    (value): value is { typeKey: string; fields: PhiCmsConfigField[] } =>
      typeof value === "object" &&
      value !== null &&
      (value as { typeKey?: unknown }).typeKey === typeKey &&
      Array.isArray((value as { fields?: unknown }).fields),
  );
  if (!definition) {
    problems.push(`${typeKey}: its config module exports no definition with fields.`);
    continue;
  }

  const placement = typeOfProperty(property);
  const written = new Set<string>();
  for (const field of definition.fields) {
    for (const path of writtenPaths(field)) {
      written.add(path.split(".")[0]!);
      if (!resolvesPath(placement, path.split("."))) {
        problems.push(
          `${typeKey}: field "${field.key}" writes "${path}", which the placement type lacks.`,
        );
      }
    }
  }

  for (const key of propertiesOf(placement).keys()) {
    if (envelopeKeys.has(key) || written.has(key)) {
      continue;
    }
    if (!(key in placementOnly)) {
      problems.push(`${typeKey}: the placement type has "${key}", which no Inspector field writes.`);
    }
  }
  for (const key of Object.keys(placementOnly)) {
    if (written.has(key)) {
      problems.push(`${typeKey}: "${key}" is listed as placement-only, but a field writes it now.`);
    } else if (!propertiesOf(placement).has(key)) {
      problems.push(`${typeKey}: "${key}" is listed as placement-only, but the type lacks it.`);
    }
  }
}

if (problems.length > 0) {
  console.error(`Core Widget placements disagree with their Inspector fields in ${packageRoot}:`);
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}

console.log("Core Widget placement contracts validated.");
