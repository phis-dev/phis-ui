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
- `form-builder-controller-*.ts` -- the headless Form Builder Controller.
- `shared-form-descriptors.ts`, `shared-form-ids.ts`, `shared-form-plugins.tsx` -- the first-party
  Login, Registration, Confirmation, Password Reset, Provider Link Confirmation, and Contact Forms.
- `auth-*` -- Auth Module Form providers, labels, and Admin settings Forms.

The gateway half (registry reads, handler resolution, the `/api/site/forms` relay) is under `gateway/`.
