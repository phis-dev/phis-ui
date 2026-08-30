export const PHI_CONTROL_SHAPES = ["square", "subtle", "rounded", "pill"] as const;
export type PhiControlShape = (typeof PHI_CONTROL_SHAPES)[number];

export function readPhiControlShape(value: unknown): PhiControlShape {
  return typeof value === "string" && PHI_CONTROL_SHAPES.includes(value as PhiControlShape)
    ? value as PhiControlShape
    : "rounded";
}

/**
 * Radius scale a Control shape resolves to. `SITE-CONFIG.md` requires the adapter to resolve the
 * preset "for the active `controlSize`", so a shape is a scale rather than a single number.
 *
 * - `square` and `pill` are ABSOLUTE statements about geometry. No size can make "no rounding" or
 *   "capsule" partially true, so both flatten every step: a small pill Button that is not a pill is
 *   simply wrong.
 * - `rounded` and `subtle` are RELATIVE to the numeric radius scale the Style tab owns directly.
 *   `rounded` is that scale unchanged; `subtle` is the same scale shifted one step toward the small
 *   end. Flattening these two would silently discard the Small and Large values an author just typed
 *   and leave two of the three numeric inputs dead for half the shapes.
 *
 * `inner*` is the radius of a box nested INSIDE a Control body -- the Segmented item and thumb. antd
 * keeps it one step below the body so the item never overruns its container; an absolute shape has to
 * reach it too, or a pill Segmented ends up with square items inside a capsule.
 */
export type PhiControlShapeRadii = {
  sm: number;
  md: number;
  lg: number;
  innerSm: number;
  innerMd: number;
  innerLg: number;
};

export type PhiControlShapeRadiusTokens = {
  borderRadiusXS?: unknown;
  borderRadiusSM?: unknown;
  borderRadius?: unknown;
  borderRadiusLG?: unknown;
};

/**
 * A capsule is derived from the rendered Control height, not persisted as `border-radius: 50%` --
 * `SITE-CONFIG.md` rejects the percentage because it produces ellipses on a rectangular box. A radius
 * far above any Control height clamps to exactly half the height in every browser, which is the
 * implementation-native full radius the contract asks for.
 */
const PHI_CONTROL_SHAPE_FULL_RADIUS = 9999;

