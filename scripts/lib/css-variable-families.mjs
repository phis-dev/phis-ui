/**
 * The CSS variables this package sets by hand, by family.
 *
 * Ant Design writes its tokens under the same prefix (`--phi-`, `cssVar.prefix` in
 * `components/root/phi-root-theme-resolver.ts`), so `--phi-color-primary` is a token and
 * `--phi-shell-chrome-top` is ours. A variable that falls in one of these families is ours; any other
 * `--phi-` name must be a token `theme/phi-theme-tokens.ts` states (scripts/validate-control-boundaries.mjs).
 * Read only by the checks, so it lives with them and not in the package.
 * No variable Ant Design writes may fall in a family (scripts/check-antd-static-css.mjs): a family that
 * Ant Design starts using would have both writers fight over one name.
 *
 * A family is the whole name or the name followed by `-`, so `form-cell` covers `form-cell-gap`
 * and not `form-cellar`. Families inside an Ant Design component's namespace (`card-`, `form-`,
 * `layout-`, `menu-`, `table-`, `tree-`) are spelled out to the word that Ant Design does not use.
 */
export const PHI_HAND_SET_CSS_VARIABLE_FAMILIES = Object.freeze([
  "block",
  "builder",
  "card-control",
  "card-highlight-color",
  "card-icon",
  "chevron-size",
  "control-gradient",
  "control-radius",
  "debug",
  "edit-scaffold",
  "effects",
  "expand-indicator",
  "font-heading",
  "font-source",
  "form-actions",
  "form-cell",
  "form-column-gutter",
  "form-label-end",
  "form-label-gutter",
  "form-label-min-height",
  "form-label-pad",
  "form-label-slot-height",
  "form-row-gap",
  "gap",
  "grid-column-gap",
  "grid-slot",
  "labeled-control",
  "layout-affordance-size",
  "layout-gap",
  "layout-padding-top",
  "layout-scaffold-delete",
  "markdown-float",
  "masonry",
  "page-inset",
  "signed-in-page-inset",
  "menu-font-family",
  "menu-font-size",
  "mode-dark-gate",
  "mode-light-gate",
  "region",
  "root-scaffold",
  "shell",
  "sidebar-width",
  "slot",
  "split-card",
  "surface",
  "table-sticky-top",
  "table-striped-row-background",
  "three-column",
  "tree-drag-handle-color",
  "tree-striped-row-background",
]);
