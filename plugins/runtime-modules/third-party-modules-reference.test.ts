import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PHI_CORE_LAYOUT_DEFINITIONS } from "../../components/layouts/layout-definitions";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "./catalog";
import { PHI_RUNTIME_MODULE_WIDGETS } from "./core/widgets";

/**
 * The "what the Foundation already has" section of THIRD_PARTY_MODULES.md, held to the code.
 *
 * The section exists so an author finds a Layout, a Widget or a Control before asking for one that is
 * there. A list that lags the code sends the next author to the same wrong place, so a Layout in the
 * palette, a Core Widget, or a value `@phis/ui/controls` exports that the section does not name fails
 * here. The names come from the definitions and from `controls.ts` itself, never typed in again.
 *
 * A Module declared `activation: "always"` is part of the Foundation as well -- it is there in every
 * Area it is eligible for, the Asset Module in all of them -- so each of its Widgets and Form field types
 * is named in the section too, wherever the section describes it. That needs the assembled catalog,
 * which is why this test stands beside the module system and not in Core.
 */
const root = fileURLToPath(new URL("../../", import.meta.url));
const document = readFileSync(`${root}THIRD_PARTY_MODULES.md`, "utf8");

const START = "## Before you start: what the Foundation already has";
const startIndex = document.indexOf(START);
const nextIndex = document.indexOf("\n## ", startIndex + START.length);
const section = startIndex < 0 ? "" : document.slice(startIndex, nextIndex < 0 ? undefined : nextIndex);

function between(heading: string, nextHeading: string): string {
  const from = section.indexOf(heading);
  const to = section.indexOf(nextHeading, from + heading.length);
  return from < 0 ? "" : section.slice(from, to < 0 ? undefined : to);
}

/** Every value `controls.ts` exports, read from its text: importing it would load Ant Design. */
function readControlValueExports(): string[] {
  const source = readFileSync(`${root}controls.ts`, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const names: string[] = [];
  for (const match of source.matchAll(/export\s+(type\s+)?\{([^}]*)\}/g)) {
    if (match[1]) continue;
    for (const entry of match[2].split(",")) {
      const name = entry.trim();
      if (!name || name.startsWith("type ")) continue;
      names.push(name.split(/\s+as\s+/).pop() as string);
    }
  }
  return names;
}

describe("THIRD_PARTY_MODULES.md, what the Foundation already has", () => {
  it("has the section", () => {
    expect(startIndex).toBeGreaterThanOrEqual(0);
  });

  it("names every Layout of the palette", () => {
    const layouts = between("### Layouts", "### Core Widgets");
    const palette = PHI_CORE_LAYOUT_DEFINITIONS.filter((definition) => definition.category === "structure");
    expect(palette.length).toBeGreaterThan(0);
    const missing = palette.map((definition) => definition.typeKey).filter((key) => !layouts.includes(`\`${key}\``));
    expect(missing).toEqual([]);
  });

  it("names every Core Widget", () => {
    const widgets = between("### Core Widgets", "### Controls a Module's own Widget may use");
    const keys = PHI_RUNTIME_MODULE_WIDGETS.map((widget) => widget.definition.typeKey);
    expect(keys.length).toBeGreaterThan(0);
    const missing = keys.filter((key) => !widgets.includes(`\`${key}\``));
    expect(missing).toEqual([]);
  });

  it("names every Widget and Form field type of a Module that is always active", () => {
    const alwaysActive = [...PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values()].filter(
      (entry) => entry.definition.activation === "always",
    );
    expect(alwaysActive.length).toBeGreaterThan(0);
    const missing = alwaysActive.flatMap((entry) => [
      ...entry.widgets
        .map((widget) => widget.definition.typeKey)
        .filter((key) => !section.includes(`\`${key}\``))
        .map((key) => `${entry.definition.moduleId}: Widget \`${key}\``),
      // A field type's key is namespaced (`@phis/ui/modules/asset/form-field/media-asset`): its leaf or the whole key.
      ...(entry.definition.formProviders?.fieldTypes ?? [])
        .filter(({ key }) => !section.includes(`\`${key.split("/").pop()}\``) && !section.includes(`\`${key}\``))
        .map(({ key }) => `${entry.definition.moduleId}: form field \`${key.split("/").pop()}\` (${key})`),
    ]);
    expect(missing).toEqual([]);
  });

  it("names every value @phis/ui/controls exports", () => {
    const controls = between("### Controls a Module's own Widget may use", "### What every block can do");
    const names = readControlValueExports();
    expect(names.length).toBeGreaterThan(0);
    const missing = names.filter((name) => !controls.includes(`\`${name}\``));
    expect(missing).toEqual([]);
  });

  it("does not name a Control that @phis/ui/controls does not export", () => {
    const controls = between("### Controls a Module's own Widget may use", "### What every block can do");
    const exported = new Set(readControlValueExports());
    const named = [...controls.matchAll(/`(Phi[A-Za-z]*Control)`/g)].map((match) => match[1]);
    expect(named.filter((name) => !exported.has(name))).toEqual([]);
  });
});
