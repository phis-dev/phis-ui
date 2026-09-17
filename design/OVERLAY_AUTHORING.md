# Overlay authoring design

Builder does not author Overlays. Presets declare complete Overlay instances and their named zone Layouts,
and runtime and preview render them through the canonical path described in
[OVERLAYS.md](../OVERLAYS.md). This document is the design for authoring them; implementing it follows
the runtime and preset ABI in OVERLAYS.md and requires operator approval.

## Target behavior

- List Area- and Page-owned Overlays separately from Regions.
- Force the selected Overlay open in editor mode without persisting `open`.
- Edit Overlay config through a generic Modal/Drawer Overlay Inspector, including the root Layout picker.
- Expose Header, Body, and Footer as named zones and edit every declared root and descendant through the
  normal Layout/Widget tree canvas.
- Include Overlay create/delete, named-root assignment, DnD, Undo/Redo, preview transport, and publish
  validation.
- Keep every Overlay outside normal Region/Layout-slot flow. Region/Overlay subtree moves are allowed only
  inside the same Area or Page ownership scope and are one atomic history transaction.

## Builder workspace Drawers

Builder workspace Drawer hosts move onto this model only once they can be represented by the same Overlay
tree. No Builder-only persisted dialog model is added in the meantime.
