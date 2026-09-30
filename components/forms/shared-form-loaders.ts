import type { PhiFormInitialValuesLoader, PhiFormLabelSetLoader } from "./form-resolution";

export function createPhiFormLabelSetLoader(
  load: () => Promise<
    (options: { apiBaseUrl: string; internalToken: string; locale: string }) => Promise<unknown>
  >,
): PhiFormLabelSetLoader {
  return async ({ runtime }) => {
    const [{ flattenPhiFormLabels }, { phiRuntime }, loadLabels] = await Promise.all([
      import("./form-labels"),
      import("../../server-helpers/phi-runtime"),
      load(),
    ]);
    const rt = phiRuntime(runtime);
    return flattenPhiFormLabels(await loadLabels({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      locale: runtime.locale.current,
    }));
  };
}

/**
 * The language the form was read in, handed to the handler as one of its values.
 *
 * A form that makes the server write an email is the case: the address, the name and the password say
 * nothing about which language the person was reading, and the handler falls back to the Site's default
 * -- so a Site that answers in English by default sent an English email to somebody who had just filled
 * in a German form. The Site's locale is known where the form is rendered, on the server, and a hidden
 * field is where a value nobody types belongs.
 *
 * Read on the render rather than resolved again in the handler, because the two would then be separate
 * answers to one question: what a person was reading is what the page was drawn in, not what a request
 * arriving later happens to negotiate.
 */
export const loadPhiFormLocale: PhiFormInitialValuesLoader = ({ runtime }) => ({
  locale: runtime.locale.current,
});
