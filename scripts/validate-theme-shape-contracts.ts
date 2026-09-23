import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  applyPhiControlShapeComponentTokens,
  buildPhiControlShapeCssVars,
  PHI_CONTROL_SHAPE_CSS_VARS,
  createPhiControlShapeCorners,
  readPhiControlShapeCorners,
  resolvePhiControlShape,
  resolvePhiControlShapeRadii,
  resolvePhiControlShapeRadius,
} from "../theme/phi-control-shape";

/**
 * The stored shape names its four corners. Absent means "follow the style block"; anything else that
 * is not four known names is a broken closed vocabulary and throws. Unequal corners are a valid record
 * that does not render yet, so they throw only where a shape is resolved for drawing.
 */
assert.equal(readPhiControlShapeCorners(undefined), null);
assert.deepEqual(readPhiControlShapeCorners(createPhiControlShapeCorners("pill")), createPhiControlShapeCorners("pill"));
assert.throws(() => readPhiControlShapeCorners("rounded"));
assert.throws(() => readPhiControlShapeCorners({ ...createPhiControlShapeCorners("pill"), topLeft: "adapter-radius" }));
assert.throws(() => readPhiControlShapeCorners({ ...createPhiControlShapeCorners("pill"), middle: "pill" }));
assert.equal(resolvePhiControlShape(createPhiControlShapeCorners("subtle")), "subtle");
assert.deepEqual(
  readPhiControlShapeCorners({ ...createPhiControlShapeCorners("rounded"), topRight: "square" })?.topRight,
  "square",
);
assert.throws(() => resolvePhiControlShape({ ...createPhiControlShapeCorners("rounded"), topRight: "square" }));
assert.throws(() => resolvePhiControlShape(undefined));
assert.equal(resolvePhiControlShapeRadius("square", { borderRadiusSM: 2, borderRadius: 8 }), 0);
assert.equal(resolvePhiControlShapeRadius("subtle", { borderRadiusSM: 2, borderRadius: 8 }), 2);
assert.equal(resolvePhiControlShapeRadius("rounded", { borderRadiusSM: 2, borderRadius: 8 }), 8);
assert.equal(resolvePhiControlShapeRadius("pill", { borderRadiusSM: 2, borderRadius: 8 }), 9999);

/**
 * A shape applies at every Control size (THEME.md, "Control shape"), so it is a scale and not a single
 * number. The authored scale below is deliberately irregular so a resolver that
 * silently reused one step would fail here.
 */
const AUTHORED_SCALE = { borderRadiusXS: 1, borderRadiusSM: 5, borderRadius: 8, borderRadiusLG: 13 };

assert.deepEqual(
  resolvePhiControlShapeRadii("rounded", AUTHORED_SCALE),
  { sm: 5, md: 8, lg: 13, innerSm: 1, innerMd: 5, innerLg: 8, grownSm: 5, grownMd: 8, grownLg: 13 },
  "`rounded` is the authored scale unchanged.",
);
assert.deepEqual(
  resolvePhiControlShapeRadii("subtle", AUTHORED_SCALE),
  { sm: 5, md: 5, lg: 8, innerSm: 1, innerMd: 1, innerLg: 5, grownSm: 5, grownMd: 5, grownLg: 8 },
  "`subtle` is the authored scale shifted one step toward the small end.",
);

/**
 * `square` and `pill` are absolute statements about geometry, so no size may soften them. This is the
 * defect the entry recorded: a small pill Button that renders at the small radius is simply wrong.
 *
 * A grown pill Control is the one slot the full radius does not reach, and it is asserted on its own
 * below: what it carries is the same capsule at a different number, not the same number softened.
 */
for (const [shape, radius] of [["square", 0], ["pill", 9999]] as const) {
  const radii = resolvePhiControlShapeRadii(shape, AUTHORED_SCALE);
  for (const [slot, value] of Object.entries(radii)) {
    if (shape === "pill" && slot.startsWith("grown")) {
      continue;
    }
    assert.equal(value, radius, `${shape} must reach ${slot}, not only the default size.`);
  }
}

