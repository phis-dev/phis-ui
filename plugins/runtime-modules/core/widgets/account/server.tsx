import { getResolvedSiteConfig } from "../../../../../gateway/site-config";
import { localizeAreaPath } from "../../../../../helpers/locale";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { getPhiCmsPage } from "../../../../../server-helpers/cms";
import type { PhiBlockRuntime } from "../../../../../types";
import type {
  PhiAccountWidgetLabels,
  PhiAccountWidgetClientProps,
  PhiAccountWidgetConfig,
} from "./client";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { resolvePhiDescriptorNavigationItems } from "../../../../../components/widgets/navigation-descriptor-resolver.server";

export type { PhiAccountWidgetConfig } from "./client";
import { getPhiAccountMenuLabels } from "../../../../../components/widgets/label-sets/account";

export type PhiAccountWidgetGuestState = {
  kind: "guest";
  registerHref: string;
  forgotPasswordHref?: string;
};

export type PhiAccountWidgetAuthenticatedState = {
  kind: "authenticated";
  profileHref?: string;
  settingsHref?: string;
  logoutHref?: string;
  displayName?: string;
};

export type PhiAccountWidgetState = PhiAccountWidgetGuestState | PhiAccountWidgetAuthenticatedState;

export type PhiAccountWidgetProps = Pick<
  PhiAccountWidgetClientProps,
  "avatarSrc" | "avatarAlt" | "successAction" | "state" | "config"
> & {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area" | "phis" | "authUiProvider">;
};

async function resolveProfileHref(runtime: PhiAccountWidgetProps["runtime"]) {
  if (runtime.viewer.access !== "authenticated") {
    return undefined;
  }

  const page = await getPhiCmsPage({
    path: "/app/profile",
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    siteKey: runtime.site.key,
    locale: runtime.locale.current,
  }).catch(() => null);

  return page ? localizeAreaPath(runtime.locale.current, "app", "/profile") : undefined;
}

export async function PhiAccountWidget({
  runtime,
  avatarSrc,
  avatarAlt,
  successAction = "reload",
  state,
  config: widgetConfig,
}: PhiAccountWidgetProps) {
  const rt = phiRuntime(runtime);
  const labelOptions = {
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  };
  const [
    site,
    accountLabels,
    profileHref,
    contributedItems,
  ] = await Promise.all([
    getResolvedSiteConfig({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
    }),
    getPhiAccountMenuLabels(labelOptions),
    state.kind === "authenticated" && !state.profileHref
      ? resolveProfileHref(runtime)
      : Promise.resolve(undefined),
    /*
     * What Modules contributed to this Area's account menu.
     *
     * Only for a signed-in viewer: the entries are about the person, and a guest has none. `null` when
     * the Area declares no such surface -- Admin, Builder and Editor render the same Widget and do not,
     * so they keep exactly the menu they had.
     */
    state.kind === "authenticated"
      ? resolvePhiDescriptorNavigationItems(runtime, `${runtime.area}:account`).catch(() => null)
      : Promise.resolve(null),
  ]);
  /*
   * The exported anchor is the place to dock, not an entry.
   *
   * A Module attaches under it, so what belongs in the menu are its children. Rendering the anchor
   * itself would put a label in the menu that goes nowhere and means nothing to a reader.
   */
  const contributedEntries = (contributedItems ?? [])
    .flatMap((item) => item.children ?? []);
  const config: PhiAccountWidgetConfig = {
    variant: widgetConfig?.variant ?? site.theme?.widgets?.account?.variant ?? undefined,
    showLabel: widgetConfig?.showLabel ?? site.theme?.widgets?.account?.showLabel ?? undefined,
    showChevron: widgetConfig?.showChevron ?? site.theme?.widgets?.account?.showChevron ?? undefined,
  };
  const labels: PhiAccountWidgetLabels = {
    menu: accountLabels,
  };
  const resolvedState: PhiAccountWidgetState =
    state.kind === "authenticated" && !state.profileHref
      ? {
          ...state,
          profileHref,
          settingsHref: state.settingsHref ?? (
            runtime.authUiProvider?.capabilities.includes("account-security") &&
            runtime.authUiProvider.accountSecurityPath
              ? localizeAreaPath(runtime.locale.current, "app", runtime.authUiProvider.accountSecurityPath)
              : undefined
          ),
        }
      : state.kind === "authenticated"
        ? {
            ...state,
            settingsHref: state.settingsHref ?? (
              runtime.authUiProvider?.capabilities.includes("account-security") &&
              runtime.authUiProvider.accountSecurityPath
                ? localizeAreaPath(runtime.locale.current, "app", runtime.authUiProvider.accountSecurityPath)
                : undefined
            ),
          }
        : state;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Account}
      componentProps={{
        runtime,
        avatarSrc,
        avatarAlt,
        successAction,
        state: resolvedState,
        labels,
        config,
        contributedItems: contributedEntries.length > 0 ? contributedEntries : undefined,
      }}
    />
  );
}
