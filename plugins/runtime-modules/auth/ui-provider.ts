import type {
  PhiBlockRuntime,
  PhiCmsAreaKey,
  PhiRuntimeModuleCatalog,
  PhiRuntimeModuleId,
} from "../../../types";
import { createPhiControllerSignalAddress } from "../../../types/signals";
import { resolvePhiRuntimeModuleAreaRoutePath } from "../../../helpers/runtime-module-route-path";
import { phiAreaPath } from "../../../helpers/locale";

/**
 * The Area the Account menu's own Pages belong to.
 *
 * Profile and account security are what a signed-in person does with their own account, and that is App
 * wherever the menu is drawn -- the Public shell's Account menu links into App, it does not grow a copy
 * of those Pages. So the addresses in this projection are resolved against App and not against the Area
 * the projection was asked for; the Area only decides which capabilities are on offer.
 */
const PHI_ACCOUNT_PAGE_AREA = "app";

/**
 * The Area a sign-out answers in.
 *
 * Public, and not because the Page happens to live there: somebody on their way out of a session has
 * no Area to be in by the time the Page has done its work. Public is the Site's own address space, so
 * the declared path is also the served one -- no package, no Area in front of it.
 */
const PHI_LOGOUT_PAGE_AREA = "public";

/**
 * One of the Account Pages, as an address a link can use.
 *
 * A Module declares these the way it declares a route -- relative to itself -- so the projection owes its
 * consumers the address the Page is actually served at: the Module's package, then the Area, the same two
 * steps the route table takes. The Account Widget used to add only the Area and pointed at `/app/security`
 * for a Page that lives at `/app/phis/ui/security`.
 *
 * `phiAreaPath` hands an absolute URL straight back, which is why its result is not Site-relative by type.
 * What goes in here is a declared route path, so what comes out is.
 */
function resolvePhiAccountPageHref(
  moduleId: PhiRuntimeModuleId,
  declaredPath: `/${string}` | undefined,
) {
  if (!declaredPath) {
    return undefined;
  }

  return phiAreaPath(
    PHI_ACCOUNT_PAGE_AREA,
    resolvePhiRuntimeModuleAreaRoutePath(moduleId, PHI_ACCOUNT_PAGE_AREA, declaredPath),
  ) as `/${string}`;
}

export function resolvePhiAuthUiRuntimeProjection(
  catalog: PhiRuntimeModuleCatalog,
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
  area: PhiCmsAreaKey,
): PhiBlockRuntime["authUiProvider"] {
  const providers = [...activeModuleIds].flatMap((moduleId) => {
    const definition = catalog.get(moduleId)?.definition;
    const provider = definition?.authUiProvider;
    const controller = definition?.controller;
    if (!provider || !controller) {
      return [];
    }
    const capabilities = provider.capabilitiesByArea[area];
    return capabilities?.length ? [{ moduleId, provider, controller, capabilities }] : [];
  });

  if (providers.length > 1) {
    throw new Error(
      `Area resolves more than one Auth UI provider: ${providers.map(({ moduleId }) => moduleId).join(", ")}.`,
    );
  }

  const resolved = providers[0];
  if (!resolved) {
    return null;
  }

  const accountSecurityPath = resolvePhiAccountPageHref(
    resolved.moduleId,
    resolved.provider.accountSecurityPath,
  );
  const accountProfilePath = resolvePhiAccountPageHref(
    resolved.moduleId,
    resolved.provider.accountProfilePath,
  );

  const logoutPath = resolved.provider.logoutPath
    ? resolvePhiRuntimeModuleAreaRoutePath(
        resolved.moduleId,
        PHI_LOGOUT_PAGE_AREA,
        resolved.provider.logoutPath,
      )
    : undefined;

  return {
    moduleId: resolved.moduleId,
    providerKey: resolved.provider.providerKey,
    capabilities: resolved.capabilities,
    ...(accountSecurityPath ? { accountSecurityPath } : {}),
    ...(accountProfilePath ? { accountProfilePath } : {}),
    ...(logoutPath ? { logoutPath } : {}),
    controllerAddress: createPhiControllerSignalAddress(
      resolved.controller.pluginKey,
      resolved.controller.key,
      "default",
    ),
  };
}
