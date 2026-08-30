import {
  PHI_COMMON_CONTROL_DEFAULT_LABELS,
  readPhiCommonControlActionKey,
  type PhiCommonControlLabels,
} from "../../label-types/common-controls";

export function resolvePhiCommonControlAction(
  labels: PhiCommonControlLabels | null | undefined,
  actionKey: string | null | undefined,
) {
  const key = readPhiCommonControlActionKey(actionKey);
  return key ? (labels ?? PHI_COMMON_CONTROL_DEFAULT_LABELS).actions[key] : null;
}
