import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = process.cwd();
const inputPrimitives = new Set([
  "AutoComplete",
  "Button",
  "Cascader",
  "Checkbox",
  "Input",
  "InputNumber",
  "Segmented",
  "Select",
  "Slider",
  "Switch",
]);

const widgetControlRequirements = new Map([
  ["plugins/runtime-modules/core/widgets/input/client.tsx", "PhiTextControl"],
  ["plugins/runtime-modules/core/widgets/number-input/client.tsx", "PhiNumberControl"],
  ["plugins/runtime-modules/core/widgets/otp/client.tsx", "PhiOtpControl"],
  ["plugins/runtime-modules/core/widgets/slider/client.tsx", "PhiSliderControl"],
  ["plugins/runtime-modules/core/widgets/select-box/client.tsx", "PhiSelectControl"],
  ["plugins/runtime-modules/core/widgets/multi-select/client.tsx", "PhiMultiSelectControl"],
  ["plugins/runtime-modules/core/widgets/segmented/client.tsx", "PhiSegmentedControl"],
  ["plugins/runtime-modules/core/widgets/switch/client.tsx", "PhiSwitchControl"],
  ["plugins/runtime-modules/core/widgets/checkbox/client.tsx", "PhiCheckboxControl"],
  ["plugins/runtime-modules/core/widgets/checkbox-group/client.tsx", "PhiCheckboxGroupControl"],
  ["plugins/runtime-modules/core/widgets/cascader/client.tsx", "PhiCascaderControl"],
  ["plugins/runtime-modules/core/widgets/button/client.tsx", "PhiButtonControl"],
  ["plugins/runtime-modules/core/widgets/command-toolbar/client.tsx", "PhiToolbarControl"],
  ["plugins/runtime-modules/core/widgets/dimension/client.tsx", "PhiDimensionControl"],
  ["plugins/runtime-modules/core/widgets/length/client.tsx", "PhiLengthControl"],
]);

const directControlConsumers = [
  "components/forms/shared-form-provider-registry.tsx",
  "components/controls/phi-form-control.tsx",
  "components/forms/form-descriptor-runtime-client.tsx",
  "plugins/runtime-modules/builder/clients/inspector-config-field.tsx",
  "plugins/runtime-modules/builder/clients/inspector-signal-section.tsx",
  "plugins/runtime-modules/builder/clients/layout-inspector.tsx",
  "components/widgets/client/html-editor-image-node.tsx",
];

const feedbackPrimitiveOwners = new Map([
  ["Alert", "components/controls/phi-alert-control.tsx"],
  ["Popconfirm", "components/controls/phi-confirm-control.tsx"],
]);

const overlayPrimitiveOwners = new Map([
  ["Modal", "components/controls/phi-modal-control.tsx"],
  ["Drawer", "components/controls/phi-drawer-control.tsx"],
]);

const exclusiveInputPrimitiveOwners = new Map([
  ["Slider", "components/controls/phi-slider-control.tsx"],
]);

const navigationPrimitiveOwners = new Map([
  ["Menu", "components/controls/phi-menu-control.tsx"],
  ["Tabs", "components/controls/phi-tabs-control.tsx"],
  ["Dropdown", "components/controls/phi-dropdown-control.tsx"],
]);

/** The Menu item interface is part of the Menu primitive: only its Control may describe items in it. */
const menuInterfaceOwner = "components/controls/phi-menu-control.tsx";

const coreApplicationAdapterPath = "components/runtime/core-runtime-application-adapter.tsx";

/*
 * Every Ant Design primitive a Phi Control encapsulates, and the Control a consumer uses instead.
 *
 * AGENTS.md states the rule: when a Phi Control exists for a function, nobody imports the matching
 * primitive directly, and a capability the Control lacks is a Core extension, not an escape hatch. The
 * checks above predate it and name files -- fourteen Widgets, seven consumers, a walk over `components/`
 * for a handful of primitives -- so everything outside those names passed, every Module under `plugins/`
 * included. This is the rule itself, over the whole tree.
 *
 * This map is a denylist, so **every primitive not named here is permitted by omission** -- eight are
 * still imported somewhere in the tree, from `Space` and `Card` down to `List` and `Collapse`. `Flex`
 * and `Typography`, the two that reached furthest, are done, as are the four that had nothing to decide,
 * the file-choosing pair and the two that say "waiting" and "none"; five more are closed by
 * `soleOwnerPrimitives` below.
 *
 * That is where things stand rather than where they are meant to end: wrapping the rest is planned
 * work, because Ant Design is replaceable in principle and every direct import turns that from a
 * Control-adapter change into a tree-wide edit. When the Controls land, the primitives belong in the
 * map below and this check should end up refusing by default instead -- an allowlist of what may be
 * imported directly -- so the next primitive somebody reaches for is not permitted again by omission.
 * See TODOS.md, "Wrap the uncontrolled Ant Design primitives in Phi Controls".
 */
