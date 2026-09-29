import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiRenderableBlockEffects } from "../../../types/renderable-block";
import {
  builderWorkspaceStore,
  completePhiDeveloperBuilderEffectsEditor,
  getPhiDeveloperBuilderStateSnapshot,
  openPhiDeveloperBuilderEffectsEditor,
  previewPhiDeveloperBuilderEffects,
  readPhiDeveloperBuilderEffectsPreview,
} from "./developer-workspace-store";
import { readPhiBuilderEffectsOpacity } from "./effects-form-values";

const SCOPE = "public";
const WIDGET = "w-1" as PhiCmsInstanceId;
const OTHER_WIDGET = "w-2" as PhiCmsInstanceId;

/** What the editor opened with: the value the node goes back to when nothing is chosen. */
const OPENED: PhiRenderableBlockEffects = { opacity: 1, transitionOnce: true };

beforeEach(() => {
  builderWorkspaceStore.reset(SCOPE);
});

function openForWidget(onCommit = vi.fn()) {
  openPhiDeveloperBuilderEffectsEditor(SCOPE, OPENED, { kind: "widget", blockId: WIDGET }, onCommit);
  return getPhiDeveloperBuilderStateSnapshot(SCOPE).effectsEditorRequest!;
}

describe("the Transparency the Appearance section states", () => {
  it("is the opacity that is left of the block", () => {
    expect(readPhiBuilderEffectsOpacity({ transparency: 0 })).toBe(1);
    expect(readPhiBuilderEffectsOpacity({ transparency: 40 })).toBe(0.6);
    expect(readPhiBuilderEffectsOpacity({ transparency: 100 })).toBe(0);
  });

  it("reads a whole block where nothing was said, and stays inside the range", () => {
    expect(readPhiBuilderEffectsOpacity({})).toBe(1);
    expect(readPhiBuilderEffectsOpacity(null)).toBe(1);
    expect(readPhiBuilderEffectsOpacity({ transparency: "40" })).toBe(1);
    expect(readPhiBuilderEffectsOpacity({ transparency: 140 })).toBe(0);
    expect(readPhiBuilderEffectsOpacity({ transparency: -20 })).toBe(1);
  });
});

describe("what the canvas draws while the Effects editor stands open", () => {
  it("shows the node whose editor it is what that editor shows", () => {
    const request = openForWidget();
    previewPhiDeveloperBuilderEffects(SCOPE, request.correlationId, { ...OPENED, opacity: 0.4 });
    const state = getPhiDeveloperBuilderStateSnapshot(SCOPE);

    expect(readPhiDeveloperBuilderEffectsPreview(state, "widget", WIDGET)?.opacity).toBe(0.4);
  });

  it("shows nothing to the node beside it, nor to a Layout of the same id", () => {
    const request = openForWidget();
    previewPhiDeveloperBuilderEffects(SCOPE, request.correlationId, { ...OPENED, opacity: 0.4 });
    const state = getPhiDeveloperBuilderStateSnapshot(SCOPE);

    expect(readPhiDeveloperBuilderEffectsPreview(state, "widget", OTHER_WIDGET)).toBeNull();
    expect(readPhiDeveloperBuilderEffectsPreview(state, "layout", WIDGET)).toBeNull();
  });

  it("draws nothing before a value has moved", () => {
    openForWidget();
    const state = getPhiDeveloperBuilderStateSnapshot(SCOPE);

    expect(state.effectsEditorRequest?.preview).toBeNull();
    expect(readPhiDeveloperBuilderEffectsPreview(state, "widget", WIDGET)).toBeNull();
  });

  /*
   * A message can outlive the editor that sent it -- the last drag step and the press on Save are two
   * events, and the second may be handled first. Naming the request is what keeps a picture from being
   * put back on a node nobody is editing any more.
   */
  it("ignores a value from an editor that has since closed", () => {
    const request = openForWidget();
    completePhiDeveloperBuilderEffectsEditor(SCOPE, request);
    previewPhiDeveloperBuilderEffects(SCOPE, request.correlationId, { ...OPENED, opacity: 0.4 });
    const state = getPhiDeveloperBuilderStateSnapshot(SCOPE);

    expect(state.effectsEditorRequest).toBeNull();
    expect(readPhiDeveloperBuilderEffectsPreview(state, "widget", WIDGET)).toBeNull();
  });

  it("is gone once the editor is, and the commit is what is left", () => {
    const onCommit = vi.fn();
    const request = openForWidget(onCommit);
    previewPhiDeveloperBuilderEffects(SCOPE, request.correlationId, { ...OPENED, opacity: 0.4 });
    completePhiDeveloperBuilderEffectsEditor(SCOPE, request, { ...OPENED, opacity: 0.25 });

    expect(getPhiDeveloperBuilderStateSnapshot(SCOPE).effectsEditorRequest).toBeNull();
    expect(onCommit).toHaveBeenCalledWith({ ...OPENED, opacity: 0.25 });
  });

  it("leaves the draft alone: a preview writes no history and commits nothing", () => {
    const onCommit = vi.fn();
    const request = openForWidget(onCommit);
    previewPhiDeveloperBuilderEffects(SCOPE, request.correlationId, { ...OPENED, opacity: 0.4 });

    expect(onCommit).not.toHaveBeenCalled();
    expect(getPhiDeveloperBuilderStateSnapshot(SCOPE).effectsEditorRequest?.effects).toEqual(OPENED);
  });
});
