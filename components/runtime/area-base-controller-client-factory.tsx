"use client";

import type { PhiRuntimeControllerDefinition, PhiRuntimeControllerPlugin } from "../../types";
import { createPhiRuntimeControllerClient } from "./runtime-controller-client-factory";

export function createPhiAreaBaseControllerClient(
  definition: PhiRuntimeControllerDefinition<Record<string, never>>,
) {
  return createPhiRuntimeControllerClient({
    ...definition,
    renderController: () => null,
  } satisfies PhiRuntimeControllerPlugin<Record<string, never>>);
}
