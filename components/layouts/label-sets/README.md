# Layout Label Sets

This directory contains layout-local server-side label-set loaders when a shared layout needs translated UI copy.

## Rules

- Most structural layouts such as `PhiFlexLayout` should not need labels.
- If a layout does need labels, the layout server component must import its own label-set loader from this directory.
- The CMS renderer must not centralize concrete layout label definitions.
- Layout label sets should use `PHI_TR_CTX_WEB_UI_LABEL` by default.
- Use semantic filenames, not numeric layout IDs.
