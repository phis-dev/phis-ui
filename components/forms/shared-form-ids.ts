import { PHI_SHARED_PACKAGE_NAME } from "../../types/signals";
import { createPhiFormId } from "../../types/form-id";

export const PHI_SHARED_FORM_IDS = {
  login: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "login"),
  providerLinkConfirmation: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "provider-link-confirmation"),
  registration: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "registration"),
  contact: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "contact"),
  confirm: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "confirm"),
  resetPassword: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "reset-password"),
} as const;
