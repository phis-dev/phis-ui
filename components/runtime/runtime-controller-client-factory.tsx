"use client";

import type {
  PhiRuntimeControllerPlugin,
  PhiRuntimeModuleControllerClientProps,
} from "../../types";
import { PhiMountedRuntimeController } from "./mounted-runtime-controller";

export function createPhiRuntimeControllerClient(
  plugin: PhiRuntimeControllerPlugin<unknown, unknown>,
) {
  return function PhiRuntimeModuleControllerClient(
    props: PhiRuntimeModuleControllerClientProps,
  ) {
    return <PhiMountedRuntimeController {...props} plugin={plugin} />;
  };
}
