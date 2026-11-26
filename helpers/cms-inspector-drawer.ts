import { PHI_SPACE } from "../theme/antd-css-var-contract";

/*
 * What an inspector Drawer's body insets, said once: the Builder's Region, Layout and Widget inspectors
 * and the Asset inspector all stand in a 377px Drawer whose body is a Collapsible of sections.
 *
 * One `sm` step on each side (owner, 2026-11-25). It used to be two -- the Layout's `padding` and the
 * sections' `innerPadding`, `sm` each -- which left 325px for what a section holds. The step is the
 * sections' own, not the Layout's: a section header keeps its `sm` padding, so the content under it lines
 * up with the header's text only when the Layout itself adds nothing around both. `innerPadding` is stated
 * rather than left out, because left out the Collapsible takes the Theme's `base` step instead.
 */
export const PHI_INSPECTOR_DRAWER_BODY_INSET = {
  padding: 0,
  innerPadding: PHI_SPACE.sm,
} as const;

/*
 * What a Table inside an inspector is, said once (owner, 2026-11-25): lines only. It stands on the
 * inspector's own ground -- no Surface (`surface: null`, the Surface switch's "None"), so neither its box
 * nor its header, footer or summary row paints a fill -- and it has no outer frame; the lines between its
 * rows stay. Its header does not stick: a header without a ground of its own would let the rows show
 * through it.
 *
 * Every Table an inspector shows takes it -- a Table Widget in an inspector tree as its `presentation`, a
 * `PhiTableControl` an inspector client draws as its props, a Form's table field as its config -- and adds
 * only what is its own. `scripts/validate-overlay-form-contracts.ts` holds each of them to it.
 */
export const PHI_INSPECTOR_TABLE_PRESENTATION = {
  surface: null,
  borders: false,
  stickyHeader: false,
} as const;

/** `PHI_INSPECTOR_TABLE_PRESENTATION` as `PhiTableControl` props, and as a Form table field's config. */
export const PHI_INSPECTOR_TABLE_CONTROL_PROPS = {
  surface: PHI_INSPECTOR_TABLE_PRESENTATION.surface,
  bordered: PHI_INSPECTOR_TABLE_PRESENTATION.borders,
  stickyHeader: PHI_INSPECTOR_TABLE_PRESENTATION.stickyHeader,
} as const;
