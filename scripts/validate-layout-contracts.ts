import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildPhiCmsLayoutNamespacedTypeKey,
  PHI_CMS_LAYOUT_REGISTRY,
  splitPhiCmsLayoutNamespacedTypeKey,
} from "../constants/cms-layout-types";
import { resolvePhiCmsLayoutPluginKey } from "../constants/cms-layout-type-keys";
import {
  resolvePhiLayoutCreationPreset,
  resolvePhiLayoutDefaults,
} from "../helpers/cms-layout-defaults";
import {
  PHI_LAYOUT_SURFACE_RADIUS,
  resolvePhiLayoutAnchor,
  resolvePhiPaddingStyle,
  type PhiLayoutKind,
} from "../components/layouts/phi-layout-contract";
import { resolvePhiCmsBorderSource } from "../types/cms-border-source";
import { resolvePhiSourcedBorderStyle } from "../helpers/border-widget-style";
import { resolvePhiSurfaceStyle } from "../helpers/surface-style";
import { PhiCmsRegionStatic } from "../components/regions/phi-cms-region-static";
import { resolvePhiBuilderPreviewRegionConfig } from "../plugins/runtime-modules/builder/render-root-node-preview.server";
import { parsePhiCmsContentLayoutConfig, parsePhiCmsGridLayoutConfig } from "../types/cms-config";
import { resolvePhiGridSlotPlacement } from "../components/layouts/phi-grid-contract";
import { PHI_CORE_LAYOUT_KIND_BY_TYPE_KEY } from "../components/layouts/layout-definitions";
import { listPhiPresetTreeFiles } from "./preset-tree-files";
import {
  resolvePhiSlotChildSizing,
  resolvePhiSlotChildSizingForConfig,
} from "../plugins/runtime/slot-size-policy";
import {
  normalizePhiBackgroundWidgetConfig,
  PHI_BACKGROUND_PARALLAX_DEFAULT_STRENGTH,
  resolvePhiBackgroundMotion,
  resolvePhiBackgroundWidgetStyle,
} from "../components/widgets/config/background";

const layoutKinds: readonly PhiLayoutKind[] = [
  "content",
  "flex",
  "stack",
  "carousel",
  "grid",
  "split",
  "threecol",
  "masonry",
  "verticalflex",
  "collapsible",
];
const chromeKeys = [
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "surface",
] as const;

for (const entry of PHI_CMS_LAYOUT_REGISTRY) {
  assert.equal(
    entry.namespacedTypeKey,
    buildPhiCmsLayoutNamespacedTypeKey(entry.pluginKey, entry.typeKey),
  );
  assert.deepEqual(splitPhiCmsLayoutNamespacedTypeKey(entry.namespacedTypeKey), {
    pluginKey: entry.pluginKey,
    typeKey: entry.typeKey,
  });
}

assert.deepEqual(
  splitPhiCmsLayoutNamespacedTypeKey(`${resolvePhiCmsLayoutPluginKey("content")}/content`),
  { pluginKey: resolvePhiCmsLayoutPluginKey("content"), typeKey: "content" },
);
/*
 * A Layout states its geometry in `size`, and a flat `width` is not a second way to say it.
 *
 * The parser used to fall back to `config.width` when `size` was absent, which gave a Module two
 * spellings for one thing. The flat ones are what a block becomes on its way to CSS; a config
 * carrying them says nothing, and this is what makes that silence a rule rather than an accident.
 */
assert.equal(
  parsePhiCmsContentLayoutConfig({ width: 400, height: 200, maxWidth: 600 }).size,
  undefined,
  "A Layout config must not take geometry from flat width/height; `size` is the only spelling read.",
);
/*
 * The anchor survives parsing as the block anchor. Folded into a placement name it was lost on the
 * way to the renderer, which asks the value for its `horizontal` and, finding none, centres.
 */
assert.deepEqual(
  resolvePhiLayoutAnchor(
    parsePhiCmsContentLayoutConfig({ anchor: { horizontal: "left", vertical: "middle" } }).anchor,
    { horizontal: "center", vertical: "middle" },
  ),
  "left",
  "A Content Layout anchored left must resolve to the left placement after parsing.",
);

