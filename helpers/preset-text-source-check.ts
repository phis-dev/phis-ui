import type { PhiResolvedCmsPageTree } from "../types/cms";
import { readPhiConfigTextRegisterByName } from "./config-text-fields";
import { readPhiTextSource } from "./text-source";
import { PhiCmsFlags } from "../constants/phi-cms";
import { hasPhiFlag } from "./flags";

/**
 * Whose words a Module's Preset writes, as a check (`helpers/text-source.ts`).
 *
 * A Module's Preset says, of every Widget it fills with text, whose words they are: `textSource:
 * "preset"` for the Module's own -- translated once, in the platform's store, on every installation --
 * or `"site"` for what the Site configured and the Preset only places, such as its contact address.
 * Left unsaid, the words would be translated per Site as if an author had written them, and nobody would
 * notice; that is how the Builder's own Area select came to read "Accounting" in German.
 *
 * Run by a Module over the trees its presets build, in its own verify step, beside the Page rule. A Site's
 * own package does not run it: every word in its Pages is the Site's, which is what no marker means.
 *
 * It reads the config as stated, by the field names alone (`helpers/config-text-fields.ts`), so it needs
 * no Widget definition: a text under a text's name, at the top, inside a list's entries or inside a nested
 * object -- a Table's `presentation.columns[].title`, `features.filters[].label` and
 * `presentation.emptyState.title` are words as much as a Button's label. A Table whose texts come from the
 * Module's Label Set, already in the reader's language, says so with `NoTranslate` on its node.
 */

export type PhiPresetTextSourceFinding = {
  /** The node's label, or its id where it has none. */
  node: string;
  message: string;
};

function findTextKey(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findTextKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && entry.trim() && readPhiConfigTextRegisterByName(key)) return key;
    if (Array.isArray(entry)) {
      const found = findTextKey(entry, depth + 1);
      if (found) return `${key}[].${found}`;
    } else if (entry !== null && typeof entry === "object") {
      const found = findTextKey(entry, depth + 1);
      if (found) return `${key}.${found}`;
    }
  }
  return null;
}

export function checkPhiPresetTextSources(
  tree: Pick<PhiResolvedCmsPageTree, "contentWidgets">,
): PhiPresetTextSourceFinding[] {
  const findings: PhiPresetTextSourceFinding[] = [];
  for (const widget of tree.contentWidgets) {
    if (readPhiTextSource(widget.config.textSource)) continue;
    // Already in the reader's language, read from a Label Set: nobody translates it.
    if (hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)) continue;
    const key = findTextKey(widget.config);
    if (!key) continue;
    findings.push({
      node: widget.label?.trim() || String(widget.id),
      message: `writes text ("${key}") without saying whose words it is: state textSource "preset" for the ` +
        `Module's own words or "site" for what the Site configured.`,
    });
  }
  return findings;
}
