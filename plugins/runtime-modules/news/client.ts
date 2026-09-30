"use client";

import dynamic from "next/dynamic";

/*
 * next/dynamic rather than a loader: rendered during the server render, it names its chunks in the route's
 * loadable manifest, so the HTML asks for them before hydration instead of after it.
 */
export const PhiLazyNewsRuntimeControllerClient = dynamic(() =>
  import("../../../plugins/runtime-modules/news/controller/client")
    .then((module) => module.PhiNewsRuntimeControllerClient));
