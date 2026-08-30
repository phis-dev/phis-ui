"use client";

import { usePhiSignalRuntimePartition } from "../runtime/runtime-signal-partition";
import type { PhiSignalRuntimePartitionKind } from "../runtime/runtime-signal-partition";
import type { PhiMediaSpaceOption } from "../../types/media";

/**
 * Which surface may name a Media Space, and which is pinned to the Site Space.
 *
 * A Space is a place a person works in, not a place content is authored from. Someone in `app` works
 * inside their own Space and the Spaces of their groups, so they choose. Everything an author builds is
 * Site content, so Builder and Editor stay on the Site Space -- otherwise a published Page could end up
 * pointing at an Asset that only one group may read. `public` never picks at all.
 *
 * The partition kind is what makes this reliable rather than advisory: a Builder canvas renders the
 * Area it edits, so its `area` really is `app` while it previews the App. Only a live Area partition is
 * someone actually working in that Area; a `canvas` partition is always authoring.
 *
 * This is an interface rule, not the authorization boundary. The control plane resolves every requested
 * Space against the actor's own authority and answers `space_forbidden` regardless of what asked.
 */
export const PHI_MEDIA_SPACE_SELECTING_AREAS = ["app"] as const;

export function canPhiSurfaceSelectMediaSpace(input: {
  partitionKind: PhiSignalRuntimePartitionKind | null;
  area: string | null;
}) {
  if (input.partitionKind !== "area") {
    return false;
  }
  return (PHI_MEDIA_SPACE_SELECTING_AREAS as readonly string[]).includes(input.area ?? "");
}

export function usePhiMediaSpaceSelectionAllowed() {
  const partition = usePhiSignalRuntimePartition();
  return canPhiSurfaceSelectMediaSpace({
    partitionKind: partition?.kind ?? null,
    area: partition?.context.area ?? null,
  });
}

/**
 * The label a Space carries in the selector.
 *
 * A group Space is named after its group, because that is what a member recognizes. The Site Space and
 * a personal Space have no name of their own and fall back to what they are.
 */
export function readPhiMediaSpaceOptionLabel(
  space: PhiMediaSpaceOption,
  labels: { site: string; user: string; group: string },
) {
  if (space.kind === "group") return space.name?.trim() || labels.group;
  return space.kind === "user" ? labels.user : labels.site;
}

export function buildPhiMediaSpaceOptions(
  spaces: readonly PhiMediaSpaceOption[],
  labels: { site: string; user: string; group: string },
) {
  return spaces.map((space) => ({
    value: space.address,
    label: readPhiMediaSpaceOptionLabel(space, labels),
  }));
}