/**
 * A Control whose height is not one Control line -- a Textarea, a multiple Select whose tags wrap, a
 * Mentions box -- keeps the capsule of ONE line instead of clamping to half of whatever it has grown
 * to, which on a tall box is an arc across the side rather than a capsule.
 *
 * The heights are deliberately odd, because the rounding is part of the statement: the browser clamps
 * anything at or above half the height to the capsule, so the spare half pixel is spent where it cannot
 * show and the custom property stays a whole number.
 */
const AUTHORED_HEIGHTS = { controlHeightSM: 21, controlHeight: 34, controlHeightLG: 55 };
const grownPill = resolvePhiControlShapeRadii("pill", { ...AUTHORED_SCALE, ...AUTHORED_HEIGHTS });
assert.deepEqual(
  [grownPill.grownSm, grownPill.grownMd, grownPill.grownLg],
  [11, 17, 28],
  "A grown pill Control carries half a Control line, rounded up -- never half of itself.",
);

// Every other shape is already a number rather than a limit, so growing cannot change what it means.
for (const shape of ["square", "subtle", "rounded"] as const) {
  const radii = resolvePhiControlShapeRadii(shape, { ...AUTHORED_SCALE, ...AUTHORED_HEIGHTS });
  assert.deepEqual(
    [radii.grownSm, radii.grownMd, radii.grownLg],
    [radii.sm, radii.md, radii.lg],
    `${shape} states a radius, so a grown Control renders the same one.`,
  );
}

// Relative shapes must keep a size scale rather than flatten it, or the Small and Large numbers an
// author types in the Style tab would be dead inputs for half the shapes.
for (const shape of ["rounded", "subtle"] as const) {
  const radii = resolvePhiControlShapeRadii(shape, AUTHORED_SCALE);
  assert.ok(radii.lg > radii.sm, `${shape} keeps a size scale.`);
  const authored = new Set(Object.values(AUTHORED_SCALE));
  for (const [slot, value] of Object.entries(radii)) {
    assert.ok(authored.has(value), `${shape}.${slot} must come from the authored scale, got ${value}.`);
  }
}

const cssVars = buildPhiControlShapeCssVars("pill", AUTHORED_SCALE);
assert.deepEqual(
  Object.keys(cssVars).sort(),
  Object.values(PHI_CONTROL_SHAPE_CSS_VARS).sort(),
  "Every declared slot is emitted.",
);
for (const value of Object.values(cssVars)) {
  assert.match(value, /^\d+px$/u, "Custom properties carry a resolved length, not a token reference.");
}
assert.ok(
  !Object.values(PHI_CONTROL_SHAPE_CSS_VARS).includes("--phi-control-radius-md" as never),
  "The default size stays on the component tokens; a CSS rule for it would outrank antd's own Button shapes.",
);
/**
 * Except for a grown Control, where the default size is exactly where the component token is wrong. The
 * reason the rule above exists does not reach it: no Button grows, and the selectors that read this
 * property name a Textarea, a multiple Select and a Mentions box.
 */
assert.ok(
  Object.values(PHI_CONTROL_SHAPE_CSS_VARS).includes("--phi-control-radius-grown-md" as never),
  "A grown Control needs the default size stated, because that is the size the component token misses.",
);

const components = applyPhiControlShapeComponentTokens(
  { Button: { borderRadius: 1 }, Table: { borderRadius: 13 } },
  "subtle",
  { borderRadiusSM: 3, borderRadius: 9 },
);
for (const key of ["Button", "Input", "InputNumber", "Select", "Segmented", "DatePicker", "ColorPicker", "Mentions"]) {
  assert.equal(components[key]?.borderRadius, 3, `${key} must consume the semantic Phi Control shape.`);
}
assert.equal(components.Table?.borderRadius, 13, "Container surface radius remains independent.");

/**
 * Cascader's own stylesheet contains nothing but the dropdown panel and its columns, so shaping its
 * component token would round a POPUP -- which THEME.md, "Control shape", leaves on the surface scale. Its
 * trigger renders as `.ant-select` and is already covered by the Select entry. AutoComplete, TimePicker,
 * and TreeSelect are inert for the same structural reason.
 */
for (const key of ["Cascader", "AutoComplete", "TimePicker", "TreeSelect"]) {
  assert.equal(
    components[key],
    undefined,
    `${key} must not be shaped: its component token draws the popup, not the Control body.`,
  );
}

