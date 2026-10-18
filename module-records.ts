/**
 * What a Module package needs to serve a record Provider and to draw what one answers, and nothing else
 * (MODULES.md, Record Providers).
 *
 * Narrow for the reason `@phis/ui/module/dashboard-cards` is: a package outside this one reads it from the
 * Server half every route of the Site imports. A Provider's resolver is the package's own function; the
 * types say what it is asked with, `fetchPhiSiteApi` asks Core with the credentials the context carries,
 * and `resolvePhiRecordSource` is how one of the package's Server Widgets reads the record its binding
 * names -- once per request, however many Widgets are bound to it.
 */

import "server-only";

export type {
  PhiRuntimeModuleRecordProviderServerDefinition,
  PhiRuntimeRecordProviderContext,
  PhiRuntimeRecordProviderResolver,
} from "./types/record-provider";
export { resolvePhiRecordSource, type PhiRecordSourceResult } from "./server-helpers/record-source";
export { fetchPhiSiteApi, type PhiSiteApiRequest } from "./gateway/site-api-request";
