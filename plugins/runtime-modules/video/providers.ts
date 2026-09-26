import type { PhiVideoProviderDescriptor } from "../../../types/video";
import { PHI_VIDEO_PROVIDER_KEYS, PHI_VIDEO_RUNTIME_MODULE_ID } from "./ids";

/**
 * The two providers a Site asks for before it asks for any other.
 *
 * Each embeds from its privacy-friendlier host -- `youtube-nocookie.com`, and Vimeo's `dnt=1` -- and
 * neither host is a reason to skip asking. It is data minimisation *after* the decision: the request
 * still leaves for the provider and still discloses the address it comes from, which is exactly what the
 * placeholder is for ([design/CONSENT.md](../../../design/CONSENT.md)).
 *
 * `autoplay=1` is not a liberty either. The player is fetched because somebody clicked the placeholder,
 * so starting is what that click asked for; a player that then waits for a second click on the same
 * picture is a bug, not caution.
 */
export const PHI_VIDEO_RUNTIME_MODULE_PROVIDERS: readonly PhiVideoProviderDescriptor[] = [
  {
    key: PHI_VIDEO_PROVIDER_KEYS.youtube,
    ownerModuleId: PHI_VIDEO_RUNTIME_MODULE_ID,
    title: "YouTube",
    // The company, not the brand: it is who the person is deciding about.
    recipient: "Google Ireland Ltd.",
    privacyUrl: "https://policies.google.com/privacy",
    embedHostname: "www.youtube-nocookie.com",
    embedUrlTemplate: "https://www.youtube-nocookie.com/embed/{id}?autoplay=1&rel=0",
    addressPatterns: [
      // A watch address carries a playlist and a timestamp too, and the video is not always first.
      "^https?://(?:www\\.|m\\.)?youtube\\.com/watch\\?(?:[^#]*&)?v=([A-Za-z0-9_-]{6,20})",
      "^https?://(?:www\\.)?youtube\\.com/shorts/([A-Za-z0-9_-]{6,20})",
      "^https?://(?:www\\.)?youtube-nocookie\\.com/embed/([A-Za-z0-9_-]{6,20})",
      "^https?://youtu\\.be/([A-Za-z0-9_-]{6,20})",
    ],
    aspectRatio: 16 / 9,
  },
  {
    key: PHI_VIDEO_PROVIDER_KEYS.vimeo,
    ownerModuleId: PHI_VIDEO_RUNTIME_MODULE_ID,
    title: "Vimeo",
    recipient: "Vimeo.com, Inc.",
    privacyUrl: "https://vimeo.com/privacy",
    embedHostname: "player.vimeo.com",
    embedUrlTemplate: "https://player.vimeo.com/video/{id}?autoplay=1&dnt=1",
    addressPatterns: [
      "^https?://(?:www\\.)?vimeo\\.com/(\\d{6,12})",
      "^https?://player\\.vimeo\\.com/video/(\\d{6,12})",
    ],
    aspectRatio: 16 / 9,
  },
];
