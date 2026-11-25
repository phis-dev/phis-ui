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
