import { getResolvedSiteConfig } from "../../../../../gateway/site-config";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import type { PhiBlockRuntime } from "../../../../../types";
import type {
  PhiAccountWidgetLabels,
  PhiAccountWidgetClientProps,
  PhiAccountWidgetConfig,
} from "./client";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { resolvePhiNavigationItems } from "../../../../../components/widgets/server/navigation-request";
import { buildPhiAccountAreaEntries } from "../../../../../components/widgets/accessible-areas";
import { resolvePhiNavHref } from "../../../../../helpers/locale";
import type { PhiNavItem } from "../../../../../components/shell/shell-types";

export type { PhiAccountWidgetConfig } from "./client";
import { getPhiAccountMenuLabels } from "../../../../../components/widgets/label-sets/account";

export type PhiAccountWidgetGuestState = {
  kind: "guest";
  registerHref: string;
  forgotPasswordHref?: string;
};

export type PhiAccountWidgetAuthenticatedState = {
  kind: "authenticated";
  displayName?: string;
};

export type PhiAccountWidgetState = PhiAccountWidgetGuestState | PhiAccountWidgetAuthenticatedState;

export type PhiAccountWidgetProps = Pick<
  PhiAccountWidgetClientProps,
  "avatarSrc" | "avatarAlt" | "successAction" | "state" | "config"
> & {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area" | "request" | "authUiProvider">;
};

/**
 * A resolved entry's `href` is the route's own path, Area-local; what a link needs is the address.
 *
 * Every other menu applies `resolvePhiNavHref` where it renders, and the account menu got away without
 * it for as long as nothing in it was a link -- the first contribution opened an Overlay. The profile
 * entry is a link, and unresolved it would offer `/phis/ui/settings/profile`, which is no route in any
 * Area. Resolved once here, because this is where the Area and the locale are known.
 */
function withLinkableHref(
  item: PhiNavItem,
  locale: string,
  area: PhiBlockRuntime["area"],
): PhiNavItem {
  return {
    ...item,
    ...(item.href && !item.external ? { href: resolvePhiNavHref(locale, area, item.href) } : {}),
    ...(item.children?.length
      ? { children: item.children.map((child) => withLinkableHref(child, locale, area)) }
      : {}),
  };
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
    contributedItems,
  ] = await Promise.all([
    getResolvedSiteConfig({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
    }),
    getPhiAccountMenuLabels(labelOptions),
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
   * The exported anchor is the place to dock, not an entry; everything else in the surface is one.
   *
   * An anchor is told from an entry by what it is, not by its key: it goes nowhere, sends nothing and
   * opens nothing, so what belongs in the menu are its children. Rendering it would put a label there
   * that means nothing to a reader. An Area's own entry -- signing out -- stands beside the anchor and
   * is itself. What a contributed entry carries below it travels with it: a Module whose contribution
   * is a group said so, and flattening it here would decide for it.
   */
  const contributedEntries = (contributedItems ?? []).flatMap((item) =>
    item.href || item.emits?.length || item.overlayInstanceId ? [item] : (item.children ?? []))
    .map((item) => withLinkableHref(item, runtime.locale.current, runtime.area));
  /*
   * Where else this person may go, which no surface can say.
   *
   * Profile and account security are App Pages and are entries of `app:account` alone -- a navigation
   * entry names a route of its own Area, so an Admin surface cannot point at them. What reaches them
   * from a staff shell is this list: the Areas the viewer is allowed into, the current one shown but
   * not offered. It is the same everywhere because it describes the person and not the Page.
   */
  const areaEntries = state.kind === "authenticated"
    ? buildPhiAccountAreaEntries({
        viewer: runtime.viewer,
        currentArea: runtime.area,
        locale: runtime.locale.current,
      })
    : [];
  const config: PhiAccountWidgetConfig = {
    variant: widgetConfig?.variant ?? site.theme?.widgets?.account?.variant ?? undefined,
    showLabel: widgetConfig?.showLabel ?? site.theme?.widgets?.account?.showLabel ?? undefined,
    showChevron: widgetConfig?.showChevron ?? site.theme?.widgets?.account?.showChevron ?? undefined,
  };
  const labels: PhiAccountWidgetLabels = {
    menu: accountLabels,
  };

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Account}
      componentProps={{
        runtime,
        avatarSrc,
        avatarAlt,
        successAction,
        state,
        labels,
        config,
        contributedItems: contributedEntries.length > 0 ? contributedEntries : undefined,
        areaEntries: areaEntries.length > 0 ? areaEntries : undefined,
      }}
    />
  );
}
