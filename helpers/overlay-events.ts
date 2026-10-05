/**
 * Keeps a pointer or keyboard event inside the Overlay it happened in.
 *
 * A picker or a tool button sits over the Builder Canvas, and a click that bubbled on would select or
 * drag whatever block stands beneath it. Five private copies of this one line stood in three files.
 */
export function stopPhiOverlayEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}
