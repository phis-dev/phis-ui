import type { PhiRuntimeModuleId } from "./cms-module-descriptors";

/**
 * A video a Site shows from somewhere else.
 *
 * The whole point of this contract is that a provider is *data*. There is no `parse(url)` and no
 * `embedUrl(id)` to load, so a descriptor travels from the Module definition into the browser as JSON
 * like any other configuration: no Client manifest, no lazy import, no second owner to keep in step.
 * A provider is a table row that happens to describe a company.
 *
 * It also carries the legal rule as something a validator can check. A placeholder may only ask somebody
 * to fetch a video once it can say who will receive the request, so a provider that cannot name its
 * recipient does not get into the registry -- see `collectPhiVideoProviderDescriptorErrors`, and
 * [design/CONSENT.md](../design/CONSENT.md) for why the asking happens at the embed rather than at a
 * banner. That is also why there is no "any address" provider: it would be the convenient entry that
 * makes every placeholder unable to tell the truth.
 */
export type PhiVideoProviderKey = `${string}/video-providers/${string}`;

export type PhiVideoProviderDescriptor = {
  key: PhiVideoProviderKey;
  ownerModuleId: PhiRuntimeModuleId;
  /** What a person choosing this provider reads, for example `YouTube`. */
  title: string;
  /**
   * Who receives the request once somebody asks for the video, named the way a placeholder shows it:
   * `Google Ireland Ltd.`, not `youtube.com`. A company, because that is who the person is deciding
   * about.
   */
  recipient: string;
  /** Where that recipient says what it does with the request. */
  privacyUrl: string;
  /**
   * The one host the player may come from.
   *
   * Stated separately from the template so it can be checked against it, and so a future
   * `frame-src` can be generated from the active providers instead of hard-coded. A provider cannot
   * name one recipient and load from somewhere else.
   */
  embedHostname: string;
  /** The player's address, with `{id}` as the only substitution. */
  embedUrlTemplate: string;
  /**
   * How an address of this provider looks, as patterns with one capture group each: the group is the
   * video. The first pattern that matches decides the provider, which is why pasting a link is enough
   * and a provider field is only for somebody holding a bare id.
   */
  addressPatterns: readonly string[];
  /** What shape the player wants, so a placeholder reserves the room the video will need. */
  aspectRatio: number;
};

export const PHI_VIDEO_PROVIDER_NAMESPACE = "video-providers";

/** The only substitution an embed template may carry. */
export const PHI_VIDEO_EMBED_ID_TOKEN = "{id}";

/**
 * Deliberately package-agnostic, like every other Module-scoped key: a first-party provider comes from
 * `@phis/ui/modules/video`, and an add-on's comes from its own package under the same namespace.
 */
export function isPhiVideoProviderKey(value: unknown): value is PhiVideoProviderKey {
  return typeof value === "string" &&
    /^@[^/]+\/[^/]+(?:\/modules\/[^/]+)?\/video-providers\/[^/]+$/u.test(value);
}

