import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import type { PhiCmsConfigField } from "../types/cms-plugins";

/*
 * A list is always edited in a dialog, never in the Inspector column (owner, 2026-11-25; BUILDER.md,
 * "Field rows"; `PhiCmsConfigFieldCollectionPresentation`).
 *
 * Every `collection` field the Inspector shows declares how: `overlay` (a row with an Edit button that
 * opens the list in an Overlay) or `select` (one entry at a time, for a list whose length is decided
 * elsewhere). A collection edited on the canvas (`editorPlacement: "toolbar"`) declares neither. A
 * collection inside an entry of an Overlay is edited in place in that Overlay and declares no
 * presentation either: it would say something the Inspector does not do. The entries of a `select`
 * stand in the Inspector column, so a collection among their fields is held to the same rule as one of
 * the Widget's own.
 *
 * Checked over every first-party Widget and Layout, and over the settings fields of Modules' data
 * Providers, which the Inspector draws with the same rows.
 */

const problems: string[] = [];

function check(fields: readonly PhiCmsConfigField[] | undefined, where: string, inOverlay: boolean) {
  for (const field of fields ?? []) {
    if (field.type !== "collection") continue;
    const at = `${where} > ${field.key}`;
    if (inOverlay) {
      if (field.presentation != null) {
        problems.push(
          `${at}: a collection inside an entry of an Overlay is edited in place there; ` +
            `remove its presentation "${field.presentation}".`,
        );
      }
      check(field.itemFields, at, true);
      continue;
    }
    if (field.editorPlacement === "toolbar") {
      if (field.presentation != null) {
        problems.push(`${at}: edited on the canvas (editorPlacement "toolbar"); remove its presentation "${field.presentation}".`);
      }
      continue;
    }
    if (field.presentation !== "overlay" && field.presentation !== "select") {
      problems.push(
        `${at}: an Inspector collection declares presentation "overlay" (or "select" for a list whose ` +
          "length is decided elsewhere); a list is never edited in the Inspector column.",
      );
      continue;
    }
    check(field.itemFields, at, field.presentation === "overlay");
  }
}

for (const entry of PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values()) {
  const moduleId = entry.definition.moduleId;
  for (const widget of entry.widgets) {
    check(widget.definition.fields, `${moduleId} widget ${widget.definition.typeKey}`, false);
  }
  for (const layout of entry.layouts) {
    check(layout.definition.fields, `${moduleId} layout ${layout.definition.typeKey}`, false);
  }
  for (const provider of entry.definition.dataProviders ?? []) {
    check(provider.settingsFields, `${moduleId} data provider ${provider.key}`, false);
  }
}

if (problems.length > 0) {
  console.error(`Inspector collections (scripts/validate-inspector-collections.ts):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