assert.deepEqual(
  parsePhiCmsContentLayoutConfig({ size: { width: 400 } }).size,
  { width: 400, height: undefined },
  "A Layout config states geometry as `size`.",
);

const responsiveGridConfig = parsePhiCmsGridLayoutConfig({
  slotPlacements: [{
    slotIndex: 1,
    span: { compact: 24, medium: 16 },
    offset: { compact: 0, medium: 8 },
  }],
});
assert.deepEqual(
  resolvePhiGridSlotPlacement(responsiveGridConfig.slotPlacements, 1, "wide", 6),
  { span: 16, offset: 8 },
  "wide Grid placement must cascade from the nearest narrower container profile.",
);
assert.throws(
  () => parsePhiCmsGridLayoutConfig({
    slotPlacements: [{ slotIndex: 0, span: { compact: 20 }, offset: { compact: 5 } }],
  }),
  /offset plus span exceeds 24/,
);
assert.deepEqual(
  resolvePhiPaddingStyle({ padding: 8, paddingRight: "var(--ant-padding)" }),
  {
    paddingTop: "8px",
    paddingRight: "var(--ant-padding)",
    paddingBottom: "8px",
    paddingLeft: "8px",
  },
);
const paddedRegionProps = {
  regionKey: "content" as const,
  config: { padding: 8, paddingRight: 13 },
  children: createElement("div", null, "content"),
};
const paddedRegionMarkup = renderToStaticMarkup(
  createElement(PhiCmsRegionStatic, paddedRegionProps),
);
assert.match(
  paddedRegionMarkup,
  /class="phi-cms-region-shell__content" style="padding-top:8px;padding-right:13px;padding-bottom:8px;padding-left:8px"/,
);
const roundedRegionProps = {
  regionKey: "content" as const,
  config: { surface: { borderSource: "custom" as const, border: { borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomRightRadius: 12, borderBottomLeftRadius: 12 } } },
  children: createElement("div", null, "content"),
};
const roundedRegionMarkup = renderToStaticMarkup(
  createElement(PhiCmsRegionStatic, roundedRegionProps),
);
assert.match(roundedRegionMarkup, /margin:0/);
assert.match(roundedRegionMarkup, /border-top-left-radius:12px/);

function EnhancedSlotChildProxy() {
  return null;
}

assert.deepEqual(
  resolvePhiSlotChildSizing(createElement(EnhancedSlotChildProxy, {
    slotChildSizing: resolvePhiSlotChildSizingForConfig(
      "widget",
      { inline: "fill", block: "intrinsic" },
      null,
    ),
  })),
  {
    policy: { inline: "fill", block: "intrinsic" },
    explicitInlineSize: false,
    explicitBlockSize: false,
    minInlineSize: undefined,
    minBlockSize: undefined,
    maxInlineSize: undefined,
    maxBlockSize: undefined,
  },
  "Client-enhanced slot children must preserve their sizing policy for parent layouts.",
);

/*
 * The sizing a client-enhanced slot child sends is values, not the block config it came from.
 *
 * Sending the config meant the same object sat in two places of one element's props, which React
 * serializes as a reference back into the element being built and fills in after the fact. Element props
 * are frozen by then in development, and the write that follows can throw.
 *
 * The policy comes back `fixed` on the inline axis although the slot asked for `fill-inline`, and that
 * is the answer rather than a contradiction: a stated width is what the child measures, so the axis
 * that states one no longer claims to fill. The alternative left every reader to subtract the size from
 * the policy, and the readers that forgot were the bug. A maximum is deliberately not a size -- a
 * column capped at a readable measure still fills up to the cap -- which is why `maxBlockSize` sits
 * here beside a block axis that stays `intrinsic`. The constraints arrive as CSS lengths, decoded by the
 * geometry resolver: the bare `120` the config stores is a pixel length, and it says so here.
 */
