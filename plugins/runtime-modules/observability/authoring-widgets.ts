"use client";

import { createPhiAuthoringWidgetModule } from "../client-authoring-widget-module";

/**
 * Observability contributes no Widgets of its own.
 *
 * Its log detail was a Widget for exactly as long as nothing general could do the job; the core record
 * Widget reads one row of a Table Provider, and the logs Page declares its eleven fields against that.
 * What is left here is the Module's Builder entry, which every Module has whether or not it brings
 * Widgets -- `validate-runtime-module-manifests.mjs` checks that union, and a Module missing from it is
 * a Module the Builder cannot reach.
 */
export default createPhiAuthoringWidgetModule([]);
