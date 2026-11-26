import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { repositoryRoot } from "./lib/repo-root.mjs";
import { listSourceFiles } from "./lib/source-files.mjs";

/*
 * A Form is built from descriptor fields, and a field's label and control stand where the Form's template
 * puts them (FORMS.md, "Layout and placement"; "A field draws no label layout of its own"). The rows are
 * drawn in two places only: the Form Widget (`components/controls/phi-form-control.tsx`) and, for a field
 * whose value has labelled parts, `PhiFormFieldPart` (`components/forms/form-field-row.tsx`). The Builder
 * Inspector's rows are its own template (`validate-inspector-field-rows.mjs`).
 *
 * The address field drew its eight parts with its own `<label>` over each input. Nothing said so: the
 * dialog was the single-column width, the Form stood in the body, the descriptor took the template -- and
 * the field, inside the control column, stacked its labels anyway (owner, 2026-11-26). So this refuses
 * the shapes a hand-built label+input pair takes:
 *
 * 1. a `<label>` element anywhere but the two template files;
 * 2. Ant Design's `Form` or `Form.Item`, `labelCol`, `wrapperCol`, or `layout="vertical"` anywhere but the
 *    Form Widget;
 * 3. a field Control or `PhiLabeledControl` handed a `label` -- in a field-provider Control, a dialog's
 *    body, a popover or a panel alike, since each draws the words beside or above the input itself. Not
 *    refused: a switch's own wording from the descriptor (`label={controlLabel}`, such a field has no
 *    label cell), a Control passing its own prop on (`label={label}`), the caption a single-field Widget
 *    reads from its own config (`label={config.label}`, a Widget on a page and not a field of a form),
 *    and a checkbox, whose label is the sentence beside its box.
 *
 * `node scripts/validate-form-field-rows.mjs <file>...` checks further files by every rule as well, which
 * is how the rule is shown to bite on a copy of the old address Control.
 */

const TEMPLATE_LABEL_FILES = new Set([
  "components/controls/phi-form-control.tsx",
  "components/forms/form-field-row.tsx",
]);
const TEMPLATE_FORM_FILES = new Set(["components/controls/phi-form-control.tsx"]);

/*
 * TEMPORARY (owner, 2026-11-26): the places that built their own label+input pairs when this check came,
 * listed in that day's report and left as they are until each moves onto descriptor fields (a dialog, a
 * popover, a card) or the Inspector rows. Each entry is a file, the rule it is let off and how many hits
 * of it the file had then: one more fails, and a fixed one has to lower the number or remove the entry
 * (a number above the hits fails too, so the list cannot go stale). Never a way to pass the check.
 */
const TEMPORARY_EXCEPTIONS = new Map([
  // Rich-text tools, text-style popover: Font and Size as a <label> around a caption and a select.
  ["components/widgets/client/shared/phi-widget-tool-buttons.tsx", { "label-element": 2 }],
  // Surface control (Inspector composite): "background per mode" switch with its own label.
  ["components/controls/phi-surface-control.tsx", { "control-label": 1 }],
  // Asset Inspector section: the variants select under the Asset name, not an Inspector row.
  ["components/media/phi-asset-inspector-section.tsx", { "control-label": 1 }],
  // HTML editor, image popover: Title, Alt text, Size.
  ["components/widgets/client/html-editor-image-node.tsx", { "control-label": 3 }],
  // Table: a filter's inline label, and the label of a select or cascader tool.
  ["plugins/runtime-modules/core/widgets/table/client.tsx", { "control-label": 3 }],
  // Theme brand controls (colours, surfaces, identity, social, campaign preview).
  ["plugins/runtime-modules/theme/widgets/brand-controls/client.tsx", { "control-label": 17 }],
]);

