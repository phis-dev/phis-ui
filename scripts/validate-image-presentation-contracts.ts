import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  PhiImageAssetVariantKey,
  buildPhiMediaAssetContentDeliveryUrl,
  resolvePhiImageAssetVariantSpec,
} from "../constants/media";
import {
  resolveFocalRectCoverCropBox,
  type MediaFocalRect,
} from "../components/media/focal-rect";
import {
  resolvePhiImagePresentation,
  stripPhiResolvedAssetProjections,
  type PhiImagePresentationInput,
} from "../components/media/image-presentation";
import {
  normalizePhiBackgroundWidgetConfig,
  resolvePhiBackgroundWidgetStyle,
  serializePhiBackgroundBaseCss,
} from "../components/widgets/config/background";

/**
 * The contract these assertions defend: an original Asset and a generated variant are DIFFERENT
 * presentation inputs. The original is raw material that Authoring frames; a generated variant is a
 * finished server crop that must be shown as delivered. Every surface that draws an image has to
 * make that distinction the same way, which is why `resolvePhiImagePresentation` owns it alone.
 */

const readSource = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const ASSET_ID = 4711;
const ORIGINAL_URL = "/api/site/media/4711/content";
const FOCAL_TOP_LEFT: MediaFocalRect = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };

const assetSource = (
  overrides: Partial<PhiImagePresentationInput> = {},
): PhiImagePresentationInput => ({
  sourceKind: "asset",
  assetId: ASSET_ID,
  originalUrl: ORIGINAL_URL,
  sourceWidth: 2000,
  sourceHeight: 1000,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

assert.equal(
  resolvePhiImagePresentation(assetSource()).kind,
  "original",
  "An Asset without a variant key delivers the original bytes.",
);
assert.equal(
  resolvePhiImagePresentation(assetSource({ variantKey: PhiImageAssetVariantKey.Card })).kind,
  "generated-variant",
  "A configured variant key means the server produced the bytes.",
);
assert.equal(
  resolvePhiImagePresentation({ sourceKind: "url", sourceUrl: "https://example.test/a.png" }).kind,
  "original",
  "A foreign URL is never a generated variant.",
);
// An unknown key is not a variant. Rendering the original beats rendering a 404.
assert.equal(
  resolvePhiImagePresentation(assetSource({ variantKey: 9999 })).kind,
  "original",
);
assert.equal(resolvePhiImagePresentation(assetSource({ variantKey: 9999 })).url, ORIGINAL_URL);

// ---------------------------------------------------------------------------
// The original consumes authoring intent and the focal rectangle
// ---------------------------------------------------------------------------

{
  const configured = resolvePhiImagePresentation(
    assetSource({ fit: "contain", objectPosition: "top left", focalRect: FOCAL_TOP_LEFT }),
  );
  assert.equal(configured.fit, "contain", "The original uses the configured fit.");
  assert.equal(
    configured.objectPosition,
    "top left",
    "An explicit position outranks the focal rectangle on the original.",
  );
}

{
  // No explicit position: the focal rectangle supplies the automatic one, expressed as its center.
  const automatic = resolvePhiImagePresentation(assetSource({ focalRect: FOCAL_TOP_LEFT }));
  assert.equal(automatic.objectPosition, "20% 20%");
  assert.equal(automatic.fit, "cover", "Cover is the default framing for an original.");
}

assert.equal(
  resolvePhiImagePresentation(assetSource()).objectPosition,
  "center",
  "Without a focal rectangle the original stays centered.",
);

assert.equal(
  resolvePhiImagePresentation(assetSource({ focalRect: { x: 0.1, y: 0.1 } })).objectPosition,
  "center",
  "An incomplete focal rectangle is no rectangle at all.",
);

// ---------------------------------------------------------------------------
// A generated variant is a completed server crop
// ---------------------------------------------------------------------------

for (const variantKey of [
  PhiImageAssetVariantKey.Card,
  PhiImageAssetVariantKey.Hero,
  PhiImageAssetVariantKey.Banner,
  PhiImageAssetVariantKey.Thumbnail,
  PhiImageAssetVariantKey.Avatar,
  PhiImageAssetVariantKey.Landscape,
  PhiImageAssetVariantKey.Portrait,
]) {
  const spec = resolvePhiImageAssetVariantSpec(variantKey)!;
  assert.equal(spec.fit, "cover", "This block covers the cropping variants.");

  const presentation = resolvePhiImagePresentation(
    assetSource({
      variantKey,
      // Everything the original would consume is present and must be ignored.
      focalRect: FOCAL_TOP_LEFT,
      objectPosition: "top left",
      fit: "contain",
    }),
  );
  assert.equal(presentation.kind, "generated-variant");
  assert.equal(
    presentation.objectPosition,
    "center",
    "The server already consumed the focal rectangle; applying it again would shift a framed image.",
  );
  assert.equal(
    presentation.fit,
    "cover",
    "The variant spec decides the framing, never the Widget config.",
  );
  assert.notEqual(presentation.fit, "fill", "A generated variant is never stretched.");
  assert.equal(presentation.width, spec.width);
  assert.equal(presentation.height, spec.height);
  assert.equal(
    presentation.simulatedCropStyle,
    null,
    "A saved variant is delivered, not simulated.",
  );
}

{
  // `contain` variants do not crop, so they have no focal rectangle to consume either.
  const spec = resolvePhiImageAssetVariantSpec(PhiImageAssetVariantKey.Logo)!;
  assert.equal(spec.fit, "contain");
  const presentation = resolvePhiImagePresentation(
    assetSource({ variantKey: PhiImageAssetVariantKey.Logo, focalRect: FOCAL_TOP_LEFT }),
  );
  assert.equal(presentation.fit, "contain");
  assert.equal(presentation.objectPosition, "center");
}

// ---------------------------------------------------------------------------
// Delivery URL and invalidation after a focal change
// ---------------------------------------------------------------------------

{
  const before = resolvePhiImagePresentation(
    assetSource({ variantKey: PhiImageAssetVariantKey.Card, variantVersion: 3, deliveryRevision: 7 }),
  );
  assert.equal(before.url, `/api/site/media/${ASSET_ID}/variants/${PhiImageAssetVariantKey.Card}?v=3&r=7`);

  // A focal change invalidates the generated variants. The delivered bytes are always the newest;
  // the revision only has to make the URL differ so a cached response cannot win.
  const after = resolvePhiImagePresentation(
    assetSource({ variantKey: PhiImageAssetVariantKey.Card, variantVersion: 3, deliveryRevision: 8 }),
  );
  assert.notEqual(after.url, before.url, "A new delivery revision must produce a new URL.");
}

assert.equal(
  resolvePhiImagePresentation(assetSource({ variantKey: PhiImageAssetVariantKey.Card })).url,
  `/api/site/media/${ASSET_ID}/variants/${PhiImageAssetVariantKey.Card}?v=0`,
  "Without a revision the URL stays clean rather than carrying a placeholder.",
);

assert.equal(
  resolvePhiImagePresentation({
    sourceKind: "asset",
    assetId: ASSET_ID,
    variantKey: PhiImageAssetVariantKey.Card,
    originalUrl: null,
  }).url,
  null,
  "An unresolved Asset renders nothing; a variant URL must not be invented from an id alone.",
);

assert.equal(
  resolvePhiImagePresentation({ sourceKind: "url", sourceUrl: "  " }).url,
  null,
  "A blank source URL is no source.",
);

// ---------------------------------------------------------------------------
// The unsaved focal edit is the only place Authoring may crop locally
// ---------------------------------------------------------------------------

{
  const spec = resolvePhiImageAssetVariantSpec(PhiImageAssetVariantKey.Card)!;
  const simulated = resolvePhiImagePresentation(
    assetSource({
      variantKey: PhiImageAssetVariantKey.Card,
      variantVersion: 3,
      deliveryRevision: 7,
      focalRect: FOCAL_TOP_LEFT,
      simulateVariantCrop: true,
    }),
  );

  assert.equal(
    simulated.kind,
    "original",
    "Simulating draws the original: the stored variant still shows the previous framing.",
  );
  assert.equal(simulated.url, ORIGINAL_URL);
  assert.equal(simulated.width, spec.width, "The box stays the variant box while the content is simulated.");
  assert.equal(simulated.height, spec.height);
  assert.ok(simulated.simulatedCropStyle, "The simulation needs the crop style.");

  // The simulated placement must reproduce the crop the server would compute, not approximate it.
  const cropBox = resolveFocalRectCoverCropBox(2000, 1000, spec.width, spec.height, FOCAL_TOP_LEFT);
  assert.deepEqual(simulated.simulatedCropStyle, {
    position: "absolute",
    left: `${(-cropBox.left / cropBox.width) * 100}%`,
    top: `${(-cropBox.top / cropBox.height) * 100}%`,
    width: `${(2000 / cropBox.width) * 100}%`,
    height: `${(1000 / cropBox.height) * 100}%`,
    maxWidth: "none",
    maxHeight: "none",
  });

  // After the save the flag is gone and the invalidated variant plus its revision take over.
  const saved = resolvePhiImagePresentation(
    assetSource({
      variantKey: PhiImageAssetVariantKey.Card,
      variantVersion: 3,
      deliveryRevision: 8,
      focalRect: FOCAL_TOP_LEFT,
    }),
  );
  assert.equal(saved.kind, "generated-variant");
  assert.equal(saved.simulatedCropStyle, null);
  assert.equal(saved.objectPosition, "center");
  assert.equal(saved.url, `/api/site/media/${ASSET_ID}/variants/${PhiImageAssetVariantKey.Card}?v=3&r=8`);
}

{
  // A `contain` variant letterboxes the whole image, so there is no crop to reproduce. Simulating one
  // anyway would show a cropped preview of a variant that will never be cropped.
  const spec = resolvePhiImageAssetVariantSpec(PhiImageAssetVariantKey.Logo)!;
  assert.equal(spec.fit, "contain");
  const simulated = resolvePhiImagePresentation(
    assetSource({
      variantKey: PhiImageAssetVariantKey.Logo,
      focalRect: FOCAL_TOP_LEFT,
      simulateVariantCrop: true,
    }),
  );
  assert.equal(simulated.kind, "original");
  assert.equal(simulated.url, ORIGINAL_URL);
  assert.equal(simulated.simulatedCropStyle, null, "A `contain` variant has no crop to reproduce.");
  assert.equal(simulated.fit, "contain", "The simulation answers to the variant's fit, not the authored one.");
  assert.equal(simulated.objectPosition, "center", "Letterboxing has no focal point to steer.");
}

assert.equal(
  resolvePhiImagePresentation(assetSource({ simulateVariantCrop: true })).simulatedCropStyle,
  null,
  "Without a variant there is no server crop to simulate.",
);
assert.equal(
  resolvePhiImagePresentation(
    assetSource({
      variantKey: PhiImageAssetVariantKey.Card,
      simulateVariantCrop: true,
      sourceWidth: null,
      sourceHeight: null,
    }),
  ).simulatedCropStyle,
  null,
  "An unknown original size cannot be cropped; the simulation drops out instead of guessing.",
);

// ---------------------------------------------------------------------------
// Presentation box
// ---------------------------------------------------------------------------

assert.equal(resolvePhiImagePresentation(assetSource()).width, 2000);
assert.equal(resolvePhiImagePresentation(assetSource()).height, 1000);
assert.deepEqual(
  [
    resolvePhiImagePresentation(assetSource({ variantKey: PhiImageAssetVariantKey.Hero })).width,
    resolvePhiImagePresentation(assetSource({ variantKey: PhiImageAssetVariantKey.Hero })).height,
  ],
  [1600, 900],
  "A variant box comes from its spec, never from the original's intrinsic size.",
);

// ---------------------------------------------------------------------------
// Background bases resolve through the same rules
// ---------------------------------------------------------------------------

/**
 * A Background binds an Asset by id. Delivery facts arrive as a render-time projection -- from the
 * bulk server resolver on a live page, from the Picker in the Builder -- never as stored config.
 */
const backgroundBase = (overrides: Record<string, unknown>) => ({
  base: {
    kind: "image",
    sourceKind: "asset",
    assetId: ASSET_ID,
    size: "cover",
    repeat: "no-repeat",
    ...overrides,
  },
});

const projection = (overrides: Record<string, unknown> = {}) => ({
  deliveryUrl: ORIGINAL_URL,
  deliveryRevision: 5,
  variantVersion: 2,
  focalRect: FOCAL_TOP_LEFT,
  width: 2000,
  height: 1000,
  ...overrides,
});

{
  const style = resolvePhiBackgroundWidgetStyle(
    backgroundBase({ variantKey: PhiImageAssetVariantKey.Hero, resolvedAsset: projection() }),
  );
  assert.equal(
    style.backgroundPosition,
    "center",
    "A Background drawing a generated variant must not re-apply the focal rectangle.",
  );
  assert.equal(
    style.backgroundImage,
    `url("/api/site/media/${ASSET_ID}/variants/${PhiImageAssetVariantKey.Hero}?v=2&r=5")`,
  );
  assert.equal(style.backgroundSize, "cover", "Centered cover overflow, never a stretch.");
}

{
  // The original keeps the automatic focal position: it is raw material, not a finished crop.
  const style = resolvePhiBackgroundWidgetStyle(backgroundBase({ resolvedAsset: projection() }));
  assert.equal(style.backgroundPosition, "20% 20%");
  assert.equal(style.backgroundImage, `url("${buildPhiMediaAssetContentDeliveryUrl(ASSET_ID)}")`);
}

assert.equal(
  resolvePhiBackgroundWidgetStyle(backgroundBase({ resolvedAsset: projection(), position: "top left" }))
    .backgroundPosition,
  "top left",
  "An authored position outranks the focal rectangle on an original Background.",
);

assert.equal(
  resolvePhiBackgroundWidgetStyle(
    backgroundBase({ variantKey: PhiImageAssetVariantKey.Hero, position: "top left" }),
  ).backgroundPosition,
  "center",
  "A position override cannot re-frame a finished server crop either.",
);

// The serialized CSS shorthand and the style object must agree; the Background control previews one
// and the runtime renders the other.
{
  const config = backgroundBase({
    variantKey: PhiImageAssetVariantKey.Hero,
    resolvedAsset: projection(),
  });
  const normalized = normalizePhiBackgroundWidgetConfig(config);
  const style = resolvePhiBackgroundWidgetStyle(config);
  assert.equal(
    serializePhiBackgroundBaseCss(normalized.base),
    `${style.backgroundImage} ${style.backgroundPosition} / ${style.backgroundSize} ${style.backgroundRepeat}`,
  );
}

// Normalization folds the projected focal rectangle into `focalRect`, so Background motion and the
// static style read one field instead of two.
{
  const normalized = normalizePhiBackgroundWidgetConfig(
    backgroundBase({ resolvedAsset: projection() }),
  );
  assert.equal(normalized.base.kind, "image");
  assert.deepEqual(
    normalized.base.kind === "image" ? normalized.base.focalRect : null,
    FOCAL_TOP_LEFT,
  );
  assert.equal(
    normalized.base.kind === "image" ? normalized.base.resolvedAsset?.deliveryRevision : null,
    5,
  );
}

// Content persisted before the projection existed keeps working: its own focal rectangle still reads.
assert.equal(
  resolvePhiBackgroundWidgetStyle(backgroundBase({ focalRect: FOCAL_TOP_LEFT })).backgroundPosition,
  "20% 20%",
);

// ---------------------------------------------------------------------------
// The projection is render-time only and never reaches stored content
// ---------------------------------------------------------------------------

{
  const draft = {
    backgroundConfig: backgroundBase({ resolvedAsset: projection() }),
    slots: [{ slotBackground: backgroundBase({ resolvedAsset: projection() }) }],
    rootNodeBackground: backgroundBase({ resolvedAsset: projection() }),
  };
  const stripped = stripPhiResolvedAssetProjections(draft);
  assert.doesNotMatch(
    JSON.stringify(stripped),
    /resolvedAsset/u,
    "A delivery revision in stored content would go stale on the next focal edit.",
  );
  // Everything else survives: stripping is not a rewrite.
  assert.equal(stripped.backgroundConfig.base.assetId, ASSET_ID);
  assert.equal(stripped.slots[0].slotBackground.base.kind, "image");
  assert.equal(stripped.rootNodeBackground.base.repeat, "no-repeat");
}

{
  // The Builder strips through the same helper on both persistence paths.
  const persistence = await readSource("plugins/runtime-modules/builder/persistence.ts");
  assert.match(persistence, /stripPhiResolvedAssetProjections/u);
  const regionHydration = await readSource("plugins/runtime-modules/builder/region-hydration.ts");
  assert.match(
    regionHydration,
    /base\.backgroundConfig = stripPhiResolvedAssetProjections\(/u,
    "The Region Background is serialized separately and needs its own strip.",
  );
}

{
  /**
   * Builder drafts are built server-side too, and they used to reach the hydration helper directly at
   * nine call sites -- one of which is all it takes for the Editor to request a variant without the
   * delivery revision and cache a crop independently of Live. Every path now goes through one choke
   * point, so neither preset builder may name the raw helper.
   */
  const chokePoint = await readSource("plugins/runtime-modules/builder/draft-background-assets.server.ts");
  assert.match(chokePoint, /buildPhiDeveloperBuilderRegionDraftsFromTree/u);
  assert.match(chokePoint, /resolvePhiBackgroundAssetProjection/u);
  for (const path of [
    "plugins/runtime-modules/builder/area-shell-presets.server.ts",
    "plugins/runtime-modules/builder/page-presets.server.ts",
  ]) {
    const source = await readSource(path);
    assert.match(source, /buildPhiProjectedBuilderRegionDrafts/u, path);
    assert.doesNotMatch(
      source,
      /buildPhiDeveloperBuilderRegionDraftsFromTree/u,
      `${path} must build drafts through the projecting choke point.`,
    );
  }
}

{
  const resolver = await readSource(
    "components/widgets/helpers/background-reference-resolver.server.ts",
  );
  assert.match(resolver, /resolveSiteInternalReferences/u);
  assert.match(resolver, /"server-only"/u);

  /**
   * Both loaders have to project, and a browser check is what proved it: the page request resolves
   * the Page tree, while the shell Header, Hero, and Footer Backgrounds come from the separately
   * composed Area preset in `cms-root`. Projecting only the first left every Background a visitor
   * actually sees without its delivery revision.
   */
  for (const path of ["server-helpers/cms-request.ts", "server-helpers/cms-root.ts"]) {
    const source = await readSource(path);
    assert.match(source, /resolvePhiBackgroundAssetProjection/u, path);
    assert.match(source, /applyPhiBackgroundAssetProjection/u, path);
  }
}

// ---------------------------------------------------------------------------
// No surface keeps a second framing rule
// ---------------------------------------------------------------------------

for (const path of [
  "plugins/runtime-modules/core/widgets/image/client.tsx",
  "plugins/runtime-modules/core/widgets/card/server.tsx",
  "components/widgets/client/card-editor.tsx",
  "components/widgets/config/background.ts",
]) {
  const source = await readSource(path);
  assert.match(
    source,
    /resolvePhiImagePresentation/u,
    `${path} must route its image decision through the shared resolver.`,
  );
  assert.doesNotMatch(
    source,
    /buildPhiImageAssetVariantDeliveryUrl/u,
    `${path} must not build a variant URL beside the resolver.`,
  );
  assert.doesNotMatch(
    source,
    /resolveFocalRectObjectPosition|resolveFocalRectCoverImageStyle/u,
    `${path} must not derive a focal placement of its own.`,
  );
}

{
  // The Card cover previously hard-coded `objectFit: "cover"` and no position at all, which framed a
  // `contain` variant wrongly and discarded the original's focal rectangle.
  const cardBody = await readSource("plugins/runtime-modules/core/widgets/card/client.tsx");
  assert.match(cardBody, /objectFit: config\.imageFit \?\? "cover"/u);
  assert.match(cardBody, /objectPosition: config\.imagePosition \?\? "center"/u);
}

{
  // Motion draws the original on purpose: a variant is already reduced to the visible crop and
  // leaves the effect nothing to reveal. That is a deliberate opt-out, not a missing rewiring.
  const motion = await readSource("components/cms/clients/phi-background-motion-layer-client.tsx");
  assert.match(motion, /variantKey: null, variantVersion: null/u);

  /*
   * A Region comes to rest by sticking an ANCESTOR of the motion host, never the host itself. Deriving
   * the anchored flag from the host's own computed position left it false for every authored sticky
   * Region, and their parallax froze the moment the Region parked.
   */
  assert.match(
    motion,
    /viewportAnchored: isPhiMotionHostViewportAnchored\(host\)/u,
    "The anchored flag must come from the ancestor walk.",
  );
  assert.match(
    motion,
    /function isPhiMotionHostViewportAnchored[\s\S]*?node = node\.parentElement/u,
    "The anchored flag must be decided by walking ancestors, not by reading one element.",
  );

  /*
   * `range` divides the surplus across the whole progress instead of spending it at a fixed rate, so it
   * must NOT inherit the rate cap -- capping it would reintroduce the dead end it exists to remove. And a
   * proportion is only a proportion if it is taken against the distance the offset is actually read from,
   * so the range helper has to mirror the offset helper edge for edge.
   */
  assert.match(
    motion,
    /const overscan = range\s*\n?\s*\? Number\.POSITIVE_INFINITY/u,
    "`range` must draw on the whole surplus rather than the rate cap.",
  );
  assert.match(
    motion,
    /function readMotionScrollRange[\s\S]*?container\.scrollHeight - container\.clientHeight/u,
    "The scroll range must mirror the scroll offset, container for container.",
  );

  /*
   * A `fullHeight` Sider puts `overflowY: auto` on the very shell that hosts the motion, so the host is
   * itself a scroll container. A walk that starts at the parent misses the only scroller there is, and
   * the absolutely positioned layer rides that host's scrolled content away from the box it fills -- a
   * static background would have stayed on the element. Both are decided here.
   */
  assert.match(
    motion,
    /function collectPhiMotionScrollContainers[\s\S]*?let node: HTMLElement \| null = host;/u,
    "The scroll-container chain must include the host itself, not just its ancestors.",
  );
  assert.match(
    motion,
    /overflowY === "auto" \|\| overflowY === "scroll"/u,
    "Only a real scroller may contribute scroll distance; `visible` overflows report a range they never travel.",
  );
  assert.match(
    motion,
    /entry\.wrapper\.style\.transform =[\s\S]*?entry\.host\.scrollTop/u,
    "The clipping wrapper must be put back on the visible box when the host scrolls its own content.",
  );

  /*
   * The authoring side of the same field. `strength` is a speed under `rate` and a share of the surplus
   * under `range`, and no Control can convert between them -- that needs the viewport, the host box, and
   * the material the original has beyond the crop. So the Control keeps a dial per mode and takes each
   * mode's starting value from the contract rather than naming one of its own.
   */
  const control = await readSource("components/controls/phi-background-control.tsx");
  assert.match(
    control,
    /rememberedStrength\.current\[nextTravel\] \?\? resolvePhiBackgroundParallaxDefaultStrength\(nextTravel\)/u,
    "Switching travel must restore that mode's own dial, falling back to the contract's default.",
  );
  assert.doesNotMatch(
    control,
    /travel === "range" \? [\d.]+ :/u,
    "The Control must not carry its own idea of what a fitted default is.",
  );
}

{
  // Both Editors read the Asset so the variant version a focal change bumps reaches the Editor too.
  for (const path of [
    "components/widgets/client/image-editor.tsx",
    "components/widgets/client/card-editor.tsx",
  ]) {
    assert.match(await readSource(path), /usePhiAuthoringAssetDetails/u, path);
  }
}

console.log("Image presentation contracts verified.");

// ---------------------------------------------------------------------------
// `simulateVariantCrop` has a producer
// ---------------------------------------------------------------------------

{
  /*
   * The Media Inspector is the surface the flag exists for: it shows a variant while the focal rectangle
   * is still being authored, so the stored variant carries the previous framing and the preview has to
   * draw the original and reproduce the crop. It used to do that with its own call into the focal
   * helpers, which is exactly the second framing rule this file exists to prevent.
   */
  const inspector = await readSource("components/media/phi-asset-inspector-section.tsx");
  assert.match(
    inspector,
    /resolvePhiImagePresentation\(\{[\s\S]*?simulateVariantCrop: true/u,
    "The Inspector's variant preview must be the producer of the simulated crop.",
  );
  assert.doesNotMatch(
    inspector,
    /resolveFocalRectCoverImageStyle\(\s*\n?\s*asset\.width,\s*\n?\s*asset\.height,\s*\n?\s*previewFrame/u,
    "The variant preview must not derive its own crop beside the resolver.",
  );
}

/*
 * A Rich Text image sizes itself in two forms, and the pair has to round-trip: whole pixels are the
 * HTML attribute, every other unit is the inline style the sanitizer admits on `img`. A unit that
 * survives the Control but not the node would leave the author picking a value that snaps back.
 */
{
  const { readPhiHtmlImageLength, resolvePhiHtmlImageSizeForm } = await import(
    "../components/widgets/client/html-editor-image-attributes"
  );
  const { readPhiCssLengthPart, readPhiLengthValue, serializePhiCssLength } = await import("../types/length");

  for (const unit of ["px", "%", "em", "rem", "vw", "vh"] as const) {
    const authored = serializePhiCssLength(480, unit);
    const stored = readPhiHtmlImageLength(authored);
    assert.notEqual(stored, null, `An authored ${unit} size must survive the node.`);
    // The Control reads the stored value back and must show the unit the author picked.
    assert.equal(readPhiCssLengthPart(readPhiLengthValue(stored))?.unit, unit);
    const form = resolvePhiHtmlImageSizeForm(stored);
    assert.equal(
      unit === "px" ? form.attribute : form.declaration,
      unit === "px" ? "480" : `480${unit}`,
      `A ${unit} size must persist in the form that can hold it.`,
    );
    assert.equal(unit === "px" ? form.declaration : form.attribute, null);
  }

  for (const rejected of [null, undefined, "", "auto", "calc(100% - 10px)", "0", "-5px", "20001px", "50deg"]) {
    assert.equal(readPhiHtmlImageLength(rejected), null, `"${String(rejected)}" must not become a size.`);
  }
}

console.log("Image presentation producer contracts verified.");
