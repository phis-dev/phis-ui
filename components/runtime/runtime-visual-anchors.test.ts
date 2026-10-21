// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PhiSignalRuntimePartition } from "./runtime-signal-partition";
import {
  readPhiVisualAnchor,
  registerPhiVisualAnchor,
  registerPhiVisualAnchorParts,
  waitForPhiVisualAnchor,
} from "./runtime-visual-anchors";
import { PHI_VISUAL_ANCHOR_PART_ATTRIBUTE, type PhiVisualAnchorAddress } from "../../types/tours";

/*
 * What a Tour may rely on: an address answers with the one element drawn for it in this partition, or with
 * nothing -- never with a second registration, a detached element, or the same id from another partition.
 */

const ADDRESS = "cms:AAAAAAAAAAAAAAAA" as PhiVisualAnchorAddress;

function createPartition(id = "test"): PhiSignalRuntimePartition {
  return {
    id,
    kind: "area",
    context: { siteKey: null, area: null, pageKey: null, regionKey: null, slotKey: null },
    parent: null,
    listeners: new Set(),
    receiverListenerCounts: new Map(),
    instances: new Map(),
    instanceSubscribers: new Set(),
    pendingSignals: new Map(),
    visualAnchors: new Map(),
    visualAnchorSubscribers: new Set(),
  };
}

/** An element happy-dom counts as laid out: it has no layout engine, so the box is stated. */
function createLaidOutElement() {
  const element = document.createElement("div");
  element.getClientRects = () => [{}] as unknown as DOMRectList;
  element.getBoundingClientRect = () => ({ x: 0, y: 0, width: 120, height: 40 }) as DOMRect;
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("visual anchors", () => {
  it("finds a Widget's part inside its own frame, and nowhere else", () => {
    const partition = createPartition();
    const frame = createLaidOutElement();
    const toolbar = document.createElement("div");
    toolbar.setAttribute(PHI_VISUAL_ANCHOR_PART_ATTRIBUTE, "toolbar");
    toolbar.getClientRects = () => [{}] as unknown as DOMRectList;
    toolbar.getBoundingClientRect = () => ({ x: 0, y: 0, width: 120, height: 32 }) as DOMRect;
    frame.append(toolbar);
    // The same mark outside the frame -- another Widget's, or a dialog's -- is not this Widget's part.
    const stranger = createLaidOutElement();
    stranger.setAttribute(PHI_VISUAL_ANCHOR_PART_ATTRIBUTE, "footer");
    registerPhiVisualAnchor(partition, { address: ADDRESS, getElement: () => frame });
    const unregister = registerPhiVisualAnchorParts(partition, ADDRESS, ["toolbar", "footer"]);

    expect(readPhiVisualAnchor(partition, `${ADDRESS}:toolbar` as PhiVisualAnchorAddress)).toBe(toolbar);
    expect(readPhiVisualAnchor(partition, `${ADDRESS}:footer` as PhiVisualAnchorAddress)).toBeNull();
    unregister();
    expect(readPhiVisualAnchor(partition, `${ADDRESS}:toolbar` as PhiVisualAnchorAddress)).toBeNull();
  });

  it("answers the registered element and nothing after unregistering", () => {
    const partition = createPartition();
    const element = createLaidOutElement();
    const unregister = registerPhiVisualAnchor(partition, { address: ADDRESS, getElement: () => element });

    expect(readPhiVisualAnchor(partition, ADDRESS)).toBe(element);
    unregister();
    expect(readPhiVisualAnchor(partition, ADDRESS)).toBeNull();
  });

  it("refuses to choose between two elements under one address", () => {
    const partition = createPartition();
    const first = createLaidOutElement();
    const second = createLaidOutElement();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    registerPhiVisualAnchor(partition, { address: ADDRESS, getElement: () => first });
    const unregisterSecond = registerPhiVisualAnchor(partition, { address: ADDRESS, getElement: () => second });

    expect(readPhiVisualAnchor(partition, ADDRESS)).toBeNull();
    unregisterSecond();
    expect(readPhiVisualAnchor(partition, ADDRESS)).toBe(first);
    errors.mockRestore();
  });

  it("does not answer for another partition holding the same id", () => {
    const live = createPartition("live");
    const canvas = createPartition("canvas");
    registerPhiVisualAnchor(canvas, { address: ADDRESS, getElement: createLaidOutElement });

    expect(readPhiVisualAnchor(live, ADDRESS)).toBeNull();
  });

  it("answers nothing for an element without a box or outside the document", () => {
    const partition = createPartition();
    const hidden = document.createElement("div");
    hidden.getClientRects = () => [] as unknown as DOMRectList;
    document.body.append(hidden);
    registerPhiVisualAnchor(partition, { address: ADDRESS, getElement: () => hidden });
    expect(readPhiVisualAnchor(partition, ADDRESS)).toBeNull();

    const detached = createLaidOutElement();
    detached.remove();
    const other = "region:header_top" as PhiVisualAnchorAddress;
    registerPhiVisualAnchor(partition, { address: other, getElement: () => detached });
    expect(readPhiVisualAnchor(partition, other)).toBeNull();
  });

  it("answers nothing for a box without area, the way a slot that hides itself is drawn", () => {
    const partition = createPartition();
    const collapsed = createLaidOutElement();
    collapsed.getBoundingClientRect = () => ({ x: 0, y: 120, width: 360, height: 0 }) as DOMRect;
    registerPhiVisualAnchor(partition, { address: ADDRESS, getElement: () => collapsed });
    expect(readPhiVisualAnchor(partition, ADDRESS)).toBeNull();
  });

  it("waits for a late registration and gives up at the timeout", async () => {
    vi.useFakeTimers();
    const partition = createPartition();
    const element = createLaidOutElement();

    const found = waitForPhiVisualAnchor(partition, ADDRESS, { timeoutMs: 1000 });
    registerPhiVisualAnchor(partition, { address: ADDRESS, getElement: () => element });
    await expect(found).resolves.toBe(element);

    const missing = waitForPhiVisualAnchor(partition, "region:sider_left" as PhiVisualAnchorAddress, { timeoutMs: 1000 });
    vi.advanceTimersByTime(1000);
    await expect(missing).resolves.toBeNull();
  });

  it("stops waiting when aborted", async () => {
    const partition = createPartition();
    const controller = new AbortController();
    const waiting = waitForPhiVisualAnchor(partition, ADDRESS, { timeoutMs: 60_000, signal: controller.signal });
    controller.abort();
    await expect(waiting).resolves.toBeNull();
  });
});
