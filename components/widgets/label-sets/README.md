# Widget Label Sets

This directory contains widget-local server-side label-set loaders.

The shared label model and default text for a widget live in `components/widgets/label-types/*`.
The loader files in this directory import those shared models and only own translation lookup plus server-side loading logic.

## Rules

- Every shared widget that owns translated UI labels should define its own label-set loader here.
- A widget server component imports its own label-set loader directly.
- The CMS renderer and global gateway layer must not own concrete widget label definitions.
- `gateway/label-set.ts` provides only the generic translation and caching infrastructure.
- Do not duplicate shared label types or default label text inside the loader file.
- Define widget label sets as semantic key objects, not free-text lookups and not positional public contracts.
- The translator transport may use ordered arrays internally, but widget code should read translated labels through stable semantic keys.
- Widget label sets should use `PHI_TR_CTX_WEB_UI_LABEL` by default.
- Only switch to a different translation context when the same visible text must intentionally translate differently.
- Widget label-set filenames should be semantic, for example `account.ts` or `hello-world.ts`, not numeric widget IDs.
- The database must never store label-set paths or translation bundle identifiers.
- `inspector.ts` is the label set for the shared builder drawer header and translates only the generic header labels `Region`, `Layout`, and `Widget`; the concrete object name below the header stays in the inspector implementation itself.
