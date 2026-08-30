"use client";

import { createPhiAreaBaseControllerClient } from "./area-base-controller-client-factory";
import { PHI_PUBLIC_BASE_CONTROLLER_DEFINITION } from "./area-base-controller-definitions";

export const PhiPublicBaseControllerClient = createPhiAreaBaseControllerClient(
  PHI_PUBLIC_BASE_CONTROLLER_DEFINITION,
);
