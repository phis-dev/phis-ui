import { describe, expect, it } from "vitest";

import type { PhiRuntimeModuleId } from "../../../../types";
import { leavesPublicWithoutSignIn } from "./runtime-modules-table";

/**
 * Switching Public's last Auth UI provider off stays allowed, and is never silent: the Builder says in
 * the switch-off dialog that nobody can sign in afterwards and how an operator brings it back.
 */
describe("the sign-in a Module takes with it", () => {
  const auth = { moduleId: "@phis/ui/modules/auth" as PhiRuntimeModuleId, authUiProvider: {} };
  const other = { moduleId: "@acme/login" as PhiRuntimeModuleId, authUiProvider: {} };
  const plain = { moduleId: "@phis/ui/modules/docs" as PhiRuntimeModuleId };
  const state = (publicIds: string[]) => ({
    runtimeModuleIdsByArea: { public: publicIds },
    runtimeModuleDefinitions: [auth, other, plain],
  }) as unknown as Parameters<typeof leavesPublicWithoutSignIn>[0];

  it("is lost when Public's only Auth UI provider goes", () => {
    expect(leavesPublicWithoutSignIn(state([auth.moduleId, plain.moduleId]), auth, ["public"])).toBe(true);
  });

  it("stays while another Auth UI provider serves Public", () => {
    expect(leavesPublicWithoutSignIn(state([auth.moduleId, other.moduleId]), auth, ["public"])).toBe(false);
  });

  it("is not a question for a Module without sign-in, or for another Area", () => {
    expect(leavesPublicWithoutSignIn(state([auth.moduleId, plain.moduleId]), plain, ["public"])).toBe(false);
    expect(leavesPublicWithoutSignIn(state([auth.moduleId]), auth, ["admin"])).toBe(false);
  });
});
