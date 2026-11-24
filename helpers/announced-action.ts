import { PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignalValueSchema } from "../types/signals";
import { readPhiTableActionSignalValue } from "../types/table-signal-values";
import { readPhiCollectionActionSignalValue } from "../types/collection-signal-values";

/**
 * An action announced on the action channel, by whichever of the two announcers said it: a Table's
 * `table-action` (`{ actionKey, rowIdentity }`) or a Collection View's `collection-action`
 * (`{ actionKey, itemKey }`). Both name the action in the message, so every listener decides by its own
 * `openActionKey` whether it was meant, and the record either names is `recordKey` -- a row's identity, an
 * item's key, `null` for a toolbar action.
 *
 * `undefined` for a route of any other schema: not an announcement at all, and the caller treats it as it
 * always did. `null` for an announcement that cannot be read.
 */
export function readPhiAnnouncedAction(
  valueSchema: PhiSignalValueSchema | null | undefined,
  value: unknown,
): { actionKey: string; recordKey: string | number | null } | null | undefined {
  if (valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.tableAction) {
    const action = readPhiTableActionSignalValue(value);
    return action ? { actionKey: action.actionKey, recordKey: action.rowIdentity ?? null } : null;
  }
  if (valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.collectionAction) {
    const action = readPhiCollectionActionSignalValue(value);
    return action ? { actionKey: action.actionKey, recordKey: action.itemKey ?? null } : null;
  }
  return undefined;
}

/** Whether a route carries an announced action, a Table's or a Collection View's. */
export function isPhiAnnouncedActionSchema(valueSchema: PhiSignalValueSchema | null | undefined) {
  return valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.tableAction ||
    valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.collectionAction;
}
