import { createPhiModuleScopedKey } from "../../constants/runtime-module-ownership";
import type { PhiFormProviderKey } from "../../types/form-descriptor";

/**
 * The Core `list` field's own name, apart from the rest of the Form contract for the reason
 * `table-field-keys.ts` is: the Form Widget reads the field's words on the Server (`form-field-labels.ts`)
 * and needs only which field type is the list field; the keys its control reads the words under are in
 * `list-field-labels.ts`, without imports, because Core's `widget:table` set reads its defaults there.
 */
export const PHI_FORM_LIST_FIELD_PROVIDER_KEY = createPhiModuleScopedKey("form-field", "list") as PhiFormProviderKey;