const controlledPrimitives = new Map([
  ["Alert", "PhiAlertControl"],
  ["AutoComplete", "PhiSelectControl"],
  ["Avatar", "PhiAvatarControl"],
  ["Button", "PhiButtonControl"],
  ["Calendar", "PhiCalendarControl"],
  ["Cascader", "PhiCascaderControl"],
  ["Checkbox", "PhiCheckboxControl"],
  ["ColorPicker", "PhiColorControl"],
  ["DatePicker", "PhiDatePickerControl"],
  ["Divider", "PhiDividerControl"],
  ["Drawer", "PhiDrawerControl"],
  ["Dropdown", "PhiDropdownControl"],
  ["Empty", "PhiEmptyControl"],
  ["Flex", "PhiFlexControl"],
  ["Form", "PhiFormControl"],
  ["Input", "PhiTextControl"],
  ["InputNumber", "PhiNumberControl"],
  ["Menu", "PhiMenuControl"],
  ["Modal", "PhiModalControl"],
  ["Pagination", "PhiPaginationControl"],
  ["Popconfirm", "PhiConfirmControl"],
  ["Progress", "PhiProgressControl"],
  ["Popover", "PhiPopoverControl"],
  ["QRCode", "PhiQrCodeControl"],
  ["Radio", "PhiRadioGroupControl"],
  ["Rate", "PhiRateControl"],
  ["Segmented", "PhiSegmentedControl"],
  ["Select", "PhiSelectControl"],
  ["Slider", "PhiSliderControl"],
  ["Skeleton", "PhiSkeletonControl"],
  ["Spin", "PhiSpinControl"],
  ["Statistic", "PhiStatisticControl"],
  ["Switch", "PhiSwitchControl"],
  ["Table", "PhiTableControl"],
  ["Tabs", "PhiTabsControl"],
  ["Tag", "PhiTagControl"],
  ["Tooltip", "PhiNameControl"],
  ["Tree", "PhiTreeControl"],
  ["Typography", "PhiTypographyControl"],
  ["Upload", "PhiFileDropControl"],
]);

/** Where the Controls live, and therefore where their primitives may be imported. */
const controlDirectory = "components/controls/";

/*
 * Implementations a Control plugs in rather than consumers of one. `PhiCalendarControl` and
 * `PhiDatePickerControl` render through the active calendar adapter, so the adapter is where the
 * primitive belongs -- one layer below the Control, not beside it. Named, so an addition is a decision.
 */
const primitiveAdapterOwners = new Map([
  ["components/calendar/gregory-calendar-adapter-client.tsx", new Set(["Calendar", "DatePicker"])],
]);

/*
 * Primitives that belong to exactly one file, with no Control standing in for them.
 *
 * The third answer to "how is a primitive closed", beside a Control and a deletion. For these the thing
 * around the primitive is already the contract: the markdown table of contents *is* an `Anchor`, the
 * image Widget's whole job is choosing between `next/image` and Ant Design's preview, and a Control
 * could not take that decision without taking the Widget with it. Wrapping them would produce a file
 * with one caller that adds nothing, which is the outcome TODOS.md calls "a contract without
 * consumers".
 *
 * So the primitive is closed by naming where it lives rather than by writing a wrapper. That is worth
 * as much as a Control for the reason the whole effort exists: swapping Ant Design out means visiting
 * these files, and they are named here instead of being found by grep.
 *
 * Unlike `primitiveAdapterOwners` above, which exempts a file from a rule that applies elsewhere, this
 * *is* the rule for these primitives -- and it is checked both ways: nobody else may import one, and an
 * owner that stops importing it fails too, so a stale entry cannot sit here looking like a decision.
 */
