import { Fira_Mono, Fira_Sans, Lora } from "next/font/google";

import { PHI_CORE_FONT_FAMILIES, type PhiFontCatalogueEntry } from "./phi-font-catalogue-contract";

/**
 * The self-hosted families a Theme may name, and which of them a page pays for before it paints.
 *
 * `next/font` is a build-time loader: the call stands at module scope with literal arguments, and Next
 * fetches the files once and serves them from this origin. What is not fixed is *which* declared family
 * a page uses -- that is a CSS variable the Theme sets per request. So this is a catalogue of what a
 * Site may choose from, not a set of fonts every page wears.
 *
 * `preload` is the one part that cannot be decided per request. `next/font` hands back a class name, a
 * style, and a variable -- never a file URL -- so a `<link rel="preload">` for the family a Theme
 * happens to pick cannot be written by hand. The decision is therefore taken here, per family, by what
 * a page needs before it paints: body text always, a code face and a serif only where something asks
 * for them, and those then arrive with `font-display: swap` rather than holding up the first paint.
 *
 * It was all three before, on every page: measured in the Skeleton's build, 236 KB of preloaded Latin
 * faces, of which 183 KB were a serif and a code face that a Site running on the body font alone never
 * names. The files are still built and self-hosted either way; what falls away is the browser being
 * told to fetch them before it knows whether anything needs them.
 */

const firaSans = Fira_Sans({
  variable: "--phi-font-source-body",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

const firaMono = Fira_Mono({
  variable: "--phi-font-source-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
});

const lora = Lora({
  variable: "--phi-font-source-serif",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  preload: false,
});

export type { PhiFontCatalogueEntry } from "./phi-font-catalogue-contract";

/** The families phis-ui itself declares: the floor, and what the core fonts block names. */
export const PHI_FONT_CATALOGUE: readonly PhiFontCatalogueEntry[] = [
  { family: "Fira Sans", cssVariable: "var(--phi-font-source-body)", className: firaSans.variable },
  { family: "Fira Mono", cssVariable: "var(--phi-font-source-mono)", className: firaMono.variable },
  { family: "Lora", cssVariable: "var(--phi-font-source-serif)", className: lora.variable },
];

if (PHI_FONT_CATALOGUE.some((entry, index) => entry.family !== PHI_CORE_FONT_FAMILIES[index]) || PHI_FONT_CATALOGUE.length !== PHI_CORE_FONT_FAMILIES.length) {
  throw new Error("The core font catalogue and its contract name different families.");
}

export type PhiFontCatalogue = {
  entries: readonly PhiFontCatalogueEntry[];
  /**
   * The classes that put every catalogue variable in scope.
   *
   * All of them, on every page, and that costs nothing: a class name declares where a variable is
   * readable, not that a file must be fetched. Only a `font-family` that actually resolves to one makes
   * the browser ask for bytes.
   */
  className: string;
  /** Family name to the variable it resolves to; a name not in here reaches the browser as it is. */
  familyVariables: ReadonlyMap<string, string>;
};

/**
 * The catalogue a Site renders with: the core families, then what its installed Modules declared.
 *
 * Composed once per Site rather than per request, because what goes into it is fixed at build time --
 * the declarations are `next/font` calls at module scope -- and the only per-request question, which
 * family a page uses, is answered by the Theme against the map this returns.
 *
 * A family declared twice is refused rather than resolved: two declarations of "Inter" would be two
 * variables, and the map could keep only one of them, so whichever Module lost would render in a face
 * it never asked for. That includes the core families -- a Module wanting Lora names it, it does not
 * declare it again.
 */
export function composePhiFontCatalogue(
  contributed: readonly PhiFontCatalogueEntry[] = [],
): PhiFontCatalogue {
  const entries = [...PHI_FONT_CATALOGUE, ...contributed];
  const familyVariables = new Map<string, string>();
  for (const entry of entries) {
    const family = entry.family.trim();
    if (familyVariables.has(family)) {
      throw new Error(`Font family "${family}" is declared twice in the font catalogue.`);
    }
    familyVariables.set(family, entry.cssVariable);
  }
  return {
    entries,
    className: entries.map((entry) => entry.className).filter(Boolean).join(" "),
    familyVariables,
  };
}