const FIELD_CONTROLS = [
  "PhiCascaderControl",
  "PhiColorFieldControl",
  "PhiColorControl",
  "PhiCountrySelectControl",
  "PhiDatePickerControl",
  "PhiLabeledControl",
  "PhiLengthControl",
  "PhiMoneyControl",
  "PhiMultiSelectControl",
  "PhiNumberControl",
  "PhiOtpControl",
  "PhiPaddingControl",
  "PhiRadioGroupControl",
  "PhiSegmentedControl",
  "PhiSelectControl",
  "PhiSliderControl",
  "PhiSwitchControl",
  "PhiTextControl",
  "PhiTreeCascaderControl",
  "PhiTreeSelectControl",
];
const fieldControlTag = new RegExp(`<(${FIELD_CONTROLS.join("|")})\\b((?:[^<>]|=>|<[^>]*>)*?)\\/?>`, "gs");

/** The source with its comments blanked, line breaks kept, so a `<label for>` in prose is not a label. */
function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, (comment) => comment.replace(/[^\n]/gu, " "))
    .replace(/(^|[\s;{}(),])\/\/[^\n]*/gu, (_, lead) => lead);
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function check(relative, rawSource, { strict }) {
  const source = withoutComments(rawSource);
  const found = { "label-element": [], "form-layout": [], "control-label": [] };
  if (strict || !TEMPLATE_LABEL_FILES.has(relative)) {
    for (const match of source.matchAll(/<label\b/gu)) {
      found["label-element"].push(`${relative}:${lineOf(source, match.index)} draws a <label> of its own`);
    }
  }
  if (strict || !TEMPLATE_FORM_FILES.has(relative)) {
    for (const match of source.matchAll(/import\s*(?:type\s*)?\{[^}]*\bForm\b[^}]*\}\s*from\s*["']antd["']/gu)) {
      found["form-layout"].push(`${relative}:${lineOf(source, match.index)} imports Ant Design's Form`);
    }
    for (const match of source.matchAll(/\bForm\.Item\b|\blabelCol\b|\bwrapperCol\b|\blayout=(?:"vertical"|\{\s*"vertical"\s*\})/gu)) {
      found["form-layout"].push(`${relative}:${lineOf(source, match.index)} lays out a form itself (${match[0]})`);
    }
  }
  for (const match of source.matchAll(fieldControlTag)) {
    const label = match[2].match(/(?:^|\s)label=(\{[^}]*\}|"[^"]*")/u);
    // `{label}` is a Control handing its own prop on to `PhiLabeledControl`, not a caller choosing words.
    if (!label || label[1] === "{controlLabel}" || label[1] === "{label}") continue;
    // A single-field Widget's caption from its own config: a Widget on a page, not a field of a form.
    if (/^\{\s*(?:config|resolvedConfig)\??\.label\s*\}$/u.test(label[1])) continue;
    found["control-label"].push(`${relative}:${lineOf(source, match.index)} <${match[1]} label=…> draws the field's label beside or above itself`);
  }
  const allowed = strict ? {} : TEMPORARY_EXCEPTIONS.get(relative) ?? {};
  const failures = [];
  for (const [rule, hits] of Object.entries(found)) {
    const limit = allowed[rule] ?? 0;
    if (hits.length > limit) failures.push(...hits);
    else if (hits.length < limit) {
      failures.push(`${relative}: the temporary exception allows ${limit} "${rule}" hits and there are ${hits.length}; lower it`);
    }
  }
  return failures;
}

const files = await listSourceFiles(".", {
  relativeTo: repositoryRoot,
  extensions: [".tsx", ".ts"],
  includeTests: false,
  skipDirectories: ["node_modules", ".next", "dist", ".git", "scripts"],
});
const sources = new Map(await Promise.all(files.map(async (relative) =>
  [relative, await readFile(path.join(repositoryRoot, relative), "utf8")])));

const failures = [];
for (const [relative, source] of sources) {
  failures.push(...check(relative, source, { strict: false }));
}
for (const extra of process.argv.slice(2)) {
  failures.push(...check(extra, await readFile(path.resolve(extra), "utf8"), { strict: true }));
}

if (failures.length > 0) {
  console.error("A Form is built from descriptor fields; a field's label stands where the Form's template puts it");
  console.error("(PhiFormControl, PhiFormFieldPart in components/forms/form-field-row.tsx). Hand-built label+input pairs:");
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}
