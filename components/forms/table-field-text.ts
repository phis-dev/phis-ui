import { isPhiRecord } from "../../helpers/is-record";
import { resolvePhiFormText } from "@phis/contracts/forms";
import { PHI_FORM_TABLE_DEFAULT_LABELS, PHI_FORM_TABLE_LABEL_KEYS } from "./table-field-labels";

/**
 * One of the table field's words: the text its `config` names -- a label reference (`{ kind: "label",
 * key, fallback }`) read from the Form's labels, or a literal (`{ kind: "literal", value }`), as a field's
 * own label is written -- or else the Form's word under `PHI_FORM_TABLE_LABEL_KEYS`, which the Form Widget
 * fills from Core's `widget:table` set, or else the English source. A plain string is not a text: it would
 * be English in every language.
 */
export function readPhiFormTableFieldText(
  value: unknown,
  labels: Readonly<Record<string, string>> | undefined,
  key: keyof typeof PHI_FORM_TABLE_LABEL_KEYS,
) {
  if (isPhiRecord(value)) {
    if (value.kind === "label" && typeof value.key === "string" && typeof value.fallback === "string") {
      return resolvePhiFormText({ kind: "label", key: value.key, fallback: value.fallback }, labels);
    }
    if (value.kind === "literal" && typeof value.value === "string") return value.value;
  }
  return labels?.[PHI_FORM_TABLE_LABEL_KEYS[key]]?.trim() || PHI_FORM_TABLE_DEFAULT_LABELS[key];
}
