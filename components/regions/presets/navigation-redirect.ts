import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { readPhiCmsNavigationTargetPath } from "../../../helpers/navigation-target";
import type { PhiCmsResolvedNavigationItem } from "../../../types/cms-module-descriptors";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

/**
 * What every redirecting preset shares: how a destination is found inside a navigation surface, and
 * what the tree of a page that only forwards looks like.
 *
 * Two presets resolve a destination this way -- the Settings container root and the Area root -- and
 * they differ only in where they start looking. What they must not differ in is the shape of the
 * answer, so the tree factories live here rather than in either of them.
 */

export function findPhiCmsNavigationItemById(
  items: readonly PhiCmsResolvedNavigationItem[],
  id: PhiCmsResolvedNavigationItem["id"],
): PhiCmsResolvedNavigationItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    const child = findPhiCmsNavigationItemById(item.children, id);
    if (child) {
      return child;
    }
  }
  return null;
}

/**
 * The first place a navigation subtree actually goes.
 *
 * An Overlay opener is not a destination, so it can never be what a redirect lands on. Neither is the
 * path the redirecting page itself answers: an Area root whose sidebar still carries an item pointing
 * at "/" would forward to itself forever, which is the whole reason `skipPath` exists.
 */
export function findFirstPhiCmsNavigationLinkPath(
  items: readonly PhiCmsResolvedNavigationItem[],
  skipPath?: string,
): string | null {
  for (const item of items) {
    const path = readPhiCmsNavigationTargetPath(item.target);
    if (item.kind === "link" && path && path !== skipPath) {
      return path;
    }
    const childPath = findFirstPhiCmsNavigationLinkPath(item.children, skipPath);
    if (childPath) {
      return childPath;
    }
  }
  return null;
}

/**
 * A page that resolves by forwarding.
 *
 * Always temporary: what the destination is depends on which Modules are on and what the viewer may
 * see, so a permanent redirect would hand a browser a cache entry that outlives the reason for it.
 */
export function buildPhiCmsRedirectPageTree({
  page,
  area,
  path,
  title,
}: {
  page: PhiCmsPageNode;
  area: PhiCmsAreaKey;
  path: string;
  title: string;
}): PhiResolvedCmsPageTree {
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Redirect,
      status: PhiCmsStatus.Published,
      layoutConfig: {
        redirect: {
          target: { area, path },
          status: 307,
        },
      },
    },
    pageMeta: {
      title: { msgId: 0, source: title, value: title },
      description: null,
    },
    overlays: [],
    regions: [],
    layoutNodes: [],
    contentWidgets: [],
  };
}

/**
 * A page with nothing on it, for the redirect that found nowhere to go.
 *
 * The alternative would be forwarding to a guessed path, and a guess that is wrong is worse than an
 * empty page: it turns a Module the Builder switched off into a 404 on the Area's front door.
 */
export function buildPhiCmsEmptyPageTree({
  page,
  title,
}: {
  page: PhiCmsPageNode;
  title: string;
}): PhiResolvedCmsPageTree {
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: { msgId: 0, source: title, value: title },
      description: null,
    },
    overlays: [],
    regions: [],
    layoutNodes: [],
    contentWidgets: [],
  };
}
