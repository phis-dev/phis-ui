"use client";

import { lazy, Suspense } from "react";

import { PHI_FORM_CONTROLLER_TYPE } from "../forms/runtime-form-controller-address";
import type { PhiRuntimeModuleControllerClientProps } from "../../types/cms-plugins";

const PhiRuntimeFormControllerClient = lazy(async () => ({
  default: await import("../forms/runtime-form-controller-plugin")
    .then((module) => module.PhiRuntimeFormControllerClient),
}));

export function PhiPlatformRuntimeControllerClientHost({
  controllers,
}: {
  controllers: readonly PhiRuntimeModuleControllerClientProps[];
}) {
  return controllers.map((props) => {
    if (props.setting.type !== PHI_FORM_CONTROLLER_TYPE) {
      throw new Error(`Unknown Platform controller "${props.setting.type}".`);
    }
    return (
      <Suspense key={`${props.setting.type}:${props.setting.instanceKey ?? "default"}`} fallback={null}>
        <PhiRuntimeFormControllerClient {...props} />
      </Suspense>
    );
  });
}
