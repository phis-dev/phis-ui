import "server-only";

import { isPhiCmsAreaKey } from "../constants/cms-areas";
import { resolvePhiCmsModuleNavigationFolderTargets } from "../plugins/runtime-modules/descriptor-compiler";
import { maybeGetPhiRequestNavigationContext } from "./request-runtime";

/**
 * The Pages Module containers' folder addresses lead to in the Area this request serves
 * (`folderTarget`), for the addresses asked; empty where the request set up no Navigation context for
 * the Area -- a render outside a page request -- since nothing then says which Modules answer.
 */
export function resolvePhiRequestModuleFolderTargets(area: unknown, addresses: readonly string[]): Map<string, string> {
  const context = isPhiCmsAreaKey(area) ? maybeGetPhiRequestNavigationContext(area) : null;
  if (!context || !isPhiCmsAreaKey(area)) return new Map();
  return resolvePhiCmsModuleNavigationFolderTargets({ ...context, area, addresses });
}
