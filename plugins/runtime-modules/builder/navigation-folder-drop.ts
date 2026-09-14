import type { PhiBuilderNavigationItem } from "../../../helpers/cms-navigation-catalog";
import type { PhiPresetPageNode } from "../../../helpers/cms-page-catalog";

/** A Page the Navigation can point at: it has a stable reference and has not been deleted. */
export function isPhiBuilderNavigablePage(node: PhiPresetPageNode) {
  return Boolean(node.reference) && node.tombstoned !== true;
}

/** Whether a catalog node would give the Navigation anything: a live Page, or one somewhere beneath it. */
export function hasPhiBuilderNavigableContent(node: PhiPresetPageNode): boolean {
  return isPhiBuilderNavigablePage(node) || (node.children ?? []).some(hasPhiBuilderNavigableContent);
}

export function findPhiBuilderCatalogNode(
  nodes: readonly PhiPresetPageNode[],
  key: string,
): PhiPresetPageNode | null {
  for (const node of nodes) {
    if (node.key === key) return node;
    const nested = findPhiBuilderCatalogNode(node.children ?? [], key);
    if (nested) return nested;
  }
  return null;
}

export type PhiBuilderCatalogNavigationFactory = {
  /** Called in document order, a container before its children, so ids follow the tree. */
  allocateId: () => Promise<PhiBuilderNavigationItem["id"]>;
  createPageItem: (id: PhiBuilderNavigationItem["id"], page: PhiPresetPageNode) => PhiBuilderNavigationItem | null;
  createContainerItem: (
    id: PhiBuilderNavigationItem["id"],
    label: string,
    children: PhiBuilderNavigationItem[],
  ) => PhiBuilderNavigationItem;
};

async function buildItems(
  nodes: readonly PhiPresetPageNode[],
  factory: PhiBuilderCatalogNavigationFactory,
): Promise<PhiBuilderNavigationItem[]> {
  const items: PhiBuilderNavigationItem[] = [];
  for (const node of nodes) {
    items.push(...await buildNodeItems(node, factory));
  }
  return items;
}

async function buildNodeItems(
  node: PhiPresetPageNode,
  factory: PhiBuilderCatalogNavigationFactory,
): Promise<PhiBuilderNavigationItem[]> {
  if (!hasPhiBuilderNavigableContent(node)) return [];
  const children = node.children ?? [];

  if (isPhiBuilderNavigablePage(node)) {
    if (!children.some(hasPhiBuilderNavigableContent)) {
      const item = factory.createPageItem(await factory.allocateId(), node);
      return item ? [item] : [];
    }
    /*
     * Only a container holds children, so a Page with Pages beneath it becomes one, named after it, with
     * a link to the Page itself first: the level survives and the Page stays reachable.
     */
    const containerId = await factory.allocateId();
    const link = factory.createPageItem(await factory.allocateId(), node);
    const nested = await buildItems(children, factory);
    return [factory.createContainerItem(containerId, node.title, [...(link ? [link] : []), ...nested])];
  }

  if (node.reference) {
    // A deleted Page is not carried over; what lives beneath it still is, one level up.
    return buildItems(children, factory);
  }

  const containerId = await factory.allocateId();
  return [factory.createContainerItem(containerId, node.title, await buildItems(children, factory))];
}

/**
 * A catalog folder dropped onto a Navigation: a container named after the folder, holding what the
 * folder holds -- Pages as links, sub-folders as nested containers. A folder has no route of its own,
 * which is exactly what a container is. Returns null when nothing beneath it can be linked.
 */
export async function buildPhiBuilderNavigationContainerFromCatalogFolder(
  folder: PhiPresetPageNode,
  factory: PhiBuilderCatalogNavigationFactory,
): Promise<PhiBuilderNavigationItem | null> {
  if (folder.reference) return null;
  return (await buildNodeItems(folder, factory))[0] ?? null;
}
