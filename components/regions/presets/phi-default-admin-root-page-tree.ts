import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

export function buildPhiDefaultAdminRootPageTree({
  page,
}: {
  page: PhiCmsPageNode;
}): PhiResolvedCmsPageTree {
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: {
        msgId: 0,
        source: "Admin",
        value: "Admin",
      },
      description: null,
    },
    regions: [],
    overlays: [],
    layoutNodes: [],
    contentWidgets: [],
  };
}
