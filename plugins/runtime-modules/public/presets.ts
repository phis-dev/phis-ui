import type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { PhiCmsFlags } from "../../../constants/phi-cms";
import { PHI_CMS_ERROR_CODES, resolvePhiCmsErrorPagePath } from "../../../constants/cms-error-pages";
import {
  PHI_DEFAULT_PUB_AREA_COMPOSITION_NODE_KEYS,
  PHI_DEFAULT_PUB_AREA_PRESET_KEY,
} from "../preset-contracts/pub-area";
import { PHI_PUBLIC_BASE_PAGE_PRESET_KEYS } from "../public-base-page-references";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./ids";

/*
 * What the Public base Module brings: the Site shell and the Pages no Site can do without. They live in
 * the Module that owns them, so the Module reaches no other Module to state them (MODULES.md, "The
 * dependency rule").
 */

export const PHI_PUBLIC_RUNTIME_MODULE_AREA_SHELLS = [
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: PHI_DEFAULT_PUB_AREA_PRESET_KEY,
    shellPresetVersion: 1,
    area: "public",
    exportedNodeKeys: PHI_DEFAULT_PUB_AREA_COMPOSITION_NODE_KEYS,
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("../phi-default-site-area-preset-tree")
        .then((module) => module.buildPhiDefaultSiteAreaPresetTree({
          page,
          runtime,
          presetKey: PHI_DEFAULT_PUB_AREA_PRESET_KEY,
          ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
          runtimeModuleArea: "public",
        })),
  },
] satisfies readonly PhiCmsAreaShellPresetDescriptor[];

export const PHI_PUBLIC_RUNTIME_MODULE_ROUTES = [
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: PHI_PUBLIC_BASE_PAGE_PRESET_KEYS.welcome,
    presetVersion: 1,
    area: "public",
    title: "Home",
    path: "/",
    /*
     * It stands at `/` without offering itself for it.
     *
     * The base landing is what the root slot falls back to, which the base-Module rung of
     * `choosePhiAreaRootApplicant` already says. Declaring it an offer as well would put one offer on
     * the table for every Site, so a Site package offering a landing would arrive as the second and
     * would no longer cover this one on activation.
     */
    loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
      import("./trees/phi-default-pub-welcome-page-tree")
        .then((module) => module.buildPhiDefaultPubWelcomePageTree({ page, runtime })),
  },
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: PHI_PUBLIC_BASE_PAGE_PRESET_KEYS.home,
    presetVersion: 1,
    area: "public",
    title: "Home",
    path: "/home",
    /*
     * The one Page Core brings that a visitor is meant to arrive at, so it stands first in the header.
     *
     * A Site package that contributes its own landing places a Home entry of its own before the terms
     * (`@phis/example`), and then the header names two. That is the Site's to sort out in the Builder,
     * and the lesser of the two problems: the Welcome Page sends people to `/home` from its first
     * render, and a destination nothing links to is the one nobody finds their way back to.
     */
    navigation: [
      {
        navKey: "public:header",
        parentItemKey: null,
        before: "@phis/ui/modules/public/nav/terms",
        item: {
          itemKey: "@phis/ui/modules/public/nav/home",
          label: { defaultMessage: "Home" },
          icon: "antd:home",
          routePresetKey: "public-home-page",
        },
      },
    ],
    loadTree: ({ page }: PhiCmsDescriptorBuildContext) =>
      import("./trees/phi-default-pub-home-page-tree")
        .then((module) => module.buildPhiDefaultPubHomePageTree({ page })),
  },
  ...PHI_CMS_ERROR_CODES.map((code) => ({
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: `public-error-${code}-page`,
    presetVersion: 1,
    area: "public" as const,
    title: String(code),
    path: resolvePhiCmsErrorPagePath(code),
    /*
     * An error Page is what a failed request shows, not something to be found: listed in a search
     * result it would send a visitor straight to "not found". Unindexed by default, like the sign-in
     * Pages, and the Site can still decide otherwise.
     */
    defaultPageFlags: PhiCmsFlags.NoIndex,
    loadTree: ({ page }: PhiCmsDescriptorBuildContext) =>
      import("./trees/phi-default-pub-error-page-tree")
        .then((module) => module.buildPhiDefaultPubErrorPageTree({ code, page })),
  })),
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: PHI_PUBLIC_BASE_PAGE_PRESET_KEYS.terms,
    presetVersion: 2,
    area: "public",
    title: "Terms and Conditions",
    path: "/terms-and-conditions",
    loadTree: ({ page }) =>
      import("./trees/phi-default-pub-terms-page-tree")
        .then((module) => module.buildPhiDefaultPubTermsPageTree({ page })),
  },
] satisfies readonly PhiCmsRoutePresetDescriptor[];

/**
 * The Public form pages, in their own list because they appear only where Forms are allowed. The
 * contact page is Core's like the terms: every Site starts with a way to be reached, and neither is
 * a landing -- the front door is the Site package's business.
 */
export const PHI_PUBLIC_FORM_RUNTIME_MODULE_ROUTES = [
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: PHI_PUBLIC_BASE_PAGE_PRESET_KEYS.contact,
    presetVersion: 1,
    area: "public",
    title: "Contact",
    path: "/contact",
    navigation: [
      {
        navKey: "public:header",
        parentItemKey: null,
        after: "@phis/ui/modules/public/nav/terms",
        item: {
          itemKey: "@phis/ui/modules/public/nav/contact",
          label: { defaultMessage: "Contact" },
          icon: "antd:mail",
          routePresetKey: "public-contact-page",
        },
      },
      {
        navKey: "public:footer",
        parentItemKey: null,
        after: "@phis/ui/modules/public/nav/terms",
        item: {
          itemKey: "@phis/ui/modules/public/nav/contact",
          label: { defaultMessage: "Contact" },
          routePresetKey: "public-contact-page",
        },
      },
    ],
    loadTree: ({ page }) =>
      import("./trees/phi-default-pub-contact-page-tree")
        .then((module) => module.buildPhiDefaultPubContactPageTree({ page })),
  },
  /*
   * Where a circular's footer leads. Core's like the contact page, because the obligation is Core's: a Site
   * that sends updates owes a way out of them, and a way out that depended on a Module being installed
   * would be one an operator could switch off.
   *
   * No navigation entry, on either surface. Nobody navigates to leaving; the only way here is the link in a
   * message, and a menu item for it would advertise the exit to everybody who never subscribed.
   */
  {
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey: PHI_PUBLIC_BASE_PAGE_PRESET_KEYS.unsubscribe,
    presetVersion: 1,
    area: "public",
    title: "Unsubscribe",
    path: "/unsubscribe",
    navigation: [],
    loadTree: ({ page }) =>
      import("./trees/phi-default-pub-unsubscribe-page-tree")
        .then((module) => module.buildPhiDefaultPubUnsubscribePageTree({
          page,
          presetKey: PHI_PUBLIC_BASE_PAGE_PRESET_KEYS.unsubscribe,
        })),
  },
] satisfies readonly PhiCmsRoutePresetDescriptor[];
