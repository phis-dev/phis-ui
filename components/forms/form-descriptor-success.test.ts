import { describe, expect, it } from "vitest";

import { parsePhiFormDescriptor } from "./form-descriptor-contract";
import {
  PHI_CONFIRM_FORM_DESCRIPTOR,
  PHI_RESET_PASSWORD_CONFIRM_FORM_DESCRIPTOR,
} from "./shared-form-descriptors";

/**
 * A confirmation is spent by its first submit. `complete` is what takes the button away afterwards, so
 * the parser has to keep it and the one-shot Forms have to state it.
 */
describe("a Form that has done its one job", () => {
  it("keeps `complete` through the descriptor parser", () => {
    const parsed = parsePhiFormDescriptor(PHI_CONFIRM_FORM_DESCRIPTOR);
    expect(parsed.success?.complete).toBe(true);
  });

  it("is what the registration and the password reset confirmation are", () => {
    expect(PHI_CONFIRM_FORM_DESCRIPTOR.success.complete).toBe(true);
    expect(PHI_RESET_PASSWORD_CONFIRM_FORM_DESCRIPTOR.success.complete).toBe(true);
  });
});