const soleOwnerPrimitives = new Map([
  ["Anchor", "plugins/runtime-modules/core/widgets/markdown-toc/client.tsx"],
  ["Breadcrumb", "plugins/runtime-modules/core/widgets/breadcrumb/client.tsx"],
  ["Image", "plugins/runtime-modules/core/widgets/image/client.tsx"],
  ["Result", "components/widgets/shared/result-body-client.tsx"],
  /*
   * `Badge` is the odd one: its other site is `phi-button-control.tsx`, where the badge is part of the
   * button's own contract. That file is under `components/controls/` and exempt by directory, so the
   * one entry here is the calendar adapter -- which is also in `primitiveAdapterOwners`, because the
   * badge it draws belongs to the Calendar primitive it owns.
   */
  ["Badge", "components/calendar/gregory-calendar-adapter-client.tsx"],
]);

/*
 * Imports that still stand between a primitive and its Control, each with what is missing.
 *
 * A list that may only shrink. A file not on it fails the moment it imports a controlled primitive,
 * so nothing new joins; and an entry whose file no longer needs it fails as well, so a converted file
 * cannot leave its exemption behind. What made the checks above blind was not an open list but a scope
 * drawn by name -- this one is the rule everywhere, with the remaining debts written down.
 */
const pendingControlAdoptions = new Map([]);

