import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { buildPhiRuntimeModuleControllerDescriptor, type PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";
import { PHI_THREADS_CONTROLLER_TYPE } from "./controller/address";
import { PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION } from "./controller/definition";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import { PHI_THREADS_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "./forms";

/**
 * Conversations, as a person sees them.
 *
 * Thin and first-party, like the groups Module: threads, their messages and who may read one live in
 * Core and are reachable without this. What it owns is the surfaces -- and the composer, which is the
 * one place a message is written and a file is hung on it, so the Support and group Modules reuse it
 * rather than each growing their own.
 *
 * `Direct` is the kind this Module brings. Group and cross-group conversations belong to the groups
 * Module and Support conversations to `@phis/support`, because each of those is a Site deciding to run
 * that thing, not a Site deciding to show conversations.
 */
export const PHI_THREADS_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_THREADS_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["app"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  title: "Conversations",
  description: "Threads a person is in, and the composer that writes into one.",
  category: "communication",
  iconFamily: "threads",
  /*
   * The one thing the three surfaces cannot do without: a generic Table says a row was selected, and
   * only this Module may say that the row is a conversation. Mounted on demand, like the other
   * Controllers that exist for one Page rather than for an Area.
   */
  controllerType: PHI_THREADS_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION),
  controllerMountPolicy: "demand",
  dataProviders: PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
  formProviders: { handlers: PHI_THREADS_FORM_HANDLER_PROVIDER_DESCRIPTORS },
  threadKinds: ["direct"],
  /*
   * Where an attachment goes before it hangs on anything.
   *
   * Custody follows the uploader, so a person writes into their own User Space and nowhere else -- and
   * a composer that offers a file on a Site with no User Spaces would be offering something the control
   * plane is going to refuse. Declaring it is what makes the offer honest.
   *
   * The kinds are what a conversation carries: a screenshot, a recording, a log -- `text/plain` resolves
   * to `document` -- and an archive of several. `binary` is absent for the reason the groups Module
   * leaves it out: distributing executables is a Site decision taken in the Site Space.
   */
  mediaSpaces: {
    user: { kinds: ["image", "video", "audio", "pdf", "markdown", "document", "archive"] },
  },
} satisfies PhiRuntimeModuleDefinition;
