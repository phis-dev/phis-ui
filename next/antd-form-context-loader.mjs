/**
 * A build-time patch for one line of Ant Design 6.7 (`antd/es/form/context.js`), applied by the Turbopack
 * rule `withPhiNextConfig` sets (next/config.mjs). Remove it, the rule and the export once Ant Design
 * imports the Form provider directly (TODOS.md, "At the next release").
 *
 * Since 6.7.0 every Button reads the Form's variant (`form/hooks/useVariants` -> `form/context`), and that
 * file takes `FormProvider` from `@rc-component/form`'s entry, which declares no `sideEffects` and assigns
 * statics on import -- so each page with a Button loaded the whole Form engine and `async-validator`
 * (about 42 kB). `FormContext` is where the provider lives and imports React alone.
 *
 * Exact text only: a file that reads differently is left as it is, with a warning, so a changed Ant Design
 * is never patched by guesswork.
 */
export const PHI_ANTD_FORM_CONTEXT_IMPORT = "import { FormProvider as RcFormProvider } from '@rc-component/form';";
export const PHI_ANTD_FORM_CONTEXT_PATCHED_IMPORT =
  "import { FormProvider as RcFormProvider } from '@rc-component/form/es/FormContext';";

export function patchPhiAntdFormContext(source) {
  const occurrences = source.split(PHI_ANTD_FORM_CONTEXT_IMPORT).length - 1;
  return occurrences === 1 ? source.replace(PHI_ANTD_FORM_CONTEXT_IMPORT, PHI_ANTD_FORM_CONTEXT_PATCHED_IMPORT) : null;
}

export default function phiAntdFormContextLoader(source) {
  const patched = patchPhiAntdFormContext(source);
  if (patched !== null) return patched;
  this.emitWarning?.(new Error(
    "@phis/ui: antd/es/form/context.js no longer reads as Ant Design 6.7.0 wrote it; the Form provider patch "
      + "was not applied. Check whether Ant Design imports the provider directly now and remove the patch.",
  ));
  return source;
}
