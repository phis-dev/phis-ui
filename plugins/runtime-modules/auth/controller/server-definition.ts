import "server-only";

import { cookies } from "next/headers";

import {
  PHI_AUTH_CONTROLLER_DEFINITION,
  type PhiAuthControllerPreload,
} from "./area-base-controller-definitions";
import { fetchPhiAuthWorkflow } from "../../gateway/auth-public-manifest";
import { readPhiServerApiCredentials } from "../../helpers/phis-server-credentials";
import type { PhiRuntimeControllerDefinition } from "../../types/cms-plugins";

/**
 * Where the viewer stands in signing in, read while the page renders.
 *
 * This is what closes the gap the Auth Module has had all along: the second-factor state arrived as a
 * field on the login response and lived in a Widget's `useState`, so a reload part-way through lost a
 * state Core would still have answered for. Read here, a reload is the re-read.
 *
 * It costs nothing for the visitors who are not signing in. `fetchPhiAuthWorkflow` returns without a
 * request when there is no Session cookie, which is almost everybody, and a request that carries one is
 * never rendered statically ([STATIC_RENDERING.md](../../STATIC_RENDERING.md)) -- so a viewer part-way
 * through a factor gets a dynamic render and a real answer, and an anonymous one gets a cached page and
 * `anonymous`, which is the truth for them.
 */

export const PHI_AUTH_CONTROLLER_SERVER_DEFINITION = {
  ...PHI_AUTH_CONTROLLER_DEFINITION,
  serverPreload: async ({ runtime }): Promise<PhiAuthControllerPreload> => {
    /*
     * A viewer Core already counts as authenticated is `complete`, and asking would only confirm it.
     *
     * This Controller mounts in Public, Admin and App, so without this every page view by a signed-in
     * visitor would pay a round trip to be told what the Session cookie it arrived with already
     * settled. What is left is the case this exists for: a request that carries a Session which is not
     * finished -- somebody part-way through a second factor -- which is rare and worth one request.
     */
    if (runtime.viewer.access === "authenticated") {
      return { workflow: { state: "complete", methodKey: null, next: "" }, unavailable: false };
    }

    const credentials = readPhiServerApiCredentials();
    const cookieStore = await cookies();
    try {
      return {
        workflow: await fetchPhiAuthWorkflow({
          apiBaseUrl: credentials.apiBaseUrl,
          internalToken: credentials.internalToken,
          siteKey: runtime.site.key,
          cookieHeader: cookieStore.toString(),
        }),
        unavailable: false,
      };
    } catch {
      /*
       * A Login page that will not render because Core is slow is worse than one that cannot say where
       * somebody stands. The distinction is kept rather than swallowed, so the Controller can leave the
       * machine alone instead of claiming `anonymous`.
       */
      return { workflow: null, unavailable: true };
    }
  },
} satisfies PhiRuntimeControllerDefinition<Record<string, never>, PhiAuthControllerPreload>;
