/**
 * The authoring markers a layout puts in the DOM, and the one question that decides whether it should.
 *
 * `data-phi-layout-debug-layer`, `phi-layout-scaffold-slot` and `data-phi-layout-has-content` describe
 * the tree for the Builder's scaffold. Nothing else reads them: no other stylesheet, no JavaScript. They
 * were emitted unconditionally, so every visitor of every published page carried them -- bytes on each
 * render, and a description of the authoring model handed to people who cannot author.
 *
 * Whether a render is an authoring one is not a new flag. A layout already receives `editSlotAction`,
 * `editSlotLabels` and `capabilities`, all three of them things only the Builder passes and all three
 * absent on a published page. Reading them is what keeps this from becoming another value someone has
 * to remember to thread. `validate-authoring-marker-contracts.ts` pins the coupling, because an
 * implicit signal that nothing checks is an implicit signal that quietly stops being true.
 */

export type PhiLayoutAuthoringSignal = {
  editSlotAction?: unknown;
  editSlotLabels?: unknown;
  capabilities?: unknown;
};

export function isPhiLayoutAuthoringRender(signal: PhiLayoutAuthoringSignal) {
  return signal.editSlotAction != null || signal.editSlotLabels != null || signal.capabilities != null;
}

/** The layout band's marker, and nothing at all outside authoring. */
export function phiLayoutDebugLayerMarker(authoring: boolean) {
  return authoring ? ("layout" as const) : undefined;
}

/** The slot band's class, joinable with a layout's own slot class. */
export function phiLayoutScaffoldSlotMarker(authoring: boolean) {
  return authoring ? "phi-layout-scaffold-slot" : undefined;
}

/** Whether a slot holds something, which only the scaffold asks. */
export function phiLayoutSlotContentMarker(authoring: boolean, hasContent: boolean) {
  return authoring ? (hasContent ? "true" : "false") : undefined;
}

/** Joins a layout's own slot class with the marker, dropping what is absent. */
export function phiLayoutSlotClassName(authoring: boolean, ownClassName?: string) {
  return [ownClassName, phiLayoutScaffoldSlotMarker(authoring)].filter(Boolean).join(" ") || undefined;
}
