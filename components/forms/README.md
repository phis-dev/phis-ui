# components/forms

The implementation of the Form contract. The contract itself is [FORMS.md](../../FORMS.md); the guide
for a Module that contributes a Form is [PRESET_FORMS_HOWTO.md](./PRESET_FORMS_HOWTO.md).

What lives here:

- `form-registry.ts`, `form-resolution.ts` -- `definePhiRuntimeModuleForm`, preset/override resolution,
  and label loading.
- `form-descriptor-contract.ts` -- descriptor parsing, the 24-track grid, responsive ranges, and text
  resolution.
- `form-provider-contract.ts`, `form-provider-registry.tsx`, `shared-form-provider-registry.tsx` --
  first-party field, validation, and handler Provider descriptors and the scoped executable registry.
- `form-descriptor-runtime-client.tsx`, `phi-form-widget-frame.tsx` -- the client half of the Form
  Widget: submit, reset, record reads, guard, draft, and the Widget-drawn submit and links.
- `runtime-form-controller-*.ts(x)`, `runtime-form-client.ts`, `runtime-form-state.ts` -- the Core Form
  controller and its client.
- `form-guard-client.ts` -- the browser's guard token request.
- `form-builder-controller-address.ts`, `form-builder-controller-definition.ts` -- the headless Form
  Builder Controller's address and definition, public through `@phis/ui/forms`. Its Client lives in the
  Form Builder Module (`plugins/runtime-modules/form-builder/controller/client.ts`), the only one that
  mounts it.
- `shared-form-descriptors.ts`, `shared-form-ids.ts` -- the descriptors and ids of the first-party
  Login, Registration, Confirmation, Password Reset, Provider Link Confirmation, and Contact Forms.
  The Modules that own them register them: `plugins/runtime-modules/auth/forms.ts` and
  `plugins/runtime-modules/public/forms.ts`. `shared-form-loaders.ts` holds the label and locale
  loaders both use.
- `auth-*` -- labels of the Auth Module's Forms. Its providers and Admin settings Forms live in
  `plugins/runtime-modules/auth/`.

The gateway half (registry reads, handler resolution, the `/api/site/forms` relay) is under `gateway/`.
