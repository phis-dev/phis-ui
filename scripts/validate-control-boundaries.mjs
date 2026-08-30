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
  "components/forms/login-form.tsx",
  "components/forms/contact-form.tsx",
  "components/forms/registration-form.tsx",
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

function readAntdNamedImports(source) {
  const names = [];
  for (const match of source.matchAll(/import\s+(?:type\s+)?\{([\s\S]*?)\}\s*from\s*["']antd["']/gu)) {
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

if (failures.length > 0) {
  console.error(`Control boundary validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Control boundaries valid (${widgetControlRequirements.size} Widgets, ${directControlConsumers.length} direct consumers).`,
);
