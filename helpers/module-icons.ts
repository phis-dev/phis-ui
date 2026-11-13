import { isPhiModuleIconName, parsePhiModuleIconName } from "../constants/module-identity";
import type {
  PhiModuleIcon,
  PhiModuleIconDrawing,
  PhiModuleIconInput,
  PhiModuleIconSet,
  PhiModuleIconSvgDefinition,
} from "../types/module-icons";

/*
 * The icons a Module registers (`icons` on its definition), how they are checked, and how a name is
 * resolved against the ones an Area holds. Pure: the definition, the catalog check, the Server that
 * hands the active Modules' icons to an Area and the Client that draws them all read the same code.
 */

function isSvgDefinition(
  drawing: PhiModuleIconDrawing | PhiModuleIconSvgDefinition,
): drawing is PhiModuleIconSvgDefinition {
  return "icon" in drawing;
}

/*
 * An Ant Design definition is an `<svg>` whose children are `<path>`s -- every outlined and filled icon
 * the package has that a Module would want. Anything else in it (a `<defs>`, a group, a style) is a
 * drawing this reader does not know how to keep, and saying so beats drawing part of it.
 */
function readSvgDefinitionDrawing(definition: PhiModuleIconSvgDefinition): PhiModuleIconDrawing {
  const root = definition.icon;
  if (typeof root === "function") {
    throw new Error(
      `Ant Design icon "${definition.name}" (${definition.theme}) is two-tone, a function of two colours; `
        + "a Module icon is one drawing in currentColor.",
    );
  }
  const viewBox = root.attrs.viewBox;
  if (root.tag !== "svg" || !viewBox) {
    throw new Error(`Ant Design icon "${definition.name}" is not an <svg> with a viewBox.`);
  }
  const paths = (root.children ?? []).map((child) => {
    if (child.tag !== "path" || !child.attrs.d || child.children?.length) {
      throw new Error(
        `Ant Design icon "${definition.name}" holds a <${child.tag}>; only <path> children are read.`,
      );
    }
    return child.attrs.d;
  });
  const fillRule = root.attrs["fill-rule"];
  return {
    viewBox,
    paths,
    ...(fillRule === "evenodd" || fillRule === "nonzero" ? { fillRule } : {}),
  };
}

/** What is wrong with a Module's icons, as sentences; empty when nothing is. */
export function collectPhiModuleIconErrors(icons: readonly PhiModuleIcon[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const icon of icons) {
    if (!isPhiModuleIconName(icon.name)) {
      errors.push(`Module icon name "${icon.name}" is not one lower-case kebab segment.`);
    }
    if (seen.has(icon.name)) {
      errors.push(`Module icon "${icon.name}" is registered twice.`);
    }
    seen.add(icon.name);
    if (!icon.label?.trim()) {
      errors.push(`Module icon "${icon.name}" has no label.`);
    }
    const { drawing } = icon;
    if (!drawing || typeof drawing.viewBox !== "string" || !drawing.viewBox.trim()) {
      errors.push(`Module icon "${icon.name}" has no viewBox.`);
    }
    if (
      !drawing
      || !Array.isArray(drawing.paths)
      || drawing.paths.length === 0
      || drawing.paths.some((path) => typeof path !== "string" || !path.trim())
    ) {
      errors.push(`Module icon "${icon.name}" has no path data.`);
    }
  }
  return errors;
}

/**
 * A Module's icons, for the `icons` of its definition.
 *
 * A drawing is the Module's own (`viewBox` and path data) or an `@ant-design/icons-svg` definition,
 * which is read into one here -- so a package that wants an Ant Design icon the core registry lacks
 * registers it with one import. A name used twice, a name outside the grammar, or a drawing that is not
 * one is refused here, where the package is written.
 */
export function definePhiModuleIcons(icons: readonly PhiModuleIconInput[]): readonly PhiModuleIcon[] {
  const defined = icons.map((icon) => ({
    name: icon.name,
    label: icon.label,
    drawing: isSvgDefinition(icon.drawing) ? readSvgDefinitionDrawing(icon.drawing) : icon.drawing,
  }));
  const errors = collectPhiModuleIconErrors(defined);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
  return defined;
}

/** The icon sets of the given Module definitions, one per Module that registers any. */
export function collectPhiModuleIconSets(
  definitions: Iterable<{
    moduleId: `${string}/${string}`;
    title: string;
    icons?: readonly PhiModuleIcon[];
  }>,
): PhiModuleIconSet[] {
  const sets: PhiModuleIconSet[] = [];
  for (const definition of definitions) {
    if (definition.icons && definition.icons.length > 0) {
      sets.push({ moduleId: definition.moduleId, title: definition.title, icons: definition.icons });
    }
  }
  return sets;
}

export type PhiModuleIconIndex = ReadonlyMap<string, ReadonlyMap<string, PhiModuleIcon>>;

/** The icon sets keyed by Module and name, for the lookups `resolvePhiModuleIcon` makes. */
export function indexPhiModuleIconSets(sets: readonly PhiModuleIconSet[]): PhiModuleIconIndex {
  return new Map(sets.map((set) => [set.moduleId, new Map(set.icons.map((icon) => [icon.name, icon]))]));
}

/**
 * The icon a `module:` name stands for among the Modules an Area holds, or null.
 *
 * Null for a name that is not a `module:` name, for a Module that is not among them -- not installed,
 * or not active in this Area -- and for a name that Module does not register.
 */
export function resolvePhiModuleIcon(index: PhiModuleIconIndex, iconName: string): PhiModuleIcon | null {
  const parsed = parsePhiModuleIconName(iconName);
  if (!parsed) {
    return null;
  }
  return index.get(parsed.moduleId)?.get(parsed.name) ?? null;
}
