import {
  PHI_SIGNAL_VALUE_SCHEMAS,
} from "../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../types/cms-plugins";
import { PHI_CORE_RUNTIME_CONTROLLER_KEY,
  PHI_CORE_RUNTIME_CONTROLLER_PLUGIN_KEY } from "./core-runtime-controller-address";

export type PhiCoreRuntimeControllerConfig = Record<string, never>;

export const PHI_CORE_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_CORE_RUNTIME_CONTROLLER_PLUGIN_KEY,
  key: PHI_CORE_RUNTIME_CONTROLLER_KEY,
  title: "Runtime Controller",
  description: "Required controller and module owner for the generic Phi CMS runtime.",
  iconFamily: "runtime",
  allowedMountScopes: ["site"],
  runtimeSignals: {
    emits: [
      {
        id: "pageMeta",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.pageMeta,
      },
      { id: "pageTitle", action: "change", valueType: "string" },
      /*
       * The mode the Site is shown in, whenever it changes: after the page wakes up in the mode the
       * browser prefers, when that preference changes, and when something switches it. `true` is dark,
       * the way the `themeMode` input reads it. A Control that offers the switch listens for it, so it
       * shows the mode on screen rather than the one the server rendered it in.
       */
      { id: "themeMode", action: "change", valueType: "boolean" },
      { id: "pageDescription", action: "change", valueType: "string" },
      { id: "pageDescriptionClear", action: "clear", valueType: "none" },
      { id: "openGraphImage", action: "change", valueType: "image" },
      { id: "openGraphImageClear", action: "clear", valueType: "none" },
      { id: "canonicalUrl", action: "change", valueType: "string" },
      { id: "canonicalUrlClear", action: "clear", valueType: "none" },
      {
        id: "theme",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeTheme,
      },
      { id: "locale", action: "change", valueType: "string" },
    ],
    listens: [
      { id: "pageTitle", channel: "pageTitle", action: "change", valueType: "string" },
      { id: "pageDescription", channel: "pageDescription", action: "change", valueType: "string" },
      { id: "pageDescriptionClear", channel: "pageDescription", action: "clear", valueType: "none" },
      { id: "openGraphImage", channel: "openGraphImage", action: "change", valueType: "image" },
      { id: "openGraphImageClear", channel: "openGraphImage", action: "clear", valueType: "none" },
      { id: "canonicalUrl", channel: "canonicalUrl", action: "change", valueType: "string" },
      { id: "canonicalUrlClear", channel: "canonicalUrl", action: "clear", valueType: "none" },
      {
        id: "theme",
        channel: "theme",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeTheme,
      },
      { id: "themeMode", channel: "themeMode", action: "change", valueType: "boolean" },
      { id: "locale", channel: "locale", action: "change", valueType: "string" },
      /*
       * Forwarding, as a service of the runtime rather than a thing each Widget does for itself.
       *
       * Any Widget that finishes something and has somewhere to send the visitor asks here -- a form
       * whose answer names the next page, a module that has nothing more to show. Keeping it in one
       * place is also what makes the target checkable: the runtime refuses anything that is not a path
       * on this Site, which a Widget improvising its own `location.assign` would not.
       */
      {
        id: "navigate",
        channel: "path",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeNavigation,
      },
      /*
       * Ask the Server for this Page again, because what it renders has changed underneath it.
       *
       * The case is a Form that wrote something only the Server applies -- the language the account
       * reads in, the mode it is shown in -- where the answer is not another Page but the same one,
       * rendered again now that the account says something else. So it carries no value: there is
       * nothing to say beyond "again", and the request that follows brings the new cookie with it.
       *
       * Staff Areas are routed by their own segment and carry no locale in the address, so the same
       * address really is the right one. Public is localized in its path; a Page there that changes
       * the language is a forward on `path`, not this.
       */
      { id: "reload", channel: "reload", action: "activate", valueType: "none" },
      /*
       * End the session this browser holds.
       *
       * Site scope, because that is what a session is: the cookie belongs to the account on this Site
       * and not to the Area somebody happened to be in, and signing out of the Admin signs the same
       * person out of App. Modelling it per Area would be six copies of one act that must never differ.
       *
       * It reaches the Site's own auth door, which every Site mounts whether or not an Auth Module is
       * installed -- so an Area that Auth never enters can still offer a way out. That makes this the
       * one input here that writes: everything else applies what was already decided, and the note in
       * SIGNALS.md says which is which.
       */
      { id: "signOut", channel: "session", action: "clear", valueType: "none" },
      {
        id: "notification",
        channel: "notification",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.notification,
      },
      {
        id: "message",
        channel: "message",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.message,
      },
    ],
  },
  defaultConfig: {},
  parseConfig: (): PhiCoreRuntimeControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<PhiCoreRuntimeControllerConfig>;
