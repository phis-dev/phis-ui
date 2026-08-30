"use client";

import { lazy } from "react";

import type { PhiDeveloperBuilderWorkspaceControllerProps } from "../workspace-controller";

const PhiDeveloperBuilderWorkspaceController = lazy(
  () => import("../workspace-controller")
    .then((module) => ({ default: module.PhiDeveloperBuilderWorkspaceController })),
);

export function PhiDeveloperBuilderWorkspaceControllerMount(
  props: PhiDeveloperBuilderWorkspaceControllerProps,
) {
  return <PhiDeveloperBuilderWorkspaceController {...props} />;
}
