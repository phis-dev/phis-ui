import { readString } from "./parser-primitives";

/**
 * The tones a text can take beside the default one, shared by the Widgets that write text.
 *
 * A word about what the text means -- secondary, a success, a warning, a danger -- rather than a
 * colour, so the Theme decides what each looks like. Absent is the default tone.
 */
export const PHI_TEXT_TONES = ["secondary", "success", "warning", "danger"] as const;

export type PhiTextTone = (typeof PHI_TEXT_TONES)[number];

export function readPhiTextTone(value: unknown): PhiTextTone | undefined {
  const tone = readString(value);
  return (PHI_TEXT_TONES as readonly string[]).includes(tone ?? "") ? tone as PhiTextTone : undefined;
}

export const PHI_TEXT_TONE_FIELD_OPTIONS = [
  { value: "secondary", label: "Secondary" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "danger", label: "Danger" },
] as const;
