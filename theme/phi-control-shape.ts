export const PHI_CONTROL_SHAPES = ["square", "subtle", "rounded", "pill"] as const;
export type PhiControlShape = (typeof PHI_CONTROL_SHAPES)[number];

/**
 * The stored form of a Control shape: one of the four names per corner.
 *
 * Four corners from the start, although only four equal corners render today, so that a shape which
 * rounds two opposite corners can arrive later without a stored Theme changing its form. Names rather
 * than pixels per corner, because the names are what keeps a shape size-aware: a pill corner on a small
 * Control is still half that Control's height.
 */
export const PHI_CONTROL_SHAPE_CORNER_KEYS = ["topLeft", "topRight", "bottomRight", "bottomLeft"] as const;
export type PhiControlShapeCornerKey = (typeof PHI_CONTROL_SHAPE_CORNER_KEYS)[number];
export type PhiControlShapeCorners = Record<PhiControlShapeCornerKey, PhiControlShape>;

export function createPhiControlShapeCorners(shape: PhiControlShape): PhiControlShapeCorners {
  return { topLeft: shape, topRight: shape, bottomRight: shape, bottomLeft: shape };
}

/**
 * The corners a record states, or `null` where it states none.
 *
 * Absent means the Theme follows the style block, which is an ordinary state. Anything else that is
 * not four known names is a closed vocabulary broken, and it throws rather than render some shape
 * nobody chose.
 */
