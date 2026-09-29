import {
  usePhiSignalRuntimePartition,
  type PhiSignalRuntimePartition,
} from "../runtime/runtime-signal-partition";

/**
 * The Area a Form tells the Site's form relay it was drawn in: the Area partition the page mounted it
 * under (components/cms/phi-cms-root-layout.tsx).
 *
 * The relay used to take the Area from the `Referer`, which a browser may leave out, and then every
 * submit answered "not active". It is stated instead, and the relay checks what it grants: an Area the
 * Site hosts, that this viewer may enter, whose active Modules own the Form (FORMS.md, Relay).
 *
 * A Form on the Builder canvas names none. The canvas is an isolated partition carrying the Area being
 * authored, and a Form there is a stand-in that must not submit into that Area.
 */
export function resolvePhiFormRelayArea(partition: PhiSignalRuntimePartition | null): string | null {
  for (let current = partition; current; current = current.parent) {
    if (current.kind === "canvas") return null;
    if (current.kind === "area") return current.context.area ?? null;
  }
  return null;
}

export function usePhiFormRelayArea(): string | null {
  return resolvePhiFormRelayArea(usePhiSignalRuntimePartition());
}
