import { buildPhiSidebarRoutePresetDescriptor } from "./sidebar-route";
import type {
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";
import type { PhiContentEntryKind } from "../../constants/content-entry-kinds";
import type { PhiFormId } from "../../types/form-id";
import type { PhiGlobalTranslatorOptions } from "../../gateway/tr";
import type { PhiContentEntryKindEditorLabels } from "../../components/regions/presets/content-entry-editor-page-tree";
import { readPhiServerApiCredentials } from "../../helpers/phis-server-credentials";

type PhiEntryListPresentationName = "stack" | "cards" | "compact";

/**
 * What a content kind's Module says about its Pages (`CONTENT_ENTRIES.md`, A kind's Module): its nouns,
 * its keys, and the few places where its Pages differ from another kind's. Everything else -- the frame,
 * the Widgets, the order, the wiring -- is the same for every kind and lives in the shared builders.
 */
export type PhiContentEntryRoutesSpec = {
  kind: PhiContentEntryKind;
  ownerModuleId: PhiRuntimeModuleId;
  /** The Module's three Pages, by the keys every node on them is identified under. */
  presetKeys: { list: string; detail: string; editor: string };
  formIds: { entry: PhiFormId; publication: PhiFormId; curation: PhiFormId; category: PhiFormId };
  /** The list Page's title and the navigation entries' label: "Blog". */
  title: string;
  /** The detail Page's title in the route table: "Blog post". */
  entryTitle: string;
  icon: string;
  /** How the list Page shows its entries. */
  listPresentation: PhiEntryListPresentationName;
  /** What a detail Page's header shows (`constants/content-entry-parts.ts`). */
  headerParts: number;
  /** The list under an entry: its presentation and its heading's source text. */
  related: { presentation: PhiEntryListPresentationName; title: string };
  /** The kind's own editor nouns, loaded only when the editor Page is built. */
  loadKindLabels: () => Promise<(options: PhiGlobalTranslatorOptions) => Promise<PhiContentEntryKindEditorLabels>>;
};

/**
 * A content kind's three Pages: the Public list at `/<kind>`, one entry at `/<kind>/:slug`, and the editor
 * Page at `/<kind>` in the Editor Area.
 *
 * Nothing is seeded: the Pages and their navigation entries are computed per request from the compiled
 * catalog once the Module is active for the Area. A Site may rename, reorder or tombstone the header entry
 * through the navigation overlay, and may not hide it -- which is the rule that keeps a Module's address
 * reachable. Indexable, unlike the auth Pages: a Site's entries are exactly the kind of page a search
 * engine should find, so no `NoIndex` flag is set.
 *
 * The navigation item keys are derived from the Module id and the kind, the way they were written by hand:
 * they are stored identifiers, and a derivation cannot drift from one Module to the next.
 */
export function definePhiContentEntryRoutes(spec: PhiContentEntryRoutesSpec) {
  const path = `/${spec.kind}`;
  return [
    {
      ownerModuleId: spec.ownerModuleId,
      presetKey: spec.presetKeys.list,
      presetVersion: 1,
      area: "public" as const,
      title: spec.title,
      path,
      navigation: [{
        // Unanchored: the Public header exports no base item, so the entry lands at the end of the surface.
        navKey: "public:header" as const,
        parentItemKey: null,
        item: {
          itemKey: `${spec.ownerModuleId}/nav/public/${spec.kind}`,
          label: { defaultMessage: spec.title },
          icon: spec.icon,
          routePresetKey: spec.presetKeys.list,
        },
      }],
      loadTree: ({ page }: PhiCmsDescriptorBuildContext) =>
        import("../../components/regions/presets/content-entry-public-page-trees")
          .then((module) => module.buildPhiContentEntryListPageTree({
            page,
            kind: spec.kind,
            ownerModuleId: spec.ownerModuleId,
            presetKey: spec.presetKeys.list,
            detailPresetKey: spec.presetKeys.detail,
            presentation: spec.listPresentation,
          })),
    },
    /*
     * One entry by its address. No navigation entry: it is reached from the list, and a slug that names no
     * published entry answers 404.
     */
    {
      ownerModuleId: spec.ownerModuleId,
      presetKey: spec.presetKeys.detail,
      presetVersion: 1,
      area: "public" as const,
      title: spec.entryTitle,
      path: `${path}/:slug`,
      // Typed by the descriptor: a route with a parameter is handed its `params`, a plain one is not.
      loadTree: ({ page, runtime, params }) =>
        import("../../components/regions/presets/content-entry-public-page-trees")
          .then((module) => module.buildPhiContentEntryDetailPageTree({
            page,
            runtime,
            params,
            kind: spec.kind,
            ownerModuleId: spec.ownerModuleId,
            presetKey: spec.presetKeys.detail,
            headerParts: spec.headerParts,
            related: spec.related,
          })),
    },
    /*
     * Where the entries are written, contributed by the kind's Module rather than by the Area.
     *
     * `anchor: "main"` rather than a parent item key: the sidebar exports roles, not items, and naming
     * another Module's entry would make this one depend on it being there.
     */
    buildPhiSidebarRoutePresetDescriptor({
      area: "editor",
      anchor: "main",
      ownerModuleId: spec.ownerModuleId,
      presetKey: spec.presetKeys.editor,
      title: spec.title,
      path,
      itemKey: `${spec.ownerModuleId}/nav/editor/${spec.kind}`,
      icon: spec.icon,
      loadTree: async ({ page, runtime }) => {
        const [{ buildPhiContentEntryEditorPageTree }, getKindLabels] = await Promise.all([
          import("../../components/regions/presets/content-entry-editor-page-tree"),
          spec.loadKindLabels(),
        ]);
        const credentials = readPhiServerApiCredentials();
        return buildPhiContentEntryEditorPageTree({
          page,
          runtime,
          kind: spec.kind,
          ownerModuleId: spec.ownerModuleId,
          presetKey: spec.presetKeys.editor,
          formIds: spec.formIds,
          kindLabels: await getKindLabels({
            apiBaseUrl: credentials.apiBaseUrl,
            internalToken: credentials.internalToken,
            locale: runtime.locale.current,
          }),
        });
      },
    }),
  ] satisfies readonly PhiCmsRoutePresetDescriptor[];
}
