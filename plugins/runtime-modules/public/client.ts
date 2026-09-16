"use client";

import dynamic from "next/dynamic";

/*
 * next/dynamic rather than a loader: rendered during the server render, it names its chunks in the
 * route's loadable manifest, and the HTML asks for them before hydration instead of after it.
 */
export const PhiLazyPublicRuntimeControllerClient = dynamic(() =>
  import("../../../components/runtime/public-base-controller-plugin").then((module) => module.PhiPublicBaseControllerClient));

