import type { PhiCmsConfigField, PhiCmsConfigFieldOptionPresets } from "../../../types/cms-plugins";
import {
  PHI_COMMON_CONTROL_DEFAULT_LABELS,
  type PhiCommonControlActionKey,
} from "../label-types/common-controls";

/**
 * A control's label as written, an emptied one included.
 *
 * Empty is an answer, not a gap: it is the button that is only its icon. Read as absent, it would fall
 * back to the action's label or the key, and an icon-only button could not be made at all.
 */
export function readPhiControlLabel(value: unknown) {
  if (typeof value !== "string") return undefined;
  return value.trim() ? value : "";
}

const PHI_COMMON_ACTION_KEYS = Object.keys(PHI_COMMON_CONTROL_DEFAULT_LABELS.actions) as PhiCommonControlActionKey[];

/*
 * The actions as a list to pick from, read off the label set that defines them rather than typed a
 * second time. It was a free-text field over a closed enum, so a typo silently became "no action".
 */
const PHI_COMMON_ACTION_OPTIONS = PHI_COMMON_ACTION_KEYS
  .map((value) => ({ value, label: PHI_COMMON_CONTROL_DEFAULT_LABELS.actions[value].label }));

/**
 * The Action field of a button -- the Button Widget's, and each of a Command Toolbar's.
 *
 * A chosen action answers for the label, the variant and the colour: the Inspector shows its values
 * locked, and a placement stores only the action, so the reader still gets the label set's translation.
 * The icon and the signal value are written once and stay the author's -- a Save that shows a cloud,
 * or sends `saveMembership`, is still a Save. The tooltip is never the action's: it says what this
 * button does here, and left empty there is none.
 *
 * `signalValuePath` is where the button keeps what it sends, which is a field of its own on the Button
 * and the first emit on a toolbar button.
 */
export function createPhiCommonActionField({
  signalValuePath,
  heading,
}: {
  signalValuePath: string;
  heading?: string;
}) {
  const optionPresets = {
    locks: ["label", "variant", "danger"],
    prefills: [signalValuePath, "icon"],
    values: Object.fromEntries(PHI_COMMON_ACTION_KEYS.map((key) => {
      const action = PHI_COMMON_CONTROL_DEFAULT_LABELS.actions[key];
      return [key, {
        label: action.label,
        icon: action.icon,
        variant: action.variant ?? "normal",
        danger: action.danger === true,
        [signalValuePath]: key,
      }];
    })),
  } satisfies PhiCmsConfigFieldOptionPresets;

  return {
    key: "action",
    type: "choice",
    ...(heading ? { heading } : {}),
    label: "Action",
    emptyOption: { value: "", label: "Custom", separator: "after" },
    emptyValue: undefined,
    options: PHI_COMMON_ACTION_OPTIONS,
    optionPresets,
  } satisfies PhiCmsConfigField;
}