assert.deepEqual(
  resolvePhiSlotChildSizingForConfig("widget", "fill-inline", {
    size: { width: 240 },
    minSize: { width: 120, height: 40 },
    maxSize: { height: "50vh" },
  }),
  {
    policy: { inline: "fixed", block: "intrinsic" },
    explicitInlineSize: true,
    explicitBlockSize: false,
    minInlineSize: "120px",
    minBlockSize: "40px",
    maxInlineSize: undefined,
    maxBlockSize: "50vh",
  },
  "Client-enhanced slot child sizing must be resolved to plain values before it is serialized.",
);
assert.deepEqual(
  resolvePhiBuilderPreviewRegionConfig({
    regionConfig: { padding: 8, paddingRight: 13 },
    surface: { shadow: "soft" },
  }),
  {
    padding: 8,
    paddingRight: 13,
    surface: { shadow: "soft" },
  },
);
const parallaxBackground = normalizePhiBackgroundWidgetConfig({
  base: {
    kind: "image",
    sourceKind: "url",
    sourceUrl: "/hero.jpg",
    attachment: "local",
  },
  motion: { mode: "parallax", strength: 2, direction: "reverse" },
  filter: "glass",
});
assert.deepEqual(parallaxBackground.motion, {
  mode: "parallax",
  strength: 1,
  direction: "reverse",
  // Every Background authored before `travel` existed means a rate, so that is what an absent field is.
  travel: "rate",
});
assert.deepEqual(
  normalizePhiBackgroundWidgetConfig({
    base: { kind: "image", sourceKind: "url", sourceUrl: "/hero.jpg" },
    motion: { mode: "parallax", travel: "range" },
  }).motion,
  { mode: "parallax", strength: 1, direction: "natural", travel: "range" },
  "An authored travel mode must survive parsing, and bring the default its strength means with it.",
);
assert.equal(
  normalizePhiBackgroundWidgetConfig({
    base: { kind: "image", sourceKind: "url", sourceUrl: "/hero.jpg" },
    motion: { mode: "parallax" },
  }).motion?.strength,
  PHI_BACKGROUND_PARALLAX_DEFAULT_STRENGTH,
  "A rate default must stay what it always was; the travel field may not move it.",
);
assert.equal(
  normalizePhiBackgroundWidgetConfig({
    base: { kind: "image", sourceKind: "url", sourceUrl: "/hero.jpg" },
    motion: { mode: "parallax", travel: "fitted" },
  }).motion?.travel,
  "rate",
  "An unknown travel mode must fall back to the rate the Background was authored under.",
);
assert.equal("attachment" in parallaxBackground.base, false, "legacy image attachment must not survive v1 parsing.");
assert.deepEqual(resolvePhiBackgroundMotion(parallaxBackground), parallaxBackground.motion);
assert.equal(resolvePhiBackgroundWidgetStyle(parallaxBackground).backgroundAttachment, undefined);
assert.equal(
  normalizePhiBackgroundWidgetConfig({
    base: { kind: "color", color: "#fff" },
    motion: { mode: "parallax", strength: 0.5 },
  }).motion,
  null,
  "Background motion is valid only for an image owned by the same Background config.",
);

for (const layoutKind of layoutKinds) {
  const defaults = resolvePhiLayoutDefaults(layoutKind);
  for (const key of chromeKeys) {
    assert.equal(defaults[key], undefined, `${layoutKind}.${key} must be visually neutral.`);
  }

  const creationConfig = resolvePhiLayoutCreationPreset(layoutKind, "panel");
  assert.equal("creationPreset" in creationConfig, false);
}

