import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_AVATAR_RUNTIME_MODULE_ID } from "./ids";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";

/**
 * The picture a person shows as themselves, and the first Module to need User Media Spaces.
 *
 * Its reason to exist is the declaration. Profile identity -- email, name, locale, password -- belongs
 * to the Auth Module and stays there; this Module adds one Widget and one Overlay, and says that a Site
 * running it is a Site whose people need somewhere personal to put a file. Activating it in `app` and
 * publishing is what turns User Spaces on, exactly as activating groups turns Group Spaces on.
 * Deactivating it hides the Spaces again without deleting anything.
 *
 * `app` only. Administration never chooses someone's avatar for them, and Builder and Editor stay
 * pinned to the Site Space, so no other Area has a use for it.
 */
export const PHI_AVATAR_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_AVATAR_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["app"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  title: "Avatar",
  description: "A personal picture, stored in the person's own Media Space.",
  category: "people",
  iconFamily: "account",
  // A picture and nothing else: the Module has one purpose and states it rather than inheriting a list.
  mediaSpaces: { user: { kinds: ["image"] } },
} satisfies PhiRuntimeModuleDefinition;