/**
 * THEME.md, "Control shape": the semantic shape outranks a raw adapter-level component radius so there is one
 * effective source of truth. `Button` above carried a configured `borderRadius: 1` and still resolves
 * to the shape. Overriding a single corner is a Widget-level concern and never reaches here.
 */
assert.deepEqual(
  applyPhiControlShapeComponentTokens({ Button: { colorPrimary: "#fff" } }, "pill", { borderRadius: 8 }).Button,
  { colorPrimary: "#fff", borderRadius: 9999 },
  "Unrelated configured component tokens survive alongside the shape.",
);

const shapeStylesheetSource = await readFile(new URL("../styles/control-shape.css", import.meta.url), "utf8");
// The comments name the popup surfaces this file exists to avoid, so the selector assertions below read
// the rules only.
const shapeStylesheet = shapeStylesheetSource.replace(/\/\*[\s\S]*?\*\//gu, "");
for (const cssVar of Object.values(PHI_CONTROL_SHAPE_CSS_VARS)) {
  assert.ok(shapeStylesheet.includes(cssVar), `${cssVar} is emitted but never applied.`);
}
// Every custom property falls back to the adapter token it replaces, so a subtree that declares none of
// them -- a portal before the mirror runs, a consumer embedding a bare Control -- keeps antd's own scale.
for (const declaration of shapeStylesheet.matchAll(/var\(--phi-control-radius-[a-z-]+(?<fallback>[^)]*)/gu)) {
  assert.match(
    declaration.groups?.fallback ?? "",
    /^, var\(--ant-border-radius/u,
    "Each Control shape property falls back to the adapter radius it replaces.",
  );
}
// A single-class rule only ties with antd's own `:where(.<hash>).ant-x-sm`, and source order would
// decide the outcome. Each size class is therefore repeated.
for (const sizeClass of [
  "ant-btn-sm", "ant-btn-lg", "ant-input-sm", "ant-input-lg", "ant-select-sm", "ant-select-lg",
  "ant-picker-small", "ant-picker-large", "ant-input-number-sm", "ant-input-number-lg",
]) {
  assert.ok(
    shapeStylesheet.includes(`.${sizeClass}.${sizeClass}`),
    `.${sizeClass} must repeat its class to outrank antd.`,
  );
}
// Popup surfaces stay on the surface-radius scale. Reaching one from here is the exact failure the
// component-token route could not avoid, which is why this file exists.
for (const popupClass of ["dropdown", "ant-picker-panel", "ant-select-item", "ant-cascader-menu"]) {
  assert.ok(!shapeStylesheet.includes(popupClass), `${popupClass} is a popup surface and must not be shaped.`);
}

const configProviderSource = await readFile(
  new URL("../components/root/phi-config-provider.tsx", import.meta.url),
  "utf8",
);
assert.match(
  configProviderSource,
  /style=\{\{\s*\.\.\.rootStyle,\s*\.\.\.controlShapeVars/u,
  "The Root element declares the Control shape properties for the server-rendered tree.",
);
assert.match(
  configProviderSource,
  /document\.documentElement[\s\S]*?setProperty/u,
  "Portalled Modals, Drawers, and popups render outside the Root element and need the mirror.",
);

// The Builder preview has to resolve the shape the way the live render does, or the Style tab segments
// change the draft and nothing visible follows.
const previewSource = await readFile(
  new URL("../plugins/runtime-modules/theme/widgets/brand-controls/client.tsx", import.meta.url),
  "utf8",
);
assert.match(previewSource, /applyPhiControlShapeComponentTokens\(/u);
assert.match(
  previewSource,
  /components: previewShapedComponents/u,
  "The preview must render the shaped components.",
);
assert.match(
  previewSource,
  /key: createPhiAntdThemeCssVarKey\("builder-theme-preview", \{[\s\S]*?components: previewShapedComponents/u,
  "Two shapes with otherwise equal tokens must not hash to one CSS variable key.",
);
assert.equal(
  previewSource.match(/buildPhiControlShapeCssVars\(/gu)?.length,
  1,
  "The theme preview declares the shape properties; it is the one place the Style tab's shapes are seen.",
);

console.log("Theme Control shape contracts validated.");
