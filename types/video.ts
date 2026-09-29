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
 *
 * What a Site stores is the provider and the video's id, never a pasted address. An address is somebody's
 * clipboard: it carries a playlist, a timestamp, a `si=` from the share dialog, sometimes a comment id
 * belonging to whoever copied it, and all of that would be published with the page. The id is the video.
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
  /**
   * The player's address up to the path, with `{id}` as the only substitution and no query of its own.
   *
   * The query is `embedParams`, because a pre-baked query string cannot be reviewed and cannot be
   * protected: what a provider always sends has to be readable as a list, not parsed back out of a URL.
   */
  embedUrlTemplate: string;
  /**
   * What this provider always sends, whatever a Site configures.
   *
   * This is where the privacy posture lives -- Vimeo's `dnt=1`, YouTube's `rel` -- so these keys are
   * reserved: a Site's own parameters are refused when they collide, rather than quietly winning. An
   * editor tunes playback; nobody turns off do-not-track from an inspector field.
   */
  embedParams: Readonly<Record<string, string>>;
  /**
   * What an id of this provider looks like, anchored at both ends: eleven characters for YouTube, digits
   * for Vimeo. Stated per provider because the Widget stores a bare id, so something has to be able to
   * say that `6ToonaJJbRE&lc` is not one.
   */
  idPattern: string;
  /**
   * One id of this provider, shown to whoever has to type one. Checked against `idPattern`, so an example
   * that stopped being an example is a build error rather than misleading help text.
   */
  idExample: string;
  /**
   * How a public address of this provider looks, as patterns with one capture group each: the group is
   * the video. Not what gets stored -- it is how a pasted link is turned into an id, and how the Builder
   * can say "that link belongs to another provider" instead of only "unrecognised".
   */
  addressPatterns: readonly string[];
  /** What shape the player wants, so a placeholder reserves the room the video will need. */
  aspectRatio: number;
};

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

/** What a parameter may be called, in a template and in a Site's own additions alike. */
const PHI_VIDEO_EMBED_PARAM_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,32}$/u;

/** How long one parameter value may be. Long enough for an unlisted-video hash, short of an essay. */
export const PHI_VIDEO_EMBED_PARAM_VALUE_MAX_LENGTH = 128;

/** How many parameters a Site may add to one player. */
export const PHI_VIDEO_EMBED_PARAM_MAX_COUNT = 8;

/**
 * Everything wrong with one descriptor, as sentences, so a Module author reads the whole list rather
 * than fixing one thing per run. An empty list means the provider may be offered.
 *
 * The two rules that are not about tidiness: the template must resolve to `embedHostname` itself, and
 * the recipient and its privacy page must be there. Together they are what lets a placeholder promise
 * something true.
 *
 * It reports a missing field instead of tripping over it. The catalog runs this while the Area's Module
 * modules evaluate, so a throw in here is not a failed provider -- it is a Site whose whole catalog fails
 * to load, with `Cannot convert undefined or null to object` where the sentence should be. Descriptors
 * arrive from add-on packages as plain objects, so the types are a promise and this function is the check.
 */
