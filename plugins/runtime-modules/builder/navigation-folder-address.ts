import type { PhiBuilderNavigationItem } from "../../../helpers/cms-navigation-catalog";
import type { PhiCmsNavigationFolderTarget } from "../../../types/cms-module-descriptors";
import { createPhiPageReference } from "../../../types/references";

/**
 * The Area-relative path a link leads to, package namespace included -- the form a request for a folder
 * address carries -- or null for a link that has none, such as an external one.
 */
export type PhiBuilderNavigationLinkPathResolver = (item: PhiBuilderNavigationItem) => string | null;

function parentFolder(path: string) {
  const index = path.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : "/";
}

/**
 * The path a direct child stands for in its container: a link its target's path, a container its own
 * folder address. Separators and links without a path stand for nothing.
 */
function resolveChildPath(child: PhiBuilderNavigationItem, resolveLinkPath: PhiBuilderNavigationLinkPathResolver): string | null {
  if (child.kind === "container") return resolvePhiBuilderNavigationFolderAddress(child, resolveLinkPath);
  if (child.kind === "link") return resolveLinkPath(child);
  return null;
}

/**
 * The folder a container's direct children share (TODOS.md, "Folder addresses"). Each child contributes
 * the folder it lies in: `/docs/a` and the container `/docs/guides` both contribute `/docs`. Children
 * from different folders, or only from the Area root, which is a slot and no folder, give no address.
 */
export function resolvePhiBuilderNavigationFolderAddress(
  container: PhiBuilderNavigationItem,
  resolveLinkPath: PhiBuilderNavigationLinkPathResolver,
): string | null {
  if (container.kind !== "container") return null;
  const folders = new Set(container.children.flatMap((child) => {
    const path = resolveChildPath(child, resolveLinkPath);
    return path ? [parentFolder(path)] : [];
  }));
  const [only] = folders;
  return folders.size === 1 && only !== "/" ? only : null;
}

export type PhiBuilderNavigationFolderChoice = {
  /** A stable key for the target, usable as a Select value. */
  value: string;
  /** The Area-relative path the child stands for. */
  label: string;
  target: PhiCmsNavigationFolderTarget;
};

export function encodePhiBuilderNavigationFolderTarget(target: PhiCmsNavigationFolderTarget) {
  return target.kind === "page" ? `page:${target.reference}` : `folder:${target.address}`;
}

/** What a direct child stands for as a folder target: a Page by reference, a sub-container by address. */
function resolveChildTarget(
  child: PhiBuilderNavigationItem,
  resolveLinkPath: PhiBuilderNavigationLinkPathResolver,
): PhiBuilderNavigationFolderChoice | null {
  const path = resolveChildPath(child, resolveLinkPath);
  if (!path) return null;
  if (child.kind === "container") {
    const target = { kind: "folder" as const, address: path };
    return { value: encodePhiBuilderNavigationFolderTarget(target), label: path, target };
  }
  const reference = child.targetReference ??
    (child.targetPreset ? createPhiPageReference({ kind: "module", ...child.targetPreset }) : null);
  if (!reference) return null;
  const target = { kind: "page" as const, reference };
  return { value: encodePhiBuilderNavigationFolderTarget(target), label: path, target };
}

/**
 * The targets a container can lead to: what each of its direct children stands for. Two children that
 * stand for the same target are offered once.
 */
export function listPhiBuilderNavigationFolderChoices(
  container: PhiBuilderNavigationItem,
  resolveLinkPath: PhiBuilderNavigationLinkPathResolver,
): PhiBuilderNavigationFolderChoice[] {
  if (container.kind !== "container") return [];
  const seen = new Set<string>();
  return container.children.flatMap((child) => {
    const choice = resolveChildTarget(child, resolveLinkPath);
    if (!choice || seen.has(choice.value)) return [];
    seen.add(choice.value);
    return [choice];
  });
}

/**
 * The choice a container's stored target matches among its children now, or null -- which reads as 404:
 * the target another Navigation carried over, or one a child no longer stands for.
 */
export function findPhiBuilderNavigationFolderChoice(
  container: PhiBuilderNavigationItem,
  resolveLinkPath: PhiBuilderNavigationLinkPathResolver,
): PhiBuilderNavigationFolderChoice | null {
  if (!container.folder?.target) return null;
  const value = encodePhiBuilderNavigationFolderTarget(container.folder.target);
  return listPhiBuilderNavigationFolderChoices(container, resolveLinkPath).find((choice) => choice.value === value) ?? null;
}

/**
 * Brings every container's stored folder address in line with its children as they are now. A container
 * that has an address keeps it even without a target, so a target chosen for the same folder in another
 * Navigation finds it; one with neither carries no folder. The target is left alone: a target no child
 * stands for any more reads as 404.
 */
export function refreshPhiBuilderNavigationFolderAddresses<TItems extends readonly PhiBuilderNavigationItem[]>(
  items: TItems,
  resolveLinkPath: PhiBuilderNavigationLinkPathResolver,
): TItems {
  let changed = false;
  const refreshed = items.map((item) => {
    const children = refreshPhiBuilderNavigationFolderAddresses(item.children, resolveLinkPath);
    let next = children === item.children ? item : { ...item, children };
    if (item.kind === "container") {
      const address = resolvePhiBuilderNavigationFolderAddress(next, resolveLinkPath);
      const target = item.folder?.target ?? null;
      if (address == null && target == null) {
        if (item.folder) next = { ...next, folder: null };
      } else if (address !== (item.folder?.address ?? null) || !item.folder) {
        next = { ...next, folder: { address, target } };
      }
    }
    if (next !== item) changed = true;
    return next;
  });
  // Unchanged trees keep their identity, so a store that compares by reference sees no edit.
  return (changed ? refreshed : items) as TItems;
}

/**
 * Sets the given targets on every container whose folder address they name: the same folder holds one
 * target, within one Navigation as across Navigations.
 */
export function applyPhiBuilderNavigationFolderTargets<TItems extends readonly PhiBuilderNavigationItem[]>(
  items: TItems,
  folders: readonly { address: string; target: PhiCmsNavigationFolderTarget | null }[],
): TItems {
  const targets = new Map(folders.map((folder) => [folder.address, folder.target] as const));
  let changed = false;
  const applied = items.map((item) => {
    const children = applyPhiBuilderNavigationFolderTargets(item.children, folders);
    let next = children === item.children ? item : { ...item, children };
    const address = item.folder?.address;
    if (item.kind === "container" && address && targets.has(address)) {
      const target = targets.get(address) ?? null;
      const same = (item.folder?.target ? encodePhiBuilderNavigationFolderTarget(item.folder.target) : "") ===
        (target ? encodePhiBuilderNavigationFolderTarget(target) : "");
      if (!same) next = { ...next, folder: { address, target } };
    }
    if (next !== item) changed = true;
    return next;
  });
  return (changed ? applied : items) as TItems;
}
