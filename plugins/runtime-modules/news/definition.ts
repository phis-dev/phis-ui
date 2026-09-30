import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { buildPhiRuntimeModuleControllerDescriptor, type PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_NEWS_CONTROLLER_TYPE } from "./controller/address";
import { PHI_NEWS_RUNTIME_CONTROLLER_DEFINITION } from "./controller/definition";
import { PHI_NEWS_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "./forms";
import { PHI_NEWS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import { PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";

/**
 * The face of a Core content type, and nothing more.
 *
 * News entries live in Core's `site_content` and every question about them -- who may write one, what a
 * version is, when one disappears -- is Core's
 * ([phis-server design/NEWS.md](../../../../phis-server/design/NEWS.md)). What this Module contributes is
 * the two addresses, the Provider behind them, the Forms that write an entry and publish it, and the
 * Controller that tells a pressed row from the dialog it belongs to. It owns no data: what it writes, it
 * writes through Core's endpoints.
 *
 * Public and editor. The Public Area is where a Site's news is read; the editor Area is where it is
 * written, and what it brings there is not a second copy of the list but the Provider behind a Table --
 * so the same rows are readable from any Page a Site composes, and the guard on the endpoint decides who
 * sees them rather than where the Page stands.
 */
export const PHI_NEWS_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_NEWS_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["public", "editor"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  title: "News",
  description: "The Site's news: read on a Public address, written in the Editor.",
  category: "content",
  icon: "antd:notification",
  dataProviders: PHI_NEWS_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
  formProviders: { handlers: PHI_NEWS_FORM_HANDLER_PROVIDER_DESCRIPTORS },
  /*
   * The one thing a generic Table cannot do: say that the row somebody pressed is a news entry, and which
   * of the two dialogs that press belongs to. Mounted on demand, because it exists for one Page -- the
   * Public list needs none of it.
   */
  controllerType: PHI_NEWS_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_NEWS_RUNTIME_CONTROLLER_DEFINITION),
  controllerMountPolicy: "demand",
} satisfies PhiRuntimeModuleDefinition;
