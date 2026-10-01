import type {
  PhiCmsCollectionCardPresentation,
  PhiCmsCollectionFilterPresentation,
  PhiCmsCollectionToolbarActionPresentation,
  PhiCmsCollectionViewMode,
} from "./core-widget-placements";
import type { PhiControlSize } from "./control";
import type { PhiCollectionProviderQuery } from "./collection-provider";
import type { PhiProviderResourceSource } from "./runtime-data-provider";
import type { PhiSignalRouteSet } from "./signals";
import type { PhiCssLength } from "./length";
import type { PhiCmsWidgetConfigBase } from "../components/widgets/config/parser-primitives";

/**
 * A Collection View's parsed config, as the item renderer it hands its items to receives it.
 *
 * The Foundation's because the renderer is often not the Collection View's Module: a Module registers a
 * collection item renderer for its own rows -- the Dashboard's cards, the Media library's tiles -- and
 * the View passes it this config with the binding. A renderer that had to import the Core Widget's
 * config to type its props would be a Module importing another Module.
 */
export type PhiCmsCollectionViewWidgetConfig = PhiCmsWidgetConfigBase & {
  presentation: {
    title?: string;
    description?: string;
    /** Read by the card View and by no other: a View that draws something else ignores it. */
    card?: PhiCmsCollectionCardPresentation;
    mode: PhiCmsCollectionViewMode;
    gap?: PhiCssLength;
    minColumnWidth?: PhiCssLength;
    emptyDescription?: string;
    controlSize?: PhiControlSize;
    labels?: Record<string, unknown>;
  };
  features: {
    tools: {
      mode: "self-contained" | "external";
      reload?: boolean;
      reset?: boolean;
    };
    search?: {
      enabled: boolean;
      placeholder?: string;
      minWidth?: PhiCssLength;
    };
    filters?: PhiCmsCollectionFilterPresentation[];
    actions?: {
      toolbar?: PhiCmsCollectionToolbarActionPresentation[];
    };
    pagination?: {
      enabled: boolean;
      pageSize?: number;
      /** The page sizes a reader may switch between. Absent, the collection offers no choice. */
      pageSizes?: readonly number[];
      /** The short pager: previous, the page, next. */
      compact?: boolean;
    };
  };
  initialQuery?: PhiCollectionProviderQuery;
  source: PhiProviderResourceSource | null;
  /**
   * A renderer other than the one the bound provider ships.
   *
   * The provider's resource names the Render Client it comes with, and that is what draws the items
   * unless a Site says otherwise here. A Module that does not own the resource registers another Client
   * for the same items under its own key, and naming that key is how a Site chooses it -- which is the
   * only way to show somebody else's objects your way without forking the provider.
   *
   * A key whose Module is not active in this Area is reported in the block rather than thrown.
   */
  itemRendererKey?: string | null;
  signalRoutes?: PhiSignalRouteSet | null;
};
