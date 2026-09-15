import { localizeAreaPath } from "../../../helpers/locale";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";

/**
 * What the Login looks like wherever it appears, said once.
 *
 * There are two Logins -- the Overlay the Shell opens and the `/login` page -- and they are not the same
 * composition: the page stands beside an explanatory panel and drives its submit from a Button Widget of
 * its own, the Overlay carries its submit inside the Widget. What they must not differ in is the form
 * itself: the same column, the same two links underneath. Those had drifted already, the page running on
 * the default column while the Overlay set its own.
 *
 * Chrome is deliberately not here. Padding, background and width belong to the surface a form stands on,
 * and a dialog is not a page.
 */

/**
 * Where the label column ends, on the 24-track form grid (LAYOUTING.md, "Form grid").
 *
 * Line 9 is a third of the width: enough for "Password" beside its input without the input growing
 * short, in a dialog narrow enough to read as a dialog.
 */
export const PHI_LOGIN_FORM_LAYOUT_CONFIG = {
  labelEnd: 9,
} as const;

/** The Login form Widget's config: which form, the submit it carries, and where its two links lead. */
export function buildPhiLoginFormWidgetConfig(locale: string) {
  return {
    formId: PHI_SHARED_FORM_IDS.login,
    // Declared, unnamed: the Login's own label set says "Sign in", in the language it is read in.
    submit: {},
    formConfig: {
      forgotPasswordHref: localizeAreaPath(locale, "public", "/reset-password"),
      registerHref: localizeAreaPath(locale, "public", "/register"),
    },
  };
}