export function readPhiControlShapeCorners(value: unknown): PhiControlShapeCorners | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Control shape must name its four corners, got ${JSON.stringify(value)}.`);
  }
  const record = value as Record<string, unknown>;
  const unknownKeys = Object.keys(record).filter(
    (key) => !PHI_CONTROL_SHAPE_CORNER_KEYS.includes(key as PhiControlShapeCornerKey),
  );
  if (unknownKeys.length > 0) {
    throw new Error(`Control shape has unknown corners: ${unknownKeys.join(", ")}.`);
  }
  for (const key of PHI_CONTROL_SHAPE_CORNER_KEYS) {
    if (!PHI_CONTROL_SHAPES.includes(record[key] as PhiControlShape)) {
      throw new Error(`Control shape corner "${key}" must be one of ${PHI_CONTROL_SHAPES.join(", ")}.`);
    }
  }
  return record as PhiControlShapeCorners;
}

/**
 * The one shape four corners render as.
 *
 * Unequal corners are a valid record but not yet a drawable one: antd carries a single radius per
 * size, and every Control that rounds itself from that token would need its own override. Until that
 * exists, a Theme that asks for it fails loudly instead of quietly rendering all four alike.
 */
export function resolvePhiUniformControlShape(corners: PhiControlShapeCorners): PhiControlShape {
  const shape = corners.topLeft;
  if (PHI_CONTROL_SHAPE_CORNER_KEYS.some((key) => corners[key] !== shape)) {
    throw new Error("Control shapes with differing corners are not rendered yet.");
  }
  return shape;
}

/** The shape a resolved Theme renders; the runtime fold has already put the style block's under it. */
export function resolvePhiControlShape(value: unknown): PhiControlShape {
  const corners = readPhiControlShapeCorners(value);
  if (!corners) {
    throw new Error("A resolved Theme must state its Control shape; fold it through its style block first.");
  }
  return resolvePhiUniformControlShape(corners);
}

/**
 * Radius scale a Control shape resolves to. A shape applies at every Control size (THEME.md, "Control
 * shape"), so it is a scale rather than a single number.
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
 *
 * `grown*` is the radius of a Control whose height is NOT one Control line: a Textarea, a Select holding
 * enough tags to wrap, a Mentions box. Only `pill` differs there, and it has to -- see
 * `resolvePhiGrownControlShapeRadii`.
 */
export type PhiControlShapeRadii = {
  sm: number;
  md: number;
  lg: number;
  innerSm: number;
  innerMd: number;
  innerLg: number;
  grownSm: number;
  grownMd: number;
  grownLg: number;
};

export type PhiControlShapeRadiusTokens = {
  borderRadiusXS?: unknown;
  borderRadiusSM?: unknown;
  borderRadius?: unknown;
  borderRadiusLG?: unknown;
  controlHeightSM?: unknown;
  controlHeight?: unknown;
  controlHeightLG?: unknown;
};

/**
 * A capsule is derived from the rendered Control height, not persisted as `border-radius: 50%` --
 * THEME.md, "Control shape", rejects the percentage because it produces ellipses on a rectangular box. A radius
 * far above any Control height clamps to exactly half the height in every browser, which is the
 * implementation-native full radius the contract asks for.
 */
const PHI_CONTROL_SHAPE_FULL_RADIUS = 9999;

function readTokenNumber(tokens: PhiControlShapeRadiusTokens | undefined, key: keyof PhiControlShapeRadiusTokens, fallback: number) {
  const value = tokens?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

type PhiControlShapeBodyRadii = Omit<PhiControlShapeRadii, "grownSm" | "grownMd" | "grownLg">;

function resolvePhiControlShapeBodyRadii(
  shape: PhiControlShape,
  tokens?: PhiControlShapeRadiusTokens,
): PhiControlShapeBodyRadii {
  const xs = readTokenNumber(tokens, "borderRadiusXS", 2);
  const sm = readTokenNumber(tokens, "borderRadiusSM", 2);
  const base = readTokenNumber(tokens, "borderRadius", 6);
  const lg = readTokenNumber(tokens, "borderRadiusLG", base);

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

/**
 * The radius of a Control that grows with what is in it.
 *
 * `PHI_CONTROL_SHAPE_FULL_RADIUS` is an abbreviation, and the comment above it says what for: a number
 * far above any Control height clamps to exactly half that height. That is the capsule only while the
 * height IS one Control line. A Textarea four rows tall, or a Select holding enough tags to wrap, keeps
 * clamping to half of whatever it has become -- and half of a tall box is not a capsule but an arc that
 * eats the sides it was meant to close.
 *
 * So a grown Control is given the capsule of ONE line and holds it: `createPhiControlShapeCorners`
 * already states the rule -- "a pill corner on a small Control is still half that Control's height" --
 * and this is that sentence taken literally, where the abbreviation stops being able to. Rounded up,
 * because the browser clamps anything at or above half the height to the capsule, so the extra half
 * pixel is spent where it cannot show and the property stays a whole number.
 *
 * Every other shape is already a number rather than a limit, so growing changes nothing about it.
 */
function resolvePhiGrownControlShapeRadii(
  shape: PhiControlShape,
  body: PhiControlShapeBodyRadii,
  tokens?: PhiControlShapeRadiusTokens,
): Pick<PhiControlShapeRadii, "grownSm" | "grownMd" | "grownLg"> {
  if (shape !== "pill") {
    return { grownSm: body.sm, grownMd: body.md, grownLg: body.lg };
  }

  return {
    grownSm: Math.ceil(readTokenNumber(tokens, "controlHeightSM", 24) / 2),
    grownMd: Math.ceil(readTokenNumber(tokens, "controlHeight", 32) / 2),
    grownLg: Math.ceil(readTokenNumber(tokens, "controlHeightLG", 40) / 2),
  };
}

export function resolvePhiControlShapeRadii(
  shape: PhiControlShape,
  tokens?: PhiControlShapeRadiusTokens,
): PhiControlShapeRadii {
  const body = resolvePhiControlShapeBodyRadii(shape, tokens);
  return { ...body, ...resolvePhiGrownControlShapeRadii(shape, body, tokens) };
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
 *
 * `grownMd` is the one exception, and for the reason that does not apply: the default size is exactly
 * where the component token is wrong for a grown Control, so something has to say otherwise, and no
 * Button ever grows -- the selectors that read it name a Textarea, a multiple Select and a Mentions box,
 * and reach no Button shape at all.
 */
export type PhiControlShapeCssVarSlot = Exclude<keyof PhiControlShapeRadii, "md">;

export const PHI_CONTROL_SHAPE_CSS_VARS = {
  sm: "--phi-control-radius-sm",
  lg: "--phi-control-radius-lg",
  innerSm: "--phi-control-radius-inner-sm",
  innerMd: "--phi-control-radius-inner-md",
  innerLg: "--phi-control-radius-inner-lg",
  grownSm: "--phi-control-radius-grown-sm",
  grownMd: "--phi-control-radius-grown-md",
  grownLg: "--phi-control-radius-grown-lg",
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
 * A surface's own corner, chosen by the same setting and answered on the surface scale.
 *
 * A surface keeps a surface's radii -- `pill` on a Table or a Layout would be a capsule around a grid
 * or around a column of content, which is not a thing. What the shape says about them is softer: how
 * far this Site rounds, as one step on the scale it already has. `square` takes none, and the other
 * three take the three radius tokens in order, so the number a surface wears is always one somebody
 * could have written into the numeric scale by hand.
 *
 * Its readers are every surface that draws a box: a Table (`headerBorderRadius`, and the clip in its CSS
 * Module), a Collapse (`collapsePanelBorderRadius`, its panels), a Tree (its node grounds through the
 * component token, its frame through the variable), a Layout (its box, wherever the author configured no
 * radius of their own), and the eight components whose box is the global `borderRadiusLG` -- a Card, a Modal, and the six panels that open over the page. An
 * explicit radius always wins -- this is the answer to "nothing was said", not a ceiling.
 */
export const PHI_SURFACE_SHAPE_CSS_VAR = "--phi-surface-radius";

export function resolvePhiSurfaceShapeRadius(
  shape: PhiControlShape,
  tokens?: PhiControlShapeRadiusTokens,
) {
  if (shape === "square") {
    return 0;
  }
  if (shape === "subtle") {
    return readTokenNumber(tokens, "borderRadiusSM", 2);
  }
  const base = readTokenNumber(tokens, "borderRadius", 6);
  return shape === "rounded" ? base : readTokenNumber(tokens, "borderRadiusLG", base);
}

/**
 * The step as antd component tokens, so the two surfaces that have one follow it without a rule.
 *
 * `headerBorderRadius` is what antd derives its internal `tableRadius` from, and that one number draws
 * a Table's container corners and the bottom of its footer. The bottom corners it does NOT draw:
 * `phi-table-control.module.css` clips them and reads the variable, so both ends of one Table are the
 * same corner.
 *
 * The name differs per component, and naming the wrong one is silently inert rather than visibly wrong,
 * which is why each is asserted by name. A Table and a Collapse have a token of their own; everything
 * else reads a global, and the step reaches it as a component-level override of that global -- which is
 * what a component token is in CSS variable mode: the same variable, redefined on the element.
 *
 * A Tree reads `borderRadius` for its node grounds. The eight below read `borderRadiusLG` for the box they
 * draw: a Card its container, a Modal its content, and the six others the panel they open -- a Dropdown's
 * menu, a Select's list, a DatePicker's and a Cascader's panel, a Popover's inner box, and the popup a
 * Menu opens for a submenu in a collapsed Sider. An overlay and a dropdown are surfaces like any other; it
 * is the Control SHAPE that stays off them.
 *
 * A Drawer is deliberately absent: it lies flush to the edge of the viewport, where a corner would round
 * against nothing. A Tooltip takes the step too, but not from here -- see `resolvePhiTooltipShapeRadius`.
 */
/**
 * The three that name the box themselves, each under its own token.
 *
 * A Table and a Collapse declare a radius token of their own -- the container's corners and the panel's.
 * A Tree declares none and reads the global `borderRadius` for its node grounds, which is the same
 * mechanism under a borrowed name: a component token in CSS variable mode IS that variable redefined on
 * the element.
 */
const PHI_SURFACE_SHAPE_TOKEN_NAMES = {
  Table: "headerBorderRadius",
  Collapse: "collapsePanelBorderRadius",
  Tree: "borderRadius",
} as const satisfies Record<string, string>;

const PHI_SURFACE_SHAPE_LG_COMPONENTS = [
  "Card",
  "Modal",
  "Dropdown",
  "Select",
  "DatePicker",
  "Cascader",
  "Popover",
  "Menu",
] as const;
/**
 * The Tooltip's corner, which is the surface step everywhere but `pill`.
 *
 * `pill` cannot use the abbreviation here. Ant Design computes the Tooltip's MINIMUM WIDTH from this
 * number -- `tooltipBorderRadius * 2 + sizePopupArrow`, and again with the arrow offset for the edge
 * placements -- so `PHI_CONTROL_SHAPE_FULL_RADIUS` would ask for a tooltip twenty thousand pixels wide,
 * and `min-width` beats the `maxWidth: 250` that would otherwise have caught it. The abbreviation works
 * where the number is only ever read as a radius and clamped by the browser; here it is arithmetic.
 *
 * So the capsule is stated rather than abbreviated, the same way a grown Control states it: half the
 * Control height, which is exactly a Tooltip's own capsule because `minHeight` IS the Control height. A
 * Tooltip that wraps to a second line then holds that corner instead of growing an arc across its side.
 */
export function resolvePhiTooltipShapeRadius(
  shape: PhiControlShape,
  tokens?: PhiControlShapeRadiusTokens,
) {
  return shape === "pill"
    ? Math.ceil(readTokenNumber(tokens, "controlHeight", 32) / 2)
    : resolvePhiSurfaceShapeRadius(shape, tokens);
}

export function applyPhiSurfaceShapeComponentTokens(
  components: Record<string, Record<string, unknown>>,
  shape: PhiControlShape,
  tokens: PhiControlShapeRadiusTokens,
) {
  const borderRadius = resolvePhiSurfaceShapeRadius(shape, tokens);
  const next: Record<string, Record<string, unknown>> = { ...components };
  for (const [component, tokenName] of Object.entries(PHI_SURFACE_SHAPE_TOKEN_NAMES)) {
    next[component] = { ...(next[component] ?? {}), [tokenName]: borderRadius };
  }
  for (const component of PHI_SURFACE_SHAPE_LG_COMPONENTS) {
    next[component] = { ...(next[component] ?? {}), borderRadiusLG: borderRadius };
  }
  next.Tooltip = {
    ...(next.Tooltip ?? {}),
    borderRadius: resolvePhiTooltipShapeRadius(shape, tokens),
  };
  return next;
}

/**
 * antd components whose component token styles the Control BODY.
 *
 * The four that used to sit here and were removed on 2026-08-20 -- `AutoComplete`, `Cascader`,
 * `TimePicker`, and `TreeSelect` -- never did anything: AutoComplete and TimePicker ship no stylesheet
 * of their own and render as `.ant-select` / `.ant-picker`, so the Select and DatePicker entries
 * already cover their triggers, while Cascader's and TreeSelect's own stylesheets contain nothing but
 * the dropdown panel. Cascader was worse than inert: its token reads the panel radius, so shaping it
 * would round the POPUP, which THEME.md, "Control shape", leaves on the surface scale.
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
 * Components the shape reaches through a token that is not called `borderRadius`.
 *
 * A Menu item is not a Control and is drawn as one: its height is the default Control height
 * (`buildPhiComponentTokens`), and what rounds there is the item's own selected ground, standing in a
 * column of Controls. Under `pill` a rounded rectangle among capsules is the same defect a rounded
 * Button among capsules would be.
 *
 * Both item tokens take it, because a submenu title sits in that column too and is the same object.
 * `borderRadius` is deliberately not among them: on Menu that token draws the little arrow of a submenu
 * title and nothing else, so shaping it would round two three-pixel bars. The popup that title opens in a
 * collapsed Sider is a surface and reads `borderRadiusLG`, which the surface step sets.
 */
const PHI_SHAPED_ANTD_COMPONENT_TOKENS = {
  Menu: ["itemBorderRadius", "subMenuItemBorderRadius"],
} as const satisfies Record<string, readonly string[]>;

/**
 * Applies the shape to the Control components, outranking a raw adapter-level radius override.
 *
 * THEME.md, "Control shape", requires this direction: for Phi Controls the shape wins over conflicting
 * component radius overrides, so there is one effective source of truth.
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
  for (const [component, tokenNames] of Object.entries(PHI_SHAPED_ANTD_COMPONENT_TOKENS)) {
    next[component] = {
      ...(next[component] ?? {}),
      ...Object.fromEntries(tokenNames.map((tokenName) => [tokenName, borderRadius])),
    };
  }
  return next;
}
