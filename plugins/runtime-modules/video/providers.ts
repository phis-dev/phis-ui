import type { PhiVideoProviderDescriptor } from "../../../types/video";
import { PHI_VIDEO_PROVIDER_KEYS, PHI_VIDEO_RUNTIME_MODULE_ID } from "./ids";

/**
 * The two providers a Site asks for before it asks for any other.
 *
 * Each embeds from its privacy-friendlier host -- `youtube-nocookie.com`, and Vimeo's `dnt=1` -- and
 * neither host is a reason to skip asking. `youtube-nocookie.com` is not cookie-free either, whatever the
 * name suggests: Google's privacy-enhanced mode promises that a view is not used to personalise, not that
 * nothing is stored, and storage does appear once playback begins. Vimeo's `dnt=1` is the stronger of the
 * two and is documented as no cookies and no tracking. Both still disclose the address the request comes
 * from, which is exactly what the placeholder is for
 * ([design/CONSENT.md](../../../design/CONSENT.md)). This is data minimisation *after* the decision.
 *
 * `autoplay=1` is not a liberty either. The player is fetched because somebody clicked the placeholder,
 * so starting is what that click asked for; a player that then waits for a second click on the same
 * picture is a bug, not caution.
 *
 * What a Site can add per placement is in `embedParams`' shadow: `start=90` for YouTube, `h=<hash>` for an
 * unlisted Vimeo video. The keys listed here are not among them -- an editor tunes playback, nobody turns
 * off `dnt` from an inspector field.
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
    embedUrlTemplate: "https://www.youtube-nocookie.com/embed/{id}",
    // `rel=0` has not hidden related videos since 2018; it keeps them to the same channel, which is still
    // worth having and is not more than that.
    embedParams: { autoplay: "1", rel: "0" },
    idPattern: "^[A-Za-z0-9_-]{11}$",
    idExample: "aqz-KE-bpKQ",
    addressPatterns: [
      // A watch address carries a playlist and a timestamp too, and the video is not always first.
      "^https?://(?:www\\.|m\\.)?youtube\\.com/watch\\?(?:[^#]*&)?v=([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])",
      "^https?://(?:www\\.)?youtube\\.com/shorts/([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])",
      "^https?://(?:www\\.)?youtube-nocookie\\.com/embed/([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])",
      "^https?://youtu\\.be/([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])",
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
    embedUrlTemplate: "https://player.vimeo.com/video/{id}",
    embedParams: { autoplay: "1", dnt: "1" },
    idPattern: "^\\d{6,12}$",
    idExample: "76979871",
    addressPatterns: [
      "^https?://(?:www\\.)?vimeo\\.com/(\\d{6,12})(?!\\d)",
      "^https?://player\\.vimeo\\.com/video/(\\d{6,12})(?!\\d)",
    ],
    aspectRatio: 16 / 9,
  },
];