/**
 * A creation preset must name the Layout's OWN kind.
 *
 * The presets carry per-side padding where the axis demands it -- the horizontal Flex panel sets
 * `paddingTop: 0` and `paddingBottom: 0`, which is right for a row of controls and wrong for a column --
 * and those per-side values outrank a scalar `padding` on the node. A node that names another kind
 * therefore inherits chrome built for a different axis, silently: the Signal wiring body asked for
 * padding on all four sides and rendered with padding on two.
 */
{
  const { readFile } = await import("node:fs/promises");
  // A family belongs to Core's own Layouts, not to the Layout contract, so the pairing is Core's table.
  const layoutKindByTypeKey = new Map(Object.entries(PHI_CORE_LAYOUT_KIND_BY_TYPE_KEY));
  const mismatches: string[] = [];
  for (const file of listPhiPresetTreeFiles(fileURLToPath(new URL("..", import.meta.url)))) {
    const entry = path.relative(fileURLToPath(new URL("..", import.meta.url)), file);
    const source = await readFile(file, "utf8");
    for (const block of source.matchAll(/buildPhiCmsLayoutNode\(\{([\s\S]*?)\n\s*\}\)/gu)) {
      const body = block[1] ?? "";
      const declaredKind = body.match(/creationPreset:\s*\{\s*layoutKind:\s*"([a-z]+)"/u)?.[1];
      const typeKey = body.match(/\n\s*typeKey:\s*"([a-z-]+)"/u)?.[1];
      if (!declaredKind || !typeKey) continue;
      const expected = layoutKindByTypeKey.get(typeKey);
      if (expected && expected !== declaredKind) {
        mismatches.push(`${entry}: typeKey "${typeKey}" is a "${expected}" Layout but its creation preset names "${declaredKind}".`);
      }
    }
  }
  assert.deepEqual(mismatches, [], mismatches.join("\n"));
}

/**
 * LAYOUTING.md, "Where a Layout's outline comes from": a Layout that predates `borderSource` is read by
 * one rule, and the rule turns on the LINE.
 *
 * A radius alone is not a line. Reading it as one would answer `custom` for every Layout whose corners
 * were ever set -- and `custom` is the single state in which a corner stops following the Site's shape,
 * so the mistake would be invisible in the code and visible on every page.
 */
assert.equal(resolvePhiCmsBorderSource(undefined, null), "none", "Nothing configured means no line.");
assert.equal(
  resolvePhiCmsBorderSource(undefined, { borderTopLeftRadius: 24 }),
  "none",
  "A corner radius is not a border: a Layout that only rounded itself never drew a line.",
);
assert.equal(
  resolvePhiCmsBorderSource(undefined, { borderWidth: 1, borderStyle: "solid" }),
  "custom",
  "A configured line means the author drew one, which is what `custom` says.",
);
assert.equal(
  resolvePhiCmsBorderSource(undefined, "none"),
  "none",
  "A border written as the string `none` is an absence, not a line.",
);
assert.equal(
  resolvePhiCmsBorderSource("theme", { borderWidth: 4 }),
  "theme",
  "A stated source always wins: the reading rule only answers where nothing was stated.",
);

/*
 * And the corner follows the source. `custom` is the one source that reads a configured radius, so
 * switching away from it has to show the shape at once rather than keeping the radii of a line nobody
 * draws any more.
 */
const configuredCorner = { borderWidth: 1, borderStyle: "solid" as const, borderColor: "red", borderTopLeftRadius: 30 };
const layoutCorner = { cornerFallback: PHI_LAYOUT_SURFACE_RADIUS };
assert.equal(
  resolvePhiSurfaceStyle({ borderSource: "custom", border: configuredCorner }, layoutCorner).style.borderTopLeftRadius,
  30,
  "A custom outline keeps the corner it configured.",
);
assert.equal(
  resolvePhiSurfaceStyle({ borderSource: "theme", border: configuredCorner }, layoutCorner).style.borderTopLeftRadius,
  PHI_LAYOUT_SURFACE_RADIUS,
  "Under `theme` the corner comes from the shape, so no configured radius may survive.",
);
assert.equal(
  resolvePhiSurfaceStyle({ borderSource: "theme" }, layoutCorner).style.borderRadius,
  undefined,
  "A Surface states its corner as longhands only, so a configured longhand never meets a shorthand.",
);
assert.equal(
  resolvePhiSourcedBorderStyle("none", { borderWidth: 2, borderTopLeftRadius: 30 }).border,
  "none",
  "`none` states the absence, because this style is laid over one that may already carry a line.",
);
assert.equal(
  resolvePhiSourcedBorderStyle("theme", { borderTopLeftRadius: 30 }).borderTopLeftRadius,
  undefined,
  "Neither does a per-corner radius survive a source that is not `custom`.",
);

console.log(`Layout contracts valid: ${PHI_CMS_LAYOUT_REGISTRY.length} plugins, ${layoutKinds.length} families.`);