/** How many capture groups a pattern has, without running it against a real address. */
function countCaptureGroups(source: string) {
  return new RegExp(`${source}|`).exec("")!.length - 1;
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Everything wrong with one descriptor, as sentences, so a Module author reads the whole list rather
 * than fixing one thing per run. An empty list means the provider may be offered.
 *
 * The two rules that are not about tidiness: the template must resolve to `embedHostname` itself, and
 * the recipient and its privacy page must be there. Together they are what lets a placeholder promise
 * something true.
 */
export function collectPhiVideoProviderDescriptorErrors(
  descriptor: PhiVideoProviderDescriptor,
): readonly string[] {
  const errors: string[] = [];

  if (!isPhiVideoProviderKey(descriptor.key)) {
    errors.push(`Invalid video provider key "${descriptor.key}".`);
  }
  if (descriptor.title.trim().length === 0) {
    errors.push("A video provider states a title.");
  }
  if (descriptor.recipient.trim().length === 0) {
    errors.push("A video provider names the recipient of the request, or a placeholder cannot say who it is.");
  }
  if (!isHttpsUrl(descriptor.privacyUrl)) {
    errors.push(`Video provider "${descriptor.key}" needs an https privacy address, not "${descriptor.privacyUrl}".`);
  }
  if (!/^[a-z0-9.-]+$/u.test(descriptor.embedHostname)) {
    errors.push(`Video provider "${descriptor.key}" states a bare lowercase host, not "${descriptor.embedHostname}".`);
  }

  const tokens = descriptor.embedUrlTemplate.split(PHI_VIDEO_EMBED_ID_TOKEN).length - 1;
  if (tokens !== 1) {
    errors.push(
      `Video provider "${descriptor.key}" embeds with exactly one ${PHI_VIDEO_EMBED_ID_TOKEN}, found ${tokens}.`,
    );
  } else {
    const probe = descriptor.embedUrlTemplate.replace(PHI_VIDEO_EMBED_ID_TOKEN, "probe");
    if (!isHttpsUrl(probe)) {
      errors.push(`Video provider "${descriptor.key}" embeds over https, not "${descriptor.embedUrlTemplate}".`);
    } else if (new URL(probe).hostname !== descriptor.embedHostname) {
      errors.push(
        `Video provider "${descriptor.key}" embeds from "${new URL(probe).hostname}" while naming "${descriptor.embedHostname}".`,
      );
    }
  }

  if (descriptor.addressPatterns.length === 0) {
    errors.push(`Video provider "${descriptor.key}" states at least one address pattern.`);
  }
  for (const pattern of descriptor.addressPatterns) {
    if (!pattern.startsWith("^")) {
      // An unanchored pattern reads an id out of the middle of somebody else's address.
      errors.push(`Video provider "${descriptor.key}" anchors its patterns; "${pattern}" does not start with "^".`);
      continue;
    }
    let groups: number;
    try {
      groups = countCaptureGroups(pattern);
    } catch {
      errors.push(`Video provider "${descriptor.key}" has a pattern that is not a regular expression: "${pattern}".`);
      continue;
    }
    if (groups !== 1) {
      errors.push(
        `Video provider "${descriptor.key}" captures the video in exactly one group; "${pattern}" has ${groups}.`,
      );
    }
  }

  if (!Number.isFinite(descriptor.aspectRatio) || descriptor.aspectRatio <= 0) {
    errors.push(`Video provider "${descriptor.key}" states a positive aspect ratio.`);
  }

  return errors;
}

/**
 * What a bare id may look like, for the one case a pattern cannot serve: somebody holding an id and no
 * address. Conservative on purpose -- it ends up inside a URL.
 */
const PHI_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/u;

export type PhiResolvedVideoAddress = {
  provider: PhiVideoProviderDescriptor;
  videoId: string;
};

/**
 * Which provider a stored address belongs to, and which video it names.
 *
 * Patterns first, because an address answers both questions at once and a Site that pasted a link has
 * already said everything. `providerKey` is the fallback for a bare id, and it is also what keeps a
 * persisted-but-unresolvable value honest: nothing matches, nothing renders, and the value stays in the
 * configuration instead of being rewritten behind somebody's back.
 */
export function resolvePhiVideoAddress(
  providers: readonly PhiVideoProviderDescriptor[],
  address: string | null | undefined,
  providerKey?: PhiVideoProviderKey | null,
): PhiResolvedVideoAddress | null {
  const trimmed = address?.trim();
  if (!trimmed) {
    return null;
  }

  for (const provider of providers) {
    for (const pattern of provider.addressPatterns) {
      let match: RegExpExecArray | null;
      try {
        match = new RegExp(pattern, "u").exec(trimmed);
      } catch {
        continue;
      }
      const videoId = match?.[1]?.trim();
      if (videoId) {
        return { provider, videoId };
      }
    }
  }

  if (providerKey && PHI_VIDEO_ID_PATTERN.test(trimmed)) {
    const provider = providers.find((candidate) => candidate.key === providerKey);
    if (provider) {
      return { provider, videoId: trimmed };
    }
  }

  return null;
}

/** The player's address for one video. The id is encoded because it came from a person. */
export function buildPhiVideoEmbedUrl(provider: PhiVideoProviderDescriptor, videoId: string) {
  return provider.embedUrlTemplate.replace(PHI_VIDEO_EMBED_ID_TOKEN, encodeURIComponent(videoId));
}
