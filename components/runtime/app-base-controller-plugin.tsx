"use client";

import { createPhiAreaBaseControllerClient } from "./area-base-controller-client-factory";
import { PHI_APP_BASE_CONTROLLER_DEFINITION } from "./area-base-controller-definitions";

export const PhiAppBaseControllerClient = createPhiAreaBaseControllerClient(
  PHI_APP_BASE_CONTROLLER_DEFINITION,
);
