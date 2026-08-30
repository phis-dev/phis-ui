"use client";

export const loadPhiAccountingRuntimeControllerClient = () =>
  import("../../../components/runtime/accounting-base-controller-plugin")
    .then((module) => module.PhiAccountingBaseControllerClient);

