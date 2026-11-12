import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_SEARCH_RUNTIME_MODULE_ID } from "./ids";

/**
 * The Site's own search (SEARCH.md): the box, the results, and the Page the box leads to, in each Area
 * whose Pages are indexed.
 *
 * A Module rather than Core, because the box is only worth placing where something answers it, and what
 * answers it is the Module's own results Page -- never a Page somebody picked that may hold no results.
 * Switched off, the box goes with the Page and the indexer leaves the Area alone; a package that brings a
 * search of its own brings its own box, Page and results the same way, over the same Core endpoints.
 *
 * Public and App: the Areas whose Pages the index holds. The operator's Areas are not searched.
 */
export const PHI_SEARCH_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_SEARCH_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["public", "app"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  title: "Search",
  description: "A search over the Site's own Pages: a box, a results Page, and the index behind them.",
  category: "content",
  icon: "antd:search",
} satisfies PhiRuntimeModuleDefinition;
