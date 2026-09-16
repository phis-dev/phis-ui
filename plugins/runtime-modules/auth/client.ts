"use client";

import dynamic from "next/dynamic";

/*
 * next/dynamic rather than a loader: rendered during the server render, it names its chunks in the
 * route's loadable manifest, and the HTML asks for them before hydration instead of after it.
 */
export const PhiLazyAuthRuntimeControllerClient = dynamic(() =>
  import("../../../components/runtime/auth-controller-plugin").then((module) => module.PhiAuthControllerClient));

