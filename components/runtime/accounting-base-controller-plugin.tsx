"use client";

import { createPhiAreaBaseControllerClient } from "./area-base-controller-client-factory";
import { PHI_ACCOUNTING_BASE_CONTROLLER_DEFINITION } from "./area-base-controller-definitions";

export const PhiAccountingBaseControllerClient = createPhiAreaBaseControllerClient(
  PHI_ACCOUNTING_BASE_CONTROLLER_DEFINITION,
);
