import "server-only";

import {
  restorePhiRequestRuntimeStore,
  type PhiCapturedRequestRuntime,
} from "../../server-helpers/request-runtime";

/**
 * Puts the request runtime a Server Action resolved back in place for the render of what it returned.
 *
 * Next renders an Action's returned nodes after the Action has returned, outside the request scope it
 * ran in; whatever below reads the runtime would otherwise find an empty store.
 */
export function PhiRestoredRequestRuntime({
  captured,
  children,
}: {
  captured: PhiCapturedRequestRuntime;
  children: React.ReactNode;
}) {
  restorePhiRequestRuntimeStore(captured);
  return children;
}
