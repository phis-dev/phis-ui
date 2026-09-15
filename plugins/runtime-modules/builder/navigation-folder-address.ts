import type { PhiBuilderNavigationItem } from "../../../helpers/cms-navigation-catalog";

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

/** The direct children a container can lead to, each with the path it stands for. */
export function listPhiBuilderNavigationFolderChoices(
  container: PhiBuilderNavigationItem,
  resolveLinkPath: PhiBuilderNavigationLinkPathResolver,
): { value: string; label: string }[] {
  if (container.kind !== "container") return [];
  return container.children.flatMap((child) => {
    const path = resolveChildPath(child, resolveLinkPath);
    return path ? [{ value: child.id, label: path }] : [];
  });
}

/**
 * Brings every container's stored folder address in line with its children as they are now. The choice
 * is left alone: a choice that is no longer a direct child reads as no target when it is looked up.
 */
export function refreshPhiBuilderNavigationFolderAddresses<TItems extends readonly PhiBuilderNavigationItem[]>(
  items: TItems,
  resolveLinkPath: PhiBuilderNavigationLinkPathResolver,
): TItems {
  let changed = false;
  const refreshed = items.map((item) => {
    const children = refreshPhiBuilderNavigationFolderAddresses(item.children, resolveLinkPath);
    const next = children === item.children ? item : { ...item, children };
    const address = item.kind === "container" && item.folder
      ? resolvePhiBuilderNavigationFolderAddress(next, resolveLinkPath)
      : undefined;
    const result = address === undefined || address === item.folder?.address
      ? next
      : { ...next, folder: { ...item.folder!, address } };
    if (result !== item) changed = true;
    return result;
  });
  // Unchanged trees keep their identity, so a store that compares by reference sees no edit.
  return (changed ? refreshed : items) as TItems;
}
