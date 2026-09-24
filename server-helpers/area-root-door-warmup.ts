import "server-only";

import { peekPhiAreaRootDoor, rememberPhiAreaRootDoor } from "../gateway/area-root-door";
import { findFirstPhiCmsNavigationLinkPath } from "../components/regions/presets/navigation-redirect";
import { resolvePhiCmsActiveNavigationSurfaces } from "../plugins/runtime-modules/descriptor-compiler";
import { resolvePhiAreaRootRouteNavKey } from "../plugins/runtime-modules/area-root-route";
import { resolvePhiAreaRootRouteDecision } from "./area-root-route";
import { localizeAreaPath } from "../helpers/locale";
import type { PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiBlockRuntime } from "../types";
import type {
  PhiCmsCompiledDescriptorCatalog,
  PhiRuntimeModuleId,
} from "../types/cms-module-descriptors";

/**
 * Where this Area's root leads, worked out without waiting for somebody to ask for it.
 *
 * The proxy answers an Area root with a real HTTP 307 once a door is known
 * ([area-root-door.ts](../gateway/area-root-door.ts)), and that is the difference between one navigation
 * across an Area boundary and dozens. Without this, a door became known only when the root was actually
 * rendered -- which is the one address nobody visits, because every link into an Area goes to a Page.
 *
 * So the work happens during *any* request in the Area, where everything it needs is already in hand: the
 * Area preset, the Module selection and the descriptor catalog. The result is only ever the same answer
 * the root's own render would give, which is why the decision below is the *same function* that render
 * calls rather than a second reading of the same configuration.
 *
 * **What this does not reach**, and it is worth knowing before trying again: the first request into an
 * Area cannot be helped by it. That request *is* the one that would warm the door, and this runs inside
 * its own Layout, after the proxy has already let it through. Warming an Area from outside would mean one
 * render reaching another Area's descriptor catalog, which is the boundary
 * ([NEXT_INTEGRATION.md](../NEXT_INTEGRATION.md)) this whole mechanism exists to respect. Measured: after
 * any visit to any Page of an Area, a cross-Area `Link` into it costs one navigation; with nobody having
 * been in it, 42. TODOS.md carries the two candidates that would close the rest.
 *
 * Public is left out. Its root is a locale segment and a landing Page rather than a forward, and the
 * proxy's Area-root branch never sees it.
 */
export async function warmPhiAreaRootDoor({
  area,
  config,
  runtime,
  catalog,
  activeModuleIds,
}: {
  area: PhiCmsAreaKey;
  config: Record<string, unknown> | null | undefined;
  runtime: PhiBlockRuntime;
  catalog: PhiCmsCompiledDescriptorCatalog;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
}) {
  if (area === "public") {
    return;
  }
  if (await peekPhiAreaRootDoor(area)) {
    return;
  }

  /*
   * `requestedStoragePath` is `/` because the question is about the root, whatever this request asked
   * for. A `page` decision means the Builder chose a landing Page, so there is no door at all and
   * nothing to remember: the proxy stays cold for this Area and the render answers, which is correct
   * because the render does not forward either.
   */
  const decision = await resolvePhiAreaRootRouteDecision({
    config,
    requestedStoragePath: "/",
    runtime,
    area,
    catalog,
    activeModuleIds,
  });
  if (decision?.kind === "page") {
    return;
  }

  /*
   * `null` is the untouched case, where the code-owned preset answers by forwarding to the first entry of
   * the Area's own Navigation -- the same walk `buildPhiAreaRootRedirectTree` makes, over the same
   * unfiltered surface, skipping the root's own path so a sidebar still pointing at `/` cannot send the
   * door back to itself.
   */
  const areaLocalPath = decision?.kind === "forward"
    ? decision.path
    : findFirstPhiCmsNavigationLinkPath(
      resolvePhiCmsActiveNavigationSurfaces({ catalog, area, activeModuleIds })
        .find((surface) => surface.navKey === resolvePhiAreaRootRouteNavKey(area))
        ?.items ?? [],
      "/",
    );
  if (!areaLocalPath) {
    return;
  }

  rememberPhiAreaRootDoor(area, localizeAreaPath(runtime.locale.current, area, areaLocalPath));
}