/** `import Select from "antd/es/select"` reaches the same primitive by another door. */
function readAntdComponentPathImports(source) {
  const names = [];
  for (const match of source.matchAll(/import\s+\w+\s+from\s*["']antd\/(?:es|lib)\/([\w-]+)["']/gu)) {
    names.push(match[1].replace(/(?:^|-)(\w)/gu, (_, letter) => letter.toUpperCase()));
  }
  return names;
}

/** `import * as antd from "antd"` and then `antd.Select` -- rare, and exactly as direct. */
function readAntdNamespaceUses(source) {
  const names = [];
  for (const match of source.matchAll(/import\s+\*\s+as\s+(\w+)\s+from\s*["']antd["']/gu)) {
    for (const use of source.matchAll(new RegExp(`\\b${match[1]}\\.(\\w+)`, "gu"))) {
      names.push(use[1]);
    }
  }
  return names;
}

/** Value imports only: a `type` import renders nothing, and prop-type leaks have their own check. */
function readAntdValueImports(source) {
  const names = [];
  for (const match of source.matchAll(/import\s+\{([^}]*)\}\s*from\s*["']antd["']/gu)) {
    for (const item of match[1].split(",")) {
      const trimmed = item.trim();
      if (!trimmed || trimmed.startsWith("type ")) continue;
      names.push(trimmed.split(/\s+as\s+/u)[0].trim());
    }
  }
  return [...names, ...readAntdComponentPathImports(source), ...readAntdNamespaceUses(source)];
}

async function listRepositorySources(relativeDirectory = ".") {
  const skipped = new Set(["node_modules", ".next", "dist", ".git", "scripts"]);
  const entries = await readdir(path.join(repositoryRoot, relativeDirectory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (skipped.has(entry.name)) continue;
    const relativePath = relativeDirectory === "." ? entry.name : path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listRepositorySources(relativePath));
    } else if (/\.[cm]?[jt]sx?$/u.test(entry.name) && !/\.test\.[cm]?[jt]sx?$/u.test(entry.name)) {
      files.push(relativePath);
    }
  }
  return files;
}

function readAntdNamedImports(source) {
  const names = [];
  // `[^}]*`, not a lazy `[\s\S]*?`: the lazy form starts at the first `import {` in the file and runs on
  // through the previous import's closing brace, so the first name of an antd import that follows any
  // other braced import was swallowed. That is how a `Button` stayed invisible to every check below.
  for (const match of source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']antd["']/gu)) {
    for (const item of match[1].split(",")) {
      const name = item.trim().split(/\s+as\s+/u)[0]?.trim();
      if (name) {
        names.push(name.replace(/^type\s+/u, ""));
      }
    }
  }
  return names;
}

async function readSource(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

async function listTypeScriptSources(relativeDirectory) {
  const entries = await readdir(path.join(repositoryRoot, relativeDirectory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listTypeScriptSources(relativePath));
    } else if (/\.[cm]?[jt]sx?$/u.test(entry.name)) {
      files.push(relativePath);
    }
  }
  return files;
}

const failures = [];
const widgetEntrySource = await readSource("widgets.ts");
const controlEntrySource = await readSource("controls.ts");

for (const requiredControl of [
  "PhiAlertControl",
  "PhiConfirmControl",
  "PhiModalControl",
  "PhiDrawerControl",
  "PhiFormControl",
  "PhiPopoverControl",
  "PhiPaginationControl",
  "PhiTabsControl",
  "PhiMenuControl",
  "PhiDropdownControl",
  "PhiMediaPickerControl",
  "PhiCollectionLayoutControl",
  "PhiMediaAssetTileControl",
  "PhiMaskPickerControl",
  "PhiColorControl",
  "PhiBackgroundControl",
  "PhiBorderControl",
  "PhiShadowControl",
  "PhiPaddingControl",
  "PhiGeometryControl",
]) {
  if (!controlEntrySource.includes(requiredControl)) {
    failures.push(`controls.ts must export ${requiredControl}.`);
  }
}

if (widgetEntrySource.includes("/components/controls/")) {
  failures.push("widgets.ts must not re-export Controls; use the dedicated controls.ts package entry.");
}

for (const [relativePath, requiredControl] of widgetControlRequirements) {
  const source = await readSource(relativePath);
  if (!controlEntrySource.includes(requiredControl)) {
    failures.push(`controls.ts must export ${requiredControl}.`);
  }
  if (!source.includes(requiredControl)) {
    failures.push(`${relativePath} must delegate presentation to ${requiredControl}.`);
  }
  if (source.includes('from "antd"') || source.includes("from 'antd'")) {
    failures.push(`${relativePath} must not import Ant Design directly.`);
  }
}

for (const relativePath of directControlConsumers) {
  const source = await readSource(relativePath);
  const invalidImports = readAntdNamedImports(source).filter((name) => inputPrimitives.has(name));
  if (invalidImports.length > 0) {
    failures.push(
      `${relativePath} imports input primitives directly from Ant Design: ${invalidImports.join(", ")}.`,
    );
  }
  if (/Phi(?:SelectBox|MultiSelect|Segmented|Switch|Button)Widget/u.test(source)) {
    failures.push(`${relativePath} mounts a complete Widget where a presentation Control is required.`);
  }
}

const controlFiles = [
  "components/controls/phi-control-options.ts",
  "components/controls/phi-options-provider.tsx",
  "components/controls/phi-color-control.tsx",
  "components/controls/phi-builder-insert-picker-control.tsx",
  "components/controls/phi-collection-layout-control.tsx",
  "components/controls/phi-media-asset-tile-control.tsx",
  ...new Set(widgetControlRequirements.values()),
];
for (const entry of controlFiles) {
  const relativePath = entry.includes("/")
    ? entry
    : `components/controls/${entry.replace(/^Phi/u, "phi-").replace(/([a-z])([A-Z])/gu, "$1-$2").toLowerCase()}.tsx`;
  const source = await readSource(relativePath);
  if (/from\s+["'][^"']*widgets\//u.test(source)) {
    failures.push(`${relativePath} reverses the Control-to-Widget dependency boundary.`);
  }
}

for (const relativePath of await listTypeScriptSources("components")) {
  const source = await readSource(relativePath);
  const antdImports = readAntdNamedImports(source);
  if (
    relativePath.startsWith("components/controls/") &&
    /from\s+["'][^"']*(?:widgets\/client\/|media\/[^"']*widget)/u.test(source)
  ) {
    failures.push(`${relativePath} mounts or imports a complete CMS Widget from a Control.`);
  }
  if (
    relativePath.startsWith("components/forms/") &&
    antdImports.some((name) => name === "Form" || name === "Table" || name === "Tree")
  ) {
    failures.push(`${relativePath} imports Form, Table, or Tree directly; use the canonical Phi Control.`);
  }
  for (const [primitive, ownerPath] of exclusiveInputPrimitiveOwners) {
    if (antdImports.includes(primitive) && relativePath !== ownerPath) {
      failures.push(`${relativePath} imports ${primitive} directly; use its Phi Control.`);
    }
  }
  for (const [primitive, ownerPath] of feedbackPrimitiveOwners) {
    if (antdImports.includes(primitive) && relativePath !== ownerPath) {
      failures.push(`${relativePath} imports ${primitive} directly; use its Phi Control.`);
    }
  }
  for (const [primitive, ownerPath] of overlayPrimitiveOwners) {
    if (antdImports.includes(primitive) && relativePath !== ownerPath) {
      failures.push(`${relativePath} imports ${primitive} directly; use its Phi Control.`);
    }
  }
  for (const [primitive, ownerPath] of navigationPrimitiveOwners) {
    if (relativePath === ownerPath) {
      continue;
    }
    if (antdImports.includes(primitive)) {
      failures.push(`${relativePath} imports ${primitive} directly; use its Phi Control.`);
    }
    // A prop type carries the primitive's item shape just as far as the component does, and a
    // published one puts Ant Design in the package API.
    const leakedPropTypes = antdImports.filter((name) => name.startsWith(`${primitive}Props`));
    if (leakedPropTypes.length > 0) {
      failures.push(
        `${relativePath} types against ${leakedPropTypes.join(", ")}; describe items as PhiMenuControlItem.`,
      );
    }
  }
  if (
    relativePath !== menuInterfaceOwner &&
    /from\s+["']antd\/[^"']*menu/u.test(source)
  ) {
    failures.push(
      `${relativePath} describes menu items in the Ant Design Menu interface; use PhiMenuControlItem.`,
    );
  }
  if (
    relativePath !== coreApplicationAdapterPath &&
    /const\s*\{[^}]*\b(?:message|notification)\b[^}]*\}\s*=\s*App\.useApp\(\)/su.test(source)
  ) {
    failures.push(`${relativePath} accesses Ant Design Message/Notification directly; emit Core application feedback.`);
  }
  if (
    relativePath !== coreApplicationAdapterPath &&
    antdImports.some((name) => name === "message" || name === "notification")
  ) {
    failures.push(`${relativePath} imports Ant Design Message/Notification directly; emit Core application feedback.`);
  }
}

/*
 * The rule points at Controls; a Control it names has to exist, or a consumer would be told to use
 * something that is not there and the only way through would be the primitive again.
 */
const controlSources = new Map();
for (const relativePath of await listTypeScriptSources("components/controls")) {
  controlSources.set(relativePath, await readSource(relativePath));
}
for (const [primitive, control] of controlledPrimitives) {
  const exported = [...controlSources.values()].some((source) =>
    new RegExp(`export\\s+(?:function|const)\\s+${control}\\b`, "u").test(source));
  if (!exported) {
    failures.push(`${primitive} is reserved for ${control}, but no Control under ${controlDirectory} exports it.`);
  }
}

const pendingStillNeeded = new Map();
/** Owners seen importing what they own, so an entry that has gone stale can be told from a live one. */
const soleOwnersSeen = new Set();
for (const relativePath of await listRepositorySources()) {
  if (relativePath.startsWith(controlDirectory)) continue;
  const source = await readSource(relativePath);
  const imported = new Set(readAntdValueImports(source));

  for (const [primitive, owner] of soleOwnerPrimitives) {
    if (!imported.has(primitive)) continue;
    if (relativePath === owner) {
      soleOwnersSeen.add(primitive);
      continue;
    }
    failures.push(
      `${relativePath} imports ${primitive} from Ant Design; it belongs to ${owner} and nowhere else. `
        + "Reuse that surface, or make the case for a second owner in soleOwnerPrimitives.",
    );
  }

  const adapterOwned = primitiveAdapterOwners.get(relativePath) ?? new Set();
  const pending = pendingControlAdoptions.get(relativePath)?.primitives ?? new Set();
  const direct = [...imported]
    .filter((name) => controlledPrimitives.has(name) && !adapterOwned.has(name));
  for (const primitive of direct) {
    if (pending.has(primitive)) {
      pendingStillNeeded.set(relativePath, (pendingStillNeeded.get(relativePath) ?? new Set()).add(primitive));
      continue;
    }
    failures.push(
      `${relativePath} imports ${primitive} from Ant Design directly; use ${controlledPrimitives.get(primitive)}.`,
    );
  }
}
for (const [primitive, owner] of soleOwnerPrimitives) {
  if (!soleOwnersSeen.has(primitive)) {
    failures.push(
      `${owner} no longer imports ${primitive}; remove it from soleOwnerPrimitives rather than leaving `
        + "an owner named for a primitive nobody uses.",
    );
  }
}
for (const [relativePath, { primitives }] of pendingControlAdoptions) {
  const stillNeeded = pendingStillNeeded.get(relativePath) ?? new Set();
  for (const primitive of primitives) {
    if (!stillNeeded.has(primitive)) {
      failures.push(
        `${relativePath} no longer imports ${primitive}; remove it from pendingControlAdoptions so the list keeps shrinking.`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error(`Control boundary validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Control boundaries valid (${widgetControlRequirements.size} Widgets, ${directControlConsumers.length} direct consumers, `
    + `${controlledPrimitives.size} controlled primitives across the tree, `
    + `${soleOwnerPrimitives.size} owned by a single file, `
    + `${[...pendingControlAdoptions.values()].reduce((count, entry) => count + entry.primitives.size, 0)} pending).`,
);
