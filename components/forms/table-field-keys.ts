import { createPhiModuleScopedKey } from "../../constants/runtime-module-ownership";
import type { PhiFormProviderKey } from "../../types/form-descriptor";

/**
 * The Core `table` field's own names, apart from the rest of the Form contract, for the reason
 * `upload-field-keys.ts` is: the Form Widget reads the field's words on the Server (`form-field-labels.ts`)
 * and needs only which field type is the table field; the keys its control reads the words under are in
 * `table-field-labels.ts`, without imports, because Core's `widget:table` set reads its defaults there.
 */
export const PHI_FORM_TABLE_FIELD_PROVIDER_KEY = createPhiModuleScopedKey("form-field", "table") as PhiFormProviderKey;
