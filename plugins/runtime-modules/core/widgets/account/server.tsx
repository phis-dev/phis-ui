import { getResolvedSiteConfig } from "../../../../../gateway/site-config";
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
import { resolvePhiNavigationItems } from "../../../../../components/widgets/server/navigation-request";
import { localizeAreaPath } from "../../../../../helpers/locale";

export type { PhiAccountWidgetConfig } from "./client";
import { getPhiAccountMenuLabels } from "../../../../../components/widgets/label-sets/account";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";

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
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area" | "request" | "authUiProvider">;
};

/*
 * Where the Profile Page is, asked of whoever owns it.
 *
 * Core has no Profile Page of its own; the active Auth provider contributes one and says so in its
 * projection, already at the address it is served at. Naming `/app/profile` here guessed both the Area
 * and the Module's package, and guessed the package wrong -- the Page answers at `/app/phis/ui/profile`,
 * so the lookup never found it and the entry never appeared.
 *
 * The lookup stays: a Site may have tombstoned the Page, and a menu entry to a Page that is not routed
 * is worse than no entry. Lookup and link use the one address, so they cannot drift apart again.
 */
async function resolveProfileHref(runtime: PhiAccountWidgetProps["runtime"]) {
  const profilePath = runtime.authUiProvider?.accountProfilePath;
  if (runtime.viewer.access !== "authenticated" || !profilePath) {
    return undefined;
  }

  const page = await getPhiCmsPage({
    path: profilePath,
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    siteKey: runtime.site.key,
    locale: runtime.locale.current,
  }).catch(() => null);

  return page ? profilePath : undefined;
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
     * What Modules contributed to this Area's account menu, and what the Site made of it.
     *
     * Through the same resolver every other navigation surface uses, so the Site's own navigation
     * overlay applies here too: an operator who reorders or hides an account entry in the Builder is
     * editing the surface this reads. It used to read descriptors alone, which meant their editing was
     * accepted, saved, published -- and then ignored by the one menu it was about.
     *
     * Only for a signed-in viewer: the entries are about the person, and a guest has none.
     */
    state.kind === "authenticated"
      ? resolvePhiNavigationItems(runtime, `${runtime.area}:account`)
      : Promise.resolve(null),
  ]);
  /*
   * The exported anchor is the place to dock, not an entry.
   *
   * A Module attaches under it, so what belongs in the menu are its children. Rendering the anchor
   * itself would put a label in the menu that goes nowhere and means nothing to a reader. What those
   * children carry below them travels with them: a Module whose contribution is a group of entries is
   * saying so, and flattening it here would decide for it.
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
  /*
   * The security entry needs both halves of the provider's answer: the capability says this Area's
   * provider can render the surface at all, the path says where it put it. The path arrives ready to
   * link -- Area and package already in front -- so nothing is added to it here.
   */
  const accountSecurityHref = runtime.authUiProvider?.capabilities.includes("account-security")
    ? runtime.authUiProvider.accountSecurityPath
    : undefined;
  /*
   * Signing out, at the address the active provider declared for it.
   *
   * A Public address like the sign-in Pages, so it takes the locale in front and nothing else. Where a
   * provider declares none, the Widget signs out by calling the route itself -- that is the Client's
   * business and the menu simply carries no link.
   */
  const logoutPath = runtime.authUiProvider?.logoutPath;
  const resolvedState: PhiAccountWidgetState =
    state.kind === "authenticated"
      ? {
          ...state,
          profileHref: state.profileHref ?? profileHref,
          settingsHref: state.settingsHref ?? accountSecurityHref,
          logoutHref: state.logoutHref
            ?? (logoutPath ? localizeAreaPath(runtime.locale.current, "public", logoutPath) : undefined),
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
