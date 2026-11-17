import type { PhiMediaUploadAcceptance } from "../../../../../components/media/phi-media-upload";

/** One slot as Core's `_assets` manifest declares it. */
export type PhiSlotDescriptor = {
  name: string;
  cardinality: "one" | "many";
  maxBytes: number;
  contentTypes: string[];
};

/**
 * What the drop area offers and what the upload checks before it sends, both from the one descriptor:
 * the file dialog's `accept` and `multiple` are the same facts the acceptance holds, so they cannot
 * disagree. A slot that is not known yet takes nothing -- `null` -- rather than an upload that would
 * skip the check.
 */
export function readPhiSlotUploadAcceptance(slot: PhiSlotDescriptor | null): {
  accept: string;
  multiple: boolean;
  acceptance: PhiMediaUploadAcceptance;
} | null {
  if (!slot) return null;
  const multiple = slot.cardinality === "many";
  return {
    accept: slot.contentTypes.join(","),
    multiple,
    acceptance: { contentTypes: slot.contentTypes, maxBytes: slot.maxBytes, multiple },
  };
}