function readTokenRadius(tokens: PhiControlShapeRadiusTokens | undefined, key: keyof PhiControlShapeRadiusTokens, fallback: number) {
  const value = tokens?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function resolvePhiControlShapeRadii(
  shape: PhiControlShape,
  tokens?: PhiControlShapeRadiusTokens,
): PhiControlShapeRadii {
  const xs = readTokenRadius(tokens, "borderRadiusXS", 2);
  const sm = readTokenRadius(tokens, "borderRadiusSM", 2);
  const base = readTokenRadius(tokens, "borderRadius", 6);
  const lg = readTokenRadius(tokens, "borderRadiusLG", base);

  if (shape === "square") {
    return { sm: 0, md: 0, lg: 0, innerSm: 0, innerMd: 0, innerLg: 0 };
  }

  if (shape === "pill") {
    const full = PHI_CONTROL_SHAPE_FULL_RADIUS;
    return { sm: full, md: full, lg: full, innerSm: full, innerMd: full, innerLg: full };
  }

  if (shape === "subtle") {
    return { sm, md: sm, lg: base, innerSm: xs, innerMd: xs, innerLg: sm };
  }

  return { sm, md: base, lg, innerSm: xs, innerMd: sm, innerLg: base };
}

export function resolvePhiControlShapeRadius(
  shape: PhiControlShape,
  tokens: PhiControlShapeRadiusTokens,
) {
  return resolvePhiControlShapeRadii(shape, tokens).md;
}

/**
 * Custom properties `styles/control-shape.css` reads. They carry the resolved numbers rather than a
 * reference to an adapter token so a nested preview -- which runs its own draft scale through a plain
 * `ConfigProvider` and therefore never redefines the ambient `--ant-border-radius-*` -- still resolves
 * its OWN shape. Inheritance is also what makes nesting work at all: two rules that both match a
 * Control tie on specificity and source order decides, while an inherited custom property is always
 * taken from the nearest ancestor that declares it.
 *
 * The default size is deliberately absent: it is already carried by the component tokens, and a CSS
 * rule strong enough to set it would also have to outrank antd's own `-circle` and `-round` Button
 * shapes, which stay authoritative.
 */
export type PhiControlShapeCssVarSlot = Exclude<keyof PhiControlShapeRadii, "md">;

export const PHI_CONTROL_SHAPE_CSS_VARS = {
  sm: "--phi-control-radius-sm",
  lg: "--phi-control-radius-lg",
  innerSm: "--phi-control-radius-inner-sm",
  innerMd: "--phi-control-radius-inner-md",
  innerLg: "--phi-control-radius-inner-lg",
} as const satisfies Record<PhiControlShapeCssVarSlot, `--${string}`>;

export function buildPhiControlShapeCssVars(
  shape: PhiControlShape,
  tokens?: PhiControlShapeRadiusTokens,
): Record<`--${string}`, string> {
  const radii = resolvePhiControlShapeRadii(shape, tokens);
  const vars: Record<string, string> = {};
  for (const [slot, cssVar] of Object.entries(PHI_CONTROL_SHAPE_CSS_VARS)) {
    vars[cssVar] = `${radii[slot as PhiControlShapeCssVarSlot]}px`;
  }
  return vars as Record<`--${string}`, string>;
}

/**
 * antd components whose component token styles the Control BODY.
 *
 * The four that used to sit here and were removed on 2026-08-20 -- `AutoComplete`, `Cascader`,
 * `TimePicker`, and `TreeSelect` -- never did anything: AutoComplete and TimePicker ship no stylesheet
 * of their own and render as `.ant-select` / `.ant-picker`, so the Select and DatePicker entries
 * already cover their triggers, while Cascader's and TreeSelect's own stylesheets contain nothing but
 * the dropdown panel. Cascader was worse than inert: its token reads the panel radius, so shaping it
 * would round the POPUP, which `SITE-CONFIG.md` reserves for the surface scale.
 */
const PHI_SHAPED_ANTD_COMPONENTS = [
  "Button",
  "ColorPicker",
  "DatePicker",
  "Input",
  "InputNumber",
  "Mentions",
  "Segmented",
  "Select",
] as const;

/**
 * Applies the shape to the Control components, outranking a raw adapter-level radius override.
 *
 * `SITE-CONFIG.md` requires this direction: "the resolved semantic Control shape takes precedence over
 * conflicting raw adapter-level component-radius overrides so there is one effective source of truth."
 * Overriding a single corner is a different layer and never conflicts -- antd carries only scalar radius
 * tokens, so a Widget config such as `borderTopLeftRadius` owns that case.
 *
 * Only the DEFAULT size is set here. antd reads `borderRadiusSM` and `borderRadiusLG` for the small and
 * large variants, but those same two tokens also draw the Select dropdown, the DatePicker panel, and the
 * ColorPicker swatches, so a component override cannot reach one without the other. The small and large
 * Control bodies are covered by `styles/control-shape.css`, which targets the size classes and leaves
 * every popup on the surface scale.
 */
export function applyPhiControlShapeComponentTokens(
  components: Record<string, Record<string, unknown>>,
  shape: PhiControlShape,
  tokens: PhiControlShapeRadiusTokens,
) {
  const borderRadius = resolvePhiControlShapeRadius(shape, tokens);
  const next = { ...components };
  for (const component of PHI_SHAPED_ANTD_COMPONENTS) {
    next[component] = { ...(next[component] ?? {}), borderRadius };
  }
  return next;
}
