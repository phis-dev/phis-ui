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
 * **This map no longer decides anything; `antdImportAllowance` below does.** What is left here is the
 * advice: when a file imports a primitive it may not, this says which Control to use instead, so the
 * failure names the way out rather than only the way in. Reaching the whole tree took every route -- a
 * Control where there was something to decide, a plain pass-through where there was not, an owner entry
 * where the Widget around the primitive already was the contract, an adapter file for a Layout that owns
 * its own, and a deletion for the footer Widget, which took `Row`, `Col` and `Layout` with it.
 *
 * Those three are why the denylist had to go. They are imported nowhere, and this map could never have
 * protected them: it demands a Control that exports the named symbol, and a three-column grid is a
 * Layout. A list of what may not be imported is silent about everything nobody has thought of yet.
 */
const controlledPrimitives = new Map([
  ["Alert", "PhiAlertControl"],
  ["AutoComplete", "PhiSelectControl"],
  ["Avatar", "PhiAvatarControl"],
  ["Button", "PhiButtonControl"],
  ["Calendar", "PhiCalendarControl"],
  ["Card", "PhiCardControl"],
  ["Cascader", "PhiCascaderControl"],
  ["Checkbox", "PhiCheckboxControl"],
  ["Collapse", "PhiAccordionControl"],
  ["ColorPicker", "PhiColorControl"],
  ["DatePicker", "PhiDatePickerControl"],
  ["Descriptions", "PhiDescriptionListControl"],
  ["Divider", "PhiDividerControl"],
  ["Drawer", "PhiDrawerControl"],
  ["Dropdown", "PhiDropdownControl"],
  ["Empty", "PhiEmptyControl"],
  ["Flex", "PhiFlexControl"],
  ["Form", "PhiFormControl"],
  ["Input", "PhiTextControl"],
  ["InputNumber", "PhiNumberControl"],
  /*
   * `List` is deprecated in Ant Design and `Listy` is deliberately not adopted in its place. `Listy` is
   * virtualisation and grouping, which is what a list of ten thousand rows needs -- and nothing here has
   * one, because Provider-backed data pages by contract and every client-held list is bounded by the
   * thing it describes. Both names point at `PhiEntryListControl` so that reaching for either is a
   * conversation rather than an import.
   */
  ["List", "PhiEntryListControl"],
  ["Listy", "PhiEntryListControl"],
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
  /*
   * `Space` is the whole component, `Space.Compact` included: the member is reached through the import,
   * so naming the import is what closes both. Plain `Space` is gone from the tree -- a gap does the same
   * spacing without an element around every child -- and `Space.Compact` is `PhiCompactGroupControl`.
   */
  ["Space", "PhiCompactGroupControl"],
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
  /*
   * The CollapsibleLayout is the adapter for the general collapsible region, and a Control between it
   * and the primitive would only hand a Layout its own props back. `PhiAccordionControl` is the narrow
   * case beside it -- one section open at a time, nothing to decide -- and everything else goes there.
   */
  ["components/layouts/clients/phi-collapsible-layout-client.tsx", new Set(["Collapse"])],
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
 * Every Ant Design import this repository makes outside `components/controls/`, and why.
 *
 * **This is the allowlist, and it is the whole rule.** Everything above it says what may not be
 * imported; this says what may, so a primitive nobody thought about is refused rather than permitted.
 * That reversal is the point: `Row`, `Col` and `Layout` left the tree with the footer Widget and the
 * denylist still could not protect them, because it demands a Control exporting the named symbol and a
 * three-column grid is a Layout. Under an allowlist they are simply absent, which is the same as closed.
 *
 * It covers **type imports and deep paths too**, which the denylist never did. A type costs a library
 * swap exactly what a value costs -- `CollapseProps["items"]` is the `Collapse` contract whatever the
 * keyword in front of it -- and a rule that reads only `import {` moves the workaround to
 * `import type {`. The deep-path reader used to match one path segment, so `antd/es/select` was seen and
 * `antd/es/theme/util/alias` was not: four value imports into Ant Design's internal theme machinery,
 * the deepest coupling in the tree, invisible to every check for as long as they have been there.
 *
 * Checked both ways. A file importing what no entry permits fails, and an entry naming an import its
 * file no longer makes fails too, so this cannot drift into a list of old permissions nobody reads.
 * `soleOwnerPrimitives` and `primitiveAdapterOwners` grant what they name on top of this, so ownership
 * is written down once rather than twice.
 */
const antdImportAllowance = new Map([
  ["components/calendar/gregory-calendar-adapter-client.tsx", {
    types: ["CalendarProps"],
    reason: "The calendar adapter owns Calendar and DatePicker; the prop type comes with them.",
  }],
  ["components/layouts/clients/phi-collapsible-layout-client.tsx", {
    types: ["CollapseProps"],
    reason: "The CollapsibleLayout is the Collapse adapter; `items` and `styles` are that primitive's own shapes.",
  }],
  ["components/root/phi-config-provider.tsx", {
    values: ["ConfigProvider", "theme"],
    types: ["ConfigProviderProps", "ThemeConfig"],
    paths: ["antd/es/theme/interface"],
    reason: "The root adapter. Everything Ant Design is configured with enters here and nowhere else.",
  }],
  ["components/root/phi-root-live-theme-provider.tsx", {
    types: ["ConfigProviderProps"],
    reason: "Hands the root adapter a theme at runtime, in the shape the root adapter takes.",
  }],
  ["components/root/phi-root-layout.tsx", {
    paths: ["antd/es/app"],
    reason: "Mounts the App context the Core application adapter reads from.",
  }],
  ["components/runtime/core-runtime-application-adapter.tsx", {
    values: ["App"],
    reason: "The one file allowed to reach message and notification; everything else emits Core feedback.",
  }],
  ["plugins/runtime-modules/builder/draft-command-controller.tsx", {
    values: ["App"],
    reason: "Builder draft commands report through the same App context.",
  }],
  ["plugins/runtime-modules/core/widgets/table/client.tsx", {
    values: ["App"],
    reason: "Table actions report through the same App context.",
  }],
  ["plugins/runtime-modules/theme/widgets/brand-controls/client.tsx", {
    values: ["ConfigProvider", "theme"],
    paths: ["antd/es/theme/interface"],
    reason: "The Theme preview renders a draft Theme, so it configures Ant Design a second time on purpose.",
  }],
  ["theme/phi-antd-token-resolver.ts", {
    paths: [
      "antd/es/theme/interface",
      "antd/es/theme/themes/dark",
      "antd/es/theme/themes/default",
      "antd/es/theme/themes/seed",
      "antd/es/theme/util/alias",
    ],
    reason:
      "Resolves the full token set without a React render, which needs the algorithms and the alias "
      + "formatter. `themes/seed` and `util/alias` are not public exports -- the deepest coupling in the "
      + "tree, and the reason the deep-path reader now matches more than one segment.",
  }],
  ["components/forms/form-provider-registry.tsx", {
    paths: ["antd/es/form"],
    reason: "Rule types for the Form primitive PhiFormControl wraps.",
  }],
  ["components/widgets/client/markdown-editor.tsx", {
    paths: ["antd/es/input/TextArea"],
    reason: "A ref to the textarea it has to place a cursor in. A leak, and the smallest one available.",
  }],
  ["components/widgets/helpers/font-family.ts", {
    paths: ["antd/es/theme/interface"],
    reason: "Token names, as part of the theme adapter.",
  }],
  ["components/widgets/helpers/font-size.ts", {
    paths: ["antd/es/theme/interface"],
    reason: "Token names, as part of the theme adapter.",
  }],
  ["helpers/antd-locale.ts", {
    paths: ["antd/es/locale"],
    reason: "Maps a Phi locale onto the primitive locale bundle the root adapter takes.",
  }],
  ["plugins/runtime-modules/builder/tree-options.tsx", {
    paths: ["antd/es/tree"],
    reason: "`DataNode` is the Tree primitive's node shape, and PhiTreeControl passes it through.",
  }],
  ["plugins/runtime-modules/core/widgets/input/client.tsx", {
    paths: ["antd/es/input"],
    reason: "`InputRef` for focus handling. The Widget renders PhiTextControl and types against the ref alone.",
  }],
  /*
   * Ten surfaces read design tokens through the primitive's own hook rather than through
   * `usePhiConfig()`, which returns the same token set. That is a Control adoption still open rather
   * than a decision -- see TODOS.md -- and it is listed here so that it shrinks in the open.
   */
  ["components/layouts/clients/phi-carousel-layout-client.tsx", { values: ["theme"], reason: "Reads tokens." }],
  ["components/layouts/clients/phi-grid-layout-client.tsx", { values: ["theme"], reason: "Reads tokens." }],
  ["components/layouts/phi-structure-region-layout.tsx", { values: ["theme"], reason: "Reads tokens." }],
  ["plugins/runtime-modules/builder/clients/inspector-config-field.tsx", { values: ["theme"], reason: "Reads tokens." }],
  ["plugins/runtime-modules/builder/clients/layout-scaffold-overlays.tsx", { values: ["theme"], reason: "Reads tokens." }],
  ["plugins/runtime-modules/builder/clients/structure-canvas.tsx", { values: ["theme"], reason: "Reads tokens." }],
  ["plugins/runtime-modules/builder/edit-scaffold-drawer.tsx", { values: ["theme"], reason: "Reads tokens." }],
  ["plugins/runtime-modules/builder/render-root-node-scaffold.tsx", { values: ["theme"], reason: "Reads tokens." }],
  ["plugins/runtime-modules/builder/widgets/structure-region/built-in.tsx", { values: ["theme"], reason: "Reads tokens." }],
  ["plugins/runtime-modules/core/widgets/gallery/client.tsx", { values: ["theme"], reason: "Reads tokens." }],
]);

/** What a file may import: its own entry, plus whatever it is named the owner or adapter of. */
function readAllowance(relativePath) {
  const entry = antdImportAllowance.get(relativePath);
  const values = new Set(entry?.values ?? []);
  const types = new Set(entry?.types ?? []);
  const paths = new Set(entry?.paths ?? []);
  for (const [primitive, owner] of soleOwnerPrimitives) {
    if (owner === relativePath) values.add(primitive);
  }
  for (const primitive of primitiveAdapterOwners.get(relativePath) ?? []) {
    values.add(primitive);
  }
  return { values, types, paths };
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
  return [...names, ...readAntdNamespaceUses(source)];
}

/**
 * Every `antd/es/...` or `antd/lib/...` path a file imports from, value or type, kept whole.
 *
 * Whole, because folding a path into a component name is what hid the worst of them: the old reader
 * matched one segment, so `antd/es/select` was seen and `antd/es/theme/util/alias` was not.
 */
function readAntdDeepPaths(source) {
  const paths = [];
  for (const match of source.matchAll(
    /import\s+(?:type\s+)?(?:[\w*]+(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*["']antd\/(?:es|lib)\/([\w/.-]+)["']/gu,
  )) {
    paths.push(`antd/es/${match[1]}`);
  }
  return paths;
}

/**
 * Named type imports from the package root.
 *
 * A type costs a library swap exactly what a value costs, and a rule that reads only `import {` moves
 * the workaround to `import type {`.
 */
function readAntdTypeImports(source) {
  const names = [];
  for (const match of source.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s*from\s*["']antd["']/gu)) {
    const blockIsType = Boolean(match[1]);
    for (const item of match[2].split(",")) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      if (!blockIsType && !trimmed.startsWith("type ")) continue;
      names.push(trimmed.replace(/^type\s+/u, "").split(/\s+as\s+/u)[0].trim());
    }
  }
  return names;
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

/** Owners seen importing what they own, so an entry that has gone stale can be told from a live one. */
const soleOwnersSeen = new Set();
/** Allowances seen used, for the same reason: a permission nobody needs is one nobody rereads. */
const allowanceSeen = new Map();

function noteAllowanceUse(relativePath, field, name) {
  const seen = allowanceSeen.get(relativePath) ?? { values: new Set(), types: new Set(), paths: new Set() };
  seen[field].add(name);
  allowanceSeen.set(relativePath, seen);
}

for (const relativePath of await listRepositorySources()) {
  if (relativePath.startsWith(controlDirectory)) continue;
  const source = await readSource(relativePath);
  const allowed = readAllowance(relativePath);

  for (const name of new Set(readAntdValueImports(source))) {
    if (allowed.values.has(name)) {
      noteAllowanceUse(relativePath, "values", name);
      if (soleOwnerPrimitives.get(name) === relativePath) soleOwnersSeen.add(name);
      continue;
    }
    const owner = soleOwnerPrimitives.get(name);
    if (owner) {
      failures.push(
        `${relativePath} imports ${name} from Ant Design; it belongs to ${owner} and nowhere else. `
          + "Reuse that surface, or make the case for a second owner in soleOwnerPrimitives.",
      );
      continue;
    }
    const control = controlledPrimitives.get(name);
    failures.push(control
      ? `${relativePath} imports ${name} from Ant Design directly; use ${control}.`
      : `${relativePath} imports ${name} from Ant Design, which no entry in antdImportAllowance permits. `
        + "Add the entry with the reason, or reach the primitive through a Control.");
  }

  for (const name of new Set(readAntdTypeImports(source))) {
    if (allowed.types.has(name)) {
      noteAllowanceUse(relativePath, "types", name);
      continue;
    }
    failures.push(
      `${relativePath} imports the Ant Design type ${name}, which no entry in antdImportAllowance permits. `
        + "A type costs a library swap what a value costs.",
    );
  }

  for (const importPath of new Set(readAntdDeepPaths(source))) {
    if (allowed.paths.has(importPath)) {
      noteAllowanceUse(relativePath, "paths", importPath);
      continue;
    }
    failures.push(
      `${relativePath} imports from ${importPath}, which no entry in antdImportAllowance permits. `
        + "A deep path reaches the same library by another door, and sometimes past its public exports.",
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

for (const [relativePath, entry] of antdImportAllowance) {
  const seen = allowanceSeen.get(relativePath) ?? { values: new Set(), types: new Set(), paths: new Set() };
  for (const [field, listed] of [
    ["values", entry.values ?? []],
    ["types", entry.types ?? []],
    ["paths", entry.paths ?? []],
  ]) {
    for (const name of listed) {
      if (seen[field].has(name)) continue;
      failures.push(
        `antdImportAllowance lets ${relativePath} import ${name}, which it no longer does. `
          + "Remove the entry rather than leaving a permission nobody rereads.",
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
    + `${antdImportAllowance.size} files allowed an Ant Design import outside ${controlDirectory}).`,
);
