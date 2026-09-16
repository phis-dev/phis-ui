"use client";

import dynamic from "next/dynamic";

/*
 * next/dynamic rather than a loader: rendered during the server render, it names its chunks in the
 * route's loadable manifest, and the HTML asks for them before hydration instead of after it.
 */
export const PhiLazyThemeRuntimeControllerClient = dynamic(() =>
  import("../../../plugins/runtime-modules/theme/controller/client").then((module) => module.PhiThemeRuntimeControllerClient));

