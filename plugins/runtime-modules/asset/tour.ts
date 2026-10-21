import type { PhiTourDefinition } from "../../../types/tours";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";
import { PHI_ASSET_MEDIA_PAGE_WIDGET_IDS } from "./media-page-ids";

const LIBRARY_ID = PHI_ASSET_MEDIA_PAGE_WIDGET_IDS.widgetMediaPreview;

/**
 * The Media Tour. What the Page does not say is that it is the one library every picker of the Site
 * draws from, and that what is set on an asset here -- its words, its folder, its focal rectangle -- goes
 * wherever the asset is used. The Inspector is described rather than opened: it opens on an asset, and a
 * Tour cannot know which assets a Site has.
 */
export const PHI_ASSET_MEDIA_TOUR = {
  id: `${PHI_ASSET_RUNTIME_MODULE_ID}/media`,
  version: 1,
  steps: [
    {
      key: "find",
      target: `cms:${LIBRARY_ID}:filters`,
      title: "Finding an asset",
      description: "Kind narrows the library to images or other files, Flags to assets marked Featured, Locked, Mask or Background, Folder to one folder. The plus beside Folder creates a new folder. The search looks through file names, titles and alternative texts.",
      placement: "bottom",
      ifMissing: "skip",
    },
    {
      key: "upload",
      target: `cms:${LIBRARY_ID}:toolbar`,
      title: "Adding files",
      description: "Upload opens a field to drop files into. They arrive in the folder and with the flags chosen in the filters, so choosing the folder first saves sorting later. Reset clears the filters, Reload fetches the library again.",
      placement: "bottom",
      ifMissing: "skip",
    },
    {
      key: "library",
      target: `cms:${LIBRARY_ID}:items`,
      title: "The Site's library",
      description: "Every image and file the Site has, newest first. It is the same library every image picker of the Site opens, so what is uploaded here can be placed anywhere.",
      placement: "top",
    },
    {
      key: "inspector",
      target: `cms:${LIBRARY_ID}:items`,
      title: "What an asset says about itself",
      description: "A click on an asset opens its Inspector: its folder, its title, the alternative text read out to those who cannot see it, its flags, and the focal rectangle -- the part of a picture that stays in view when a variant cuts it to another shape. Saved there, it applies wherever the asset is used.",
      placement: "top",
    },
    {
      key: "pages",
      target: `cms:${LIBRARY_ID}:pagination`,
      title: "Page by page",
      description: "The library is shown a page at a time; how many fit on one is chosen here.",
      placement: "top",
      ifMissing: "skip",
    },
  ],
} as const satisfies PhiTourDefinition;