export function collectPhiVideoProviderDescriptorErrors(
  descriptor: PhiVideoProviderDescriptor,
): readonly string[] {
  const errors: string[] = [];
  const named = (field: string, expected: string) =>
    `Video provider "${descriptor?.key}" states ${expected} as \`${field}\`.`;

  if (!descriptor || typeof descriptor !== "object") {
    return ["A video provider is an object with a key, a recipient, and a place to embed from."];
  }

  if (!isPhiVideoProviderKey(descriptor.key)) {
    errors.push(`Invalid video provider key "${descriptor.key}".`);
  }
  if (typeof descriptor.title !== "string" || descriptor.title.trim().length === 0) {
    errors.push("A video provider states a title.");
  }
  if (typeof descriptor.recipient !== "string" || descriptor.recipient.trim().length === 0) {
    errors.push("A video provider names the recipient of the request, or a placeholder cannot say who it is.");
  }
  if (typeof descriptor.privacyUrl !== "string" || !isHttpsUrl(descriptor.privacyUrl)) {
    errors.push(`Video provider "${descriptor.key}" needs an https privacy address, not "${descriptor.privacyUrl}".`);
  }
  if (typeof descriptor.embedHostname !== "string" || !/^[a-z0-9.-]+$/u.test(descriptor.embedHostname)) {
    errors.push(`Video provider "${descriptor.key}" states a bare lowercase host, not "${descriptor.embedHostname}".`);
  }

  if (typeof descriptor.embedUrlTemplate !== "string") {
    errors.push(named("embedUrlTemplate", "an https address carrying {id}"));
  } else {
    const tokens = descriptor.embedUrlTemplate.split(PHI_VIDEO_EMBED_ID_TOKEN).length - 1;
    if (tokens !== 1) {
      errors.push(
        `Video provider "${descriptor.key}" embeds with exactly one ${PHI_VIDEO_EMBED_ID_TOKEN}, found ${tokens}.`,
      );
    } else if (/[?#]/u.test(descriptor.embedUrlTemplate)) {
      // Anything after the path belongs in `embedParams`, where it can be read and reserved.
      errors.push(
        `Video provider "${descriptor.key}" states its query as embedParams, not in the template "${descriptor.embedUrlTemplate}".`,
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
  }

  if (!descriptor.embedParams || typeof descriptor.embedParams !== "object") {
    errors.push(named("embedParams", "the parameters it always sends, as a record"));
  } else {
    for (const [name, value] of Object.entries(descriptor.embedParams)) {
      if (!PHI_VIDEO_EMBED_PARAM_NAME_PATTERN.test(name)) {
        errors.push(`Video provider "${descriptor.key}" has an embed parameter named "${name}", which is not a name.`);
      }
      if (typeof value !== "string" || value.length > PHI_VIDEO_EMBED_PARAM_VALUE_MAX_LENGTH) {
        errors.push(`Video provider "${descriptor.key}" has an overlong or non-string value for embed parameter "${name}".`);
      }
    }
  }

  if (typeof descriptor.idPattern !== "string") {
    errors.push(named("idPattern", "what an id of theirs looks like"));
  } else if (!descriptor.idPattern.startsWith("^") || !descriptor.idPattern.endsWith("$")) {
    errors.push(
      `Video provider "${descriptor.key}" anchors its id pattern at both ends; "${descriptor.idPattern}" does not.`,
    );
  } else {
    try {
      new RegExp(descriptor.idPattern, "u");
    } catch {
      errors.push(`Video provider "${descriptor.key}" has an id pattern that is not a regular expression.`);
    }
  }

  if (typeof descriptor.idExample !== "string" || !resolvePhiVideoId(descriptor, descriptor.idExample)) {
    errors.push(
      `Video provider "${descriptor.key}" states an id example its own pattern accepts, not "${descriptor.idExample}".`,
    );
  }

  if (!Array.isArray(descriptor.addressPatterns)) {
    errors.push(named("addressPatterns", "how its public addresses look"));
    return errors;
  }
  if (descriptor.addressPatterns.length === 0) {
    errors.push(`Video provider "${descriptor.key}" states at least one address pattern.`);
  }
  for (const pattern of descriptor.addressPatterns) {
    if (typeof pattern !== "string") {
      errors.push(`Video provider "${descriptor.key}" states each address pattern as a string.`);
      continue;
    }
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
 * The outer bound on an id, whatever a provider's own pattern allows.
 *
 * A provider says what its ids look like; the contract says what may be put into a URL path. Both have
 * to hold, so a provider that one day wants slashes or dots in an id has to change this line and think
 * about it, rather than widening one regular expression in its own file.
 */
const PHI_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/u;

/**
 * The id of a video of *this* provider, from either an id or an address somebody pasted.
 *
 * Per provider rather than a scan, because the Widget stores the provider: a YouTube link while Vimeo is
 * selected is an error to report, not a provider to switch to. Addresses are still read here so that
 * pasting a link -- the thing people do -- lands on the id instead of being stored whole.
 */
export function resolvePhiVideoId(
  provider: PhiVideoProviderDescriptor,
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const accept = (candidate: string) => {
    let matchesProvider: boolean;
    try {
      // A descriptor without a pattern resolves nothing rather than everything: `new RegExp(undefined)`
      // is `/(?:)/`, which matches, and this function is also called while validating a broken descriptor.
      matchesProvider = typeof provider.idPattern === "string" &&
        new RegExp(provider.idPattern, "u").test(candidate);
    } catch {
      return null;
    }
    return matchesProvider && PHI_VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
  };

  const direct = accept(trimmed);
  if (direct) {
    return direct;
  }

  for (const pattern of Array.isArray(provider.addressPatterns) ? provider.addressPatterns : []) {
    let match: RegExpExecArray | null;
    try {
      match = new RegExp(pattern, "u").exec(trimmed);
    } catch {
      continue;
    }
    const captured = match?.[1]?.trim();
    if (captured) {
      const accepted = accept(captured);
      if (accepted) {
        return accepted;
      }
    }
  }

  return null;
}

export type PhiResolvedVideoAddress = {
  provider: PhiVideoProviderDescriptor;
  videoId: string;
};

/**
 * Which provider a pasted address belongs to, for the Builder alone.
 *
 * Nothing renders from this -- the render path takes the stored provider. It exists so the editor can
 * tell the two failures apart: a link nobody recognises, and a link that is fine but belongs to a
 * provider other than the one selected.
 */
export function resolvePhiVideoAddress(
  providers: readonly PhiVideoProviderDescriptor[],
  address: string | null | undefined,
): PhiResolvedVideoAddress | null {
  const trimmed = address?.trim();
  if (!trimmed) {
    return null;
  }

  for (const provider of providers) {
    const videoId = resolvePhiVideoId(provider, trimmed);
    if (videoId) {
      return { provider, videoId };
    }
  }

  return null;
}

/** Why one of a Site's own parameters did not make it into the player's address. */
export type PhiVideoEmbedParamRejection = {
  name: string;
  reason: "reserved" | "name" | "value" | "count";
};

export type PhiVideoEmbedParams = {
  /** What the player's address will carry, on top of the provider's own. */
  accepted: readonly (readonly [string, string])[];
  /** What was dropped, so an editor is told rather than left wondering. */
  rejected: readonly PhiVideoEmbedParamRejection[];
};

/**
 * A Site's extra playback parameters, as a query string somebody typed: `start=90`, `h=3f9a1c`.
 *
 * The names are the provider's own and are not translated -- YouTube wants `start=90`, a Vimeo hash is
 * `h=`. Only the query is read: a fragment such as Vimeo's `#t=1m30s` is not a parameter and is not
 * smuggled in as one.
 *
 * Nothing here can change where the request goes. Host and path come from the descriptor, the provider's
 * own parameters win every collision, and a name that is not a name is refused.
 */
export function parsePhiVideoEmbedParams(
  provider: PhiVideoProviderDescriptor,
  input: string | null | undefined,
): PhiVideoEmbedParams {
  const trimmed = input?.trim().replace(/^[?&]+/u, "");
  if (!trimmed) {
    return { accepted: [], rejected: [] };
  }

  const accepted: [string, string][] = [];
  const rejected: PhiVideoEmbedParamRejection[] = [];

  for (const [name, value] of new URLSearchParams(trimmed)) {
    if (!PHI_VIDEO_EMBED_PARAM_NAME_PATTERN.test(name)) {
      rejected.push({ name, reason: "name" });
    } else if (name in provider.embedParams) {
      rejected.push({ name, reason: "reserved" });
    } else if (value.length > PHI_VIDEO_EMBED_PARAM_VALUE_MAX_LENGTH) {
      rejected.push({ name, reason: "value" });
    } else if (accepted.length >= PHI_VIDEO_EMBED_PARAM_MAX_COUNT) {
      rejected.push({ name, reason: "count" });
    } else {
      accepted.push([name, value]);
    }
  }

  return { accepted, rejected };
}

/**
 * The player's address for one video.
 *
 * Assembled rather than interpolated: the id goes into the path encoded because it came from a person,
 * the provider's own parameters go on next, and a Site's additions go last and only where they do not
 * collide.
 */
export function buildPhiVideoEmbedUrl(
  provider: PhiVideoProviderDescriptor,
  videoId: string,
  extraParams?: readonly (readonly [string, string])[],
) {
  const url = new URL(
    provider.embedUrlTemplate.replace(PHI_VIDEO_EMBED_ID_TOKEN, encodeURIComponent(videoId)),
  );
  for (const [name, value] of Object.entries(provider.embedParams)) {
    url.searchParams.set(name, value);
  }
  for (const [name, value] of extraParams ?? []) {
    if (!(name in provider.embedParams)) {
      url.searchParams.set(name, value);
    }
  }
  return url.toString();
}
