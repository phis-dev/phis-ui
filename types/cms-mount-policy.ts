/**
 * What happens to content that is not being shown.
 *
 * Overlays and sequential layouts ask the same question and used to answer it in two vocabularies:
 * an Overlay knew `on-open | keep-alive | eager`, a Stack knew `active | keep`, and the two `keep`s
 * meant opposite things -- one mounted on first sight, the other mounted everything at load. Anybody
 * who learned the setting in one place learned it wrong for the other.
 *
 * There is only one question, and it is not "what is visible". It is:
 *
 *   The policy governs what happens to whatever lies OUTSIDE the window.
 *
 * The window is what a container currently wants mounted -- for an Overlay simply "open", for a Stack
 * the active slot, for a Carousel the visible slots plus the lookahead it preloads. That the lookahead
 * slot is mounted while invisible is therefore not an exception anybody has to remember; it is what the
 * definition says.
 */

export const PHI_CMS_MOUNT_POLICIES = ["remount", "lazy-keep", "eager"] as const;
export type PhiCmsMountPolicy = (typeof PHI_CMS_MOUNT_POLICIES)[number];

/**
 * Two axes, three useful answers.
 *
 * When it mounts (late or at load) and what happens when it leaves (dropped or kept). `remount` is
 * late and dropped, `lazy-keep` is late and kept, `eager` is at load and therefore kept whether it
 * wants to be or not. The fourth combination -- build everything, then throw it away -- is not a
 * policy, it is a bug.
 *
 * `remount` is implicitly late as well: to be remounted you have to have left. The names each say the
 * half that distinguishes them rather than spelling out both.
 */
export const PHI_CMS_MOUNT_POLICY_MEANINGS: Readonly<Record<PhiCmsMountPolicy, string>> = {
  remount: "Mounted when it enters the window, taken down when it leaves.",
  "lazy-keep": "Mounted when it first enters the window, then kept.",
  eager: "Mounted from the start, whether it is ever shown or not.",
};

export function isPhiCmsMountPolicy(value: unknown): value is PhiCmsMountPolicy {
  return typeof value === "string" && (PHI_CMS_MOUNT_POLICIES as readonly string[]).includes(value);
}

/**
 * A stored value, or the fallback this particular container prefers.
 *
 * The default belongs to the caller and not to the type: an Overlay opens rarely and starts at
 * `remount`, a Carousel is walked through and starts at `lazy-keep`. The vocabulary has no opinion.
 *
 * Every value of the two older vocabularies fails this check, which is the point. `keep` was the one
 * string valid in both worlds with two different meanings, and no validator could have told them
 * apart -- so it was renamed rather than reinterpreted, and a stored one now lands on the fallback
 * loudly instead of quietly changing what a page does.
 */
export function readPhiCmsMountPolicy(
  value: unknown,
  fallback: PhiCmsMountPolicy,
): PhiCmsMountPolicy {
  return isPhiCmsMountPolicy(value) ? value : fallback;
}

/**
 * The one line every container would otherwise write for itself.
 *
 * `hasEnteredWindow` is the caller's memory of whether this content was ever wanted -- an Overlay's
 * "has been opened", a sequence's "has been visited". Keeping the memory is the caller's job because
 * only the caller knows what identity it is remembering; deciding from it is not.
 */
export function shouldPhiCmsContentStayMounted({
  policy,
  insideWindow,
  hasEnteredWindow,
}: {
  policy: PhiCmsMountPolicy;
  insideWindow: boolean;
  hasEnteredWindow: boolean;
}): boolean {
  return policy === "eager" || insideWindow || (policy === "lazy-keep" && hasEnteredWindow);
}

/**
 * The vocabulary as an inspector offers it.
 *
 * Kept here rather than beside the one field that uses it today, because the next container to make
 * the policy editable should reach for the list instead of retyping three labels -- which is how the
 * Stack and the Overlays came to disagree in the first place.
 */
export const PHI_CMS_MOUNT_POLICY_FIELD_OPTIONS = [
  { value: "remount", label: "Remount on return" },
  { value: "lazy-keep", label: "Keep once shown" },
  { value: "eager", label: "Mount everything" },
] as const satisfies readonly { value: PhiCmsMountPolicy; label: string }[];
