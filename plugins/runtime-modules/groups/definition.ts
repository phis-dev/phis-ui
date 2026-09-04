import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "./ids";
import { PHI_GROUPS_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/groups/controller/definition";
import { PHI_GROUPS_CONTROLLER_TYPE } from "../../../plugins/runtime-modules/groups/controller/address";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_GROUPS_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "../../../plugins/runtime-modules/groups/forms";

/**
 * General Site groups and the shared Media Space that belongs to a group.
 *
 * The Module is optional administration UI over Core data: groups, memberships, and their Spaces live
 * in the control plane and are reachable without it. What it does own is the declaration -- a Site that
 * activates it is a Site whose groups need somewhere to put files, so Group Spaces become available.
 * Deactivating it again hides those Spaces without deleting anything.
 *
 * `admin` administers the Site's groups; `app` is where a person sees the groups they are in and what
 * their level lets them do there. Builder and Editor deliberately never may: those surfaces stay
 * pinned to the Site Space.
 */
export const PHI_GROUPS_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_GROUPS_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["admin", "app"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  // No Module-wide policy: the two Areas answer different questions and carry their own. Administration
  // is Developer and Admin; the App page is for anyone signed in, because "you are in no group" is an
  // answer too.
  controllerType: PHI_GROUPS_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_GROUPS_RUNTIME_CONTROLLER_DEFINITION),
  // Mounted where the Page asks for it, like the other administration Controllers.
  controllerMountPolicy: "demand",
  dataProviders: PHI_GROUPS_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
  title: "Groups",
  description: "Site groups, their membership levels, and the Media Space a group shares.",
  category: "identity",
  iconFamily: "groups",
  /*
   * What a group works with: documents and media its members share. `binary` is deliberately absent --
   * a group Space is for working material, and distributing executables is a Site's decision made in
   * the Site Space, where the authority is a role rather than a list.
   */
  mediaSpaces: {
    group: { kinds: ["image", "video", "audio", "pdf", "markdown", "document", "archive"] },
  },
  formProviders: { handlers: PHI_GROUPS_FORM_HANDLER_PROVIDER_DESCRIPTORS },
} satisfies PhiRuntimeModuleDefinition;
