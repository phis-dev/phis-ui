import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildPhiCmsLayoutNamespacedTypeKey,
  resolvePhiCmsLayoutPluginKey,
  PHI_CMS_LAYOUT_REGISTRY,
  splitPhiCmsLayoutNamespacedTypeKey,
} from "../constants/cms-layout-types";
import {
  resolvePhiLayoutCreationPreset,
  resolvePhiLayoutDefaults,
} from "../helpers/cms-layout-defaults";
import {
  resolvePhiPaddingStyle,
  type PhiLayoutKind,
} from "../components/layouts/phi-layout-contract";
import { PhiCmsRegionStatic } from "../components/regions/phi-cms-region-static";
import { resolvePhiBuilderPreviewRegionConfig } from "../plugins/runtime-modules/builder/render-root-node-preview.server";
import { parsePhiCmsGridLayoutConfig } from "../types/cms-config";
import { resolvePhiGridSlotPlacement } from "../components/layouts/phi-grid-contract";
import { resolvePhiSlotChildSizing } from "../plugins/runtime/slot-size-policy";
import {
  normalizePhiBackgroundWidgetConfig,
  PHI_BACKGROUND_PARALLAX_DEFAULT_STRENGTH,
  resolvePhiBackgroundMotion,
  resolvePhiBackgroundWidgetStyle,
} from "../components/widgets/config/background";

const layoutKinds: readonly PhiLayoutKind[] = [
  "content",
  "form",
  "flex",
  "stack",
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
  "background",
  "border",
  "borderRadius",
  "shadow",
  "effect",
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
  config: { borderRadius: 12 },
  children: createElement("div", null, "content"),
};
const roundedRegionMarkup = renderToStaticMarkup(
  createElement(PhiCmsRegionStatic, roundedRegionProps),
);
assert.match(roundedRegionMarkup, /margin:0/);
assert.match(roundedRegionMarkup, /border-radius:12px/);

function EnhancedSlotChildProxy() {
  return null;
}

assert.deepEqual(
  resolvePhiSlotChildSizing(createElement(EnhancedSlotChildProxy, {
    slotChildSizing: {
      kind: "widget",
      slotSizePolicy: { inline: "fill", block: "intrinsic" },
      config: null,
    },
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
assert.deepEqual(
  resolvePhiBuilderPreviewRegionConfig({
    regionConfig: { effect: "none", padding: 8, paddingRight: 13 },
  }),
  {
    effect: "none",
    padding: 8,
    paddingRight: 13,
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
  effect: "glass",
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
  const { readdir, readFile } = await import("node:fs/promises");
  const presetsDirectory = new URL("../components/regions/presets/", import.meta.url);
  // The registry carries no layout kind, so the pairing is read from the definitions that declare both.
  const definitionsSource = await readFile(
    new URL("../components/layouts/layout-definitions.ts", import.meta.url),
    "utf8",
  );
  const layoutKindByTypeKey = new Map(
    [...definitionsSource.matchAll(/typeKey:\s*"([a-z-]+)",\s*\n\s*layoutKind:\s*"([a-z]+)"/gu)]
      .map((match) => [match[1]!, match[2]!] as const),
  );
  assert.ok(layoutKindByTypeKey.size >= 10, "The Layout definitions must expose their kind pairing.");
  const mismatches: string[] = [];
  for (const entry of await readdir(presetsDirectory)) {
    if (!entry.endsWith(".ts")) continue;
    const source = await readFile(new URL(entry, presetsDirectory), "utf8");
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

console.log(`Layout contracts valid: ${PHI_CMS_LAYOUT_REGISTRY.length} plugins, ${layoutKinds.length} families.`);
