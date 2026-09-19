import { PHI_SHARED_PACKAGE_NAME } from "../../types/signals";
import { createPhiFormId } from "../../types/form-id";

export const PHI_SHARED_FORM_IDS = {
  login: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "login"),
  providerLinkConfirmation: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "provider-link-confirmation"),
  registration: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "registration"),
  contact: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "contact"),
  confirm: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "confirm"),
  resetPassword: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "reset-password"),
  /**
   * The second stage of a password reset, which is its own form because it asks its own questions.
   *
   * A stage that shares a form's id would have to share its descriptor, and the two have no field in
   * common: one asks for an address, the other for the token that arrived there and the new password.
   * Two forms in two placements, told apart by the token in the address, is the same composition any
   * other pair of Widgets in a Layout uses.
   */
  resetPasswordConfirm: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "reset-password-confirm"),
  /**
   * The two credentials a signed-in person changes about themselves.
   *
   * They belong beside the sign-in Forms rather than with the profile's name and newsletter, for the
   * same reason the security Page belongs to this Module: a password and the address it is tied to are
   * how somebody proves who they are, and whoever answers that question owns the Forms that change it.
   */
  profilePassword: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "profile-password"),
  profileEmail: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "profile-email"),
} as const;
