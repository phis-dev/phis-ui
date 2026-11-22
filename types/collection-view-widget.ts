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
import type { PhiMediaKindValue } from "./media";
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
    /**
     * Drag reordering of the items, written back through the bound Provider's action `actionKey`
     * (`"reorder"` by default) with every item key in the new order (`itemKeys`). The Widget stores no
     * order: the Provider's is the order, applied at once on a drop and taken back if refused. Offered
     * in `grid` and `stack` only, and only while the whole collection is shown -- no search text, no
     * filter set apart from the Widget's own initial query, everything on one page.
     */
    reorder?: {
      enabled: boolean;
      actionKey?: string;
    };
    /**
     * Read by the Media renderer (`PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY`) and by no other, whichever
     * Provider it draws: where an upload from its upload panel goes and where its "Choose from Media
     * library" picker opens, and what both offer.
     */
    media?: {
      /**
       * A Folder of the Site Space by its path of names ("Shop Images / {category} / {product}"): an
       * upload goes into it, the missing Folders created, and the picker opens on the deepest of it that
       * is there. `{key}` is the binding param `key` (`source.params` with what `bindingParamsChange`
       * laid over them): a text or a number, trimmed, a `/` in it a `-`, and a name whose placeholder has
       * no value left out whole (`resolvePhiMediaFolderPathTemplate`). Absent: for the Media library's
       * own Collection the Folder its listing has open, for any other the root of the Site Space.
       */
      folderPath?: string;
      /** The one kind the upload takes and the picker lists. Absent: the upload takes every kind, the picker lists images. */
      mediaType?: PhiMediaKindValue;
      /**
       * The picker greys out the Assets that are not delivered publicly; the resource's `add` decides
       * what it takes. Core delivers what goes into the Site Space publicly by default.
       */
      publicOnly?: boolean;
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
