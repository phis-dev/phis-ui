import { isPhiRecord } from "../../helpers/is-record";
import type { PhiImagePreviewApiRecord } from "./phi-image-preview-data";
import { buildPhiMediaClientDigest } from "./media-upload-digest";
import { PHIS_AREA_HEADER, buildPhiMediaRequestHeaders } from "./phi-media-request-headers";

/**
 * How the control plane says this body is to be delivered.
 *
 * The Server states it; nothing here decides it. Before the plan existed this module simply knew that
 * an upload is one PUT to a Core route -- true for Local storage and false for a Provider that takes
 * the body itself, which is why the knowledge had to move to the side that knows the Provider.
 *
 * An unknown `kind` is refused rather than approximated: a plan this executor does not understand
 * cannot be carried out by guessing, and a guess would send the body to the wrong place.
 */
export type PhiMediaUploadPlan =
  | { kind: "proxy-stream"; url: string; method: "PUT"; headers?: Record<string, string> }
  | { kind: "presigned-put"; url: string; method: "PUT"; headers: Record<string, string>; expiresAt?: string }
  | {
      /**
       * The body in pieces, each with its own signed address.
       *
       * Part *n* is the bytes from `(n - 1) * partSizeBytes`, and the last one carries what is left. That
       * is the whole addressing scheme, which is why this needs no negotiation: the Server knew the size
       * when it issued the plan, and slicing a `File` costs nothing.
       *
       * `parts` is not always all of them. A session that was taken over from a page that went away is
       * addressed for what is still missing, and the parts already at the storage arrive beside the plan --
       * they are not addresses to deliver to, and nobody is to send them again.
       */
      kind: "multipart-put";
      method: "PUT";
      uploadId: string;
      partSizeBytes: number;
      parts: readonly { partNumber: number; url: string; headers?: Record<string, string> }[];
      expiresAt?: string;
    };

/** How many parts travel at once. Enough to fill a high-latency link, few enough to stay polite. */
const PHI_MEDIA_UPLOAD_PART_CONCURRENCY = 3;

/** How often one part is tried again before the whole upload is given up on. */
export const PHI_MEDIA_UPLOAD_PART_ATTEMPTS = 3;

/**
 * Which bytes one part covers.
 *
 * The plan states a part size and numbers the parts from one, so this is the whole of the addressing.
 * The last part is short and every other one is exactly `partSizeBytes`; a number past the end yields an
 * empty range rather than reading past the file, because a plan and a file disagreeing about the size is
 * something to notice at finalize and not to paper over here.
 */
export function resolvePhiMediaUploadPartRange(
  partNumber: number,
  partSizeBytes: number,
  fileSize: number,
) {
  const start = Math.min(Math.max(0, (partNumber - 1) * partSizeBytes), fileSize);
  return { start, end: Math.min(start + partSizeBytes, fileSize) };
}

/**
 * How much of the body is already at the storage, part by part.
 *
 * A part that is there counts as delivered, because it is. The figure comes from the same addressing rule
 * the upload uses rather than from anything reported back: part *n* covers a known range of this file, so
 * there is no second account of how large a part is to disagree with the first. Without it the bar would
 * start at zero for a body that is half there, and the person watching would have no way to tell that the
 * reload had cost them nothing.
 */
export function resolvePhiMediaUploadStoredProgress(
  stored: readonly PhiMediaUploadStoredPart[],
  partSizeBytes: number,
  fileSize: number,
) {
  const loadedByPart = new Map<number, number>();
  for (const part of stored) {
    const range = resolvePhiMediaUploadPartRange(part.partNumber, partSizeBytes, fileSize);
    loadedByPart.set(part.partNumber, range.end - range.start);
  }
  return loadedByPart;
}

/**
 * Whether a refused part is worth sending again.
 *
 * A transport failure has no status and may well be the network settling down. A `5xx` is the endpoint
 * saying it could not, this time. A `4xx` is the endpoint saying it will not -- a signature it rejected
 * will be rejected identically on the next attempt, so repeating it only delays the report.
 */
export function isPhiMediaUploadPartWorthRepeating(status: number) {
  return status === 0 || status >= 500;
}

/**
 * How far along the whole body is, from what each part has reported.
 *
 * A sum rather than a count of finished parts, so a single large part in flight still moves the figure.
 * It is clamped because a part that reported progress and then started again would otherwise be counted
 * twice -- the caller drops a part's contribution before retrying it, and the clamp is what keeps a bug
 * there from showing somebody 140 per cent.
 */
export function resolvePhiMediaUploadPartProgress(
  loadedByPart: ReadonlyMap<number, number>,
  fileSize: number,
) {
  if (fileSize <= 0) return 0;
  let loaded = 0;
  for (const bytes of loadedByPart.values()) loaded += bytes;
  return Math.max(0, Math.min(100, Math.round((loaded / fileSize) * 100)));
}

type PhiMediaUploadInitResponse = {
  token?: string;
  plan?: PhiMediaUploadPlan;
  finalizeUrl?: string;
  reportUrl?: string;
  expiresAt?: string;
  /**
   * Parts of this very body that are already at the storage.
   *
   * The Server answers with them where it found an interrupted upload of the same file -- matched on the
   * digest this request sent, so it is the same bytes and not merely the same name. The plan that comes
   * with them addresses only what is still missing.
   */
  uploaded?: readonly PhiMediaUploadStoredPart[];
  resumed?: boolean;
  error?: string;
};

type PhiMediaUploadUploadResponse = {
  token?: string;
  status?: string;
  byteSize?: number;
  checksumSha256?: string | null;
  /** What the plan's issuer wants reported back at finalize. Carried through unread. */
  completion?: unknown;
  error?: string;
};

type PhiMediaUploadFinalizeResponse = {
  asset?: PhiImagePreviewApiRecord;
  error?: string;
};

export class PhiMediaUploadError extends Error {
  code: string | null;
  status: number;

  constructor(message: string, code: string | null = null, status = 0) {
    super(message);
    this.name = "PhiMediaUploadError";
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, PhiMediaUploadError.prototype);
  }
}

export type PhiMediaUploadProgressHandler = (progress: number) => void;

/**
 * One file, from chosen to settled.
 *
 * The transport in the middle is Core's and the same every time; what differs is where the session is
 * begun and where it is settled. A Media Space uses Core's own upload routes; a slot on an Add-on's row
 * uses the Add-on's root. Making it a parameter is what lets the acceptance, the progress, the refusal
 * and the labels stay shared instead of being written twice with the second one drifting.
 */
export type PhiMediaUploadSessionRunner = (
  file: File,
  onProgress?: PhiMediaUploadProgressHandler,
  options?: PhiMediaUploadInitOptions,
  signal?: AbortSignal,
) => Promise<{ asset: { id: number } }>;

/**
 * What an upload that was stopped throws.
 *
 * A `PhiMediaUploadError` with the `cancelled` code, so the report to the Server and the reading a
 * surface gives it come from one place: a person who stopped an upload decided against it, and the
 * Server clears up what arrived. A surface that stopped it itself reads it with
 * `isPhiMediaUploadCancelled` and shows nothing, since nobody is waiting for an answer.
 */
function createPhiMediaUploadCancelledError() {
  return new PhiMediaUploadError("The upload was stopped.", "cancelled", 0);
}

export function isPhiMediaUploadCancelled(error: unknown) {
  return error instanceof PhiMediaUploadError && error.code === "cancelled";
}

function throwIfPhiMediaUploadAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw createPhiMediaUploadCancelledError();
}

/**
 * Ends a request when the signal does.
 *
 * Returns the way to stop listening, which the request calls once it settled: a signal outlives the
 * request it was handed to, and a listener left on it would abort a request that is long finished.
 */
function bindPhiMediaUploadAbort(signal: AbortSignal | undefined, abort: () => void) {
  if (!signal) return () => {};
  signal.addEventListener("abort", abort, { once: true });
  return () => signal.removeEventListener("abort", abort);
}

export type PhiMediaUploadSessionResult = {
  asset: PhiImagePreviewApiRecord;
  token: string;
};

/**
 * A part the storage already holds, from an attempt whose page went away.
 *
 * The entity tag is why this has to travel: a completion names every part by number and tag, and the tags
 * of these parts were read by a page that no longer exists. Only the Server can hand them back, having
 * asked the storage what it is holding.
 */
export type PhiMediaUploadStoredPart = {
  partNumber: number;
  eTag: string;
};

type PhiMediaUploadInitSession = {
  token: string;
  plan: PhiMediaUploadPlan;
  finalizeUrl: string;
  reportUrl: string;
  expiresAt: string;
  /** Parts an earlier attempt already delivered. Empty for an upload that is starting. */
  uploaded: readonly PhiMediaUploadStoredPart[];
  /** Whether this session was taken over rather than opened, which only the Server can say. */
  resumed: boolean;
};

/**
 * What a Client may say about a body it could not deliver.
 *
 * A presigned plan leaves the Site entirely, so a failure on that leg reaches no server on its own: the
 * session would sit until it expired and the Site's log would show nothing at all. These are the four
 * readings a browser can honestly distinguish, and they are the Server's vocabulary too.
 */
export const PHI_MEDIA_UPLOAD_FAILURE_REASONS = {
  /** No response and no status: the browser never reached the storage endpoint. */
  StorageUnreachable: "storage_unreachable",
  /** The storage endpoint answered, and refused. */
  StorageRejected: "storage_rejected",
  Cancelled: "cancelled",
  /**
   * The page went away while the body was still in flight.
   *
   * Kept apart from `cancelled`, which it used to be reported as, because the Server does opposite things
   * with them. A person who stops an upload has decided against it and what arrived is waste. A reload, a
   * crash or a closed tab decided nothing -- and a body travelling in parts leaves those parts at the
   * storage, where the next attempt at the same file carries on from them instead of paying again.
   */
  Interrupted: "interrupted",
  ClientError: "client_error",
} as const;

export type PhiMediaUploadFailureReason =
  (typeof PHI_MEDIA_UPLOAD_FAILURE_REASONS)[keyof typeof PHI_MEDIA_UPLOAD_FAILURE_REASONS];

/**
 * Tells the Server a body will not arrive.
 *
 * Deliberately quiet: it is a courtesy to the operator's log, not a step the upload depends on, so a
 * failure to report must not replace the failure being reported.
 */
export async function reportPhiMediaUploadFailure(
  reportUrl: string,
  reason: PhiMediaUploadFailureReason,
  detail?: string | null,
) {
  try {
    await fetch(reportUrl, {
      method: "POST",
      credentials: "include",
      headers: buildPhiMediaRequestHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
      body: JSON.stringify({ reason, detail: detail ?? null }),
    });
  } catch {
    // Nothing to do about it here; the original failure is what the caller is still holding.
  }
}

/**
 * Says the body will not arrive, from a page that is going away.
 *
 * The one abandonment nothing else can report. `reportPhiMediaUploadFailure` needs the upload to have
 * failed *and* the page to still be there to say so; a person who closes the tab mid-body produces
 * neither, so the session sat at Pending until it expired and its staged bytes stayed paid for. Since
 * expiry deliberately leaves storage alone, nothing was ever going to come back for them.
 *
 * `sendBeacon` and not `fetch`, because this is the moment a document stops being allowed to start
 * ordinary requests: the browser takes the body and delivers it after the page is gone. `pagehide` and
 * not `unload`, which is deprecated and unreliable, nor `beforeunload`, which is for asking a question
 * nobody here wants to ask.
 *
 * Which word it uses depends on what can be salvaged, and that is the whole of the difference. A body sent
 * in parts leaves them at the storage: saying `interrupted` is what keeps them, so the next attempt at the
 * same file carries on instead of sending those bytes again. Any other plan leaves nothing a second page
 * could build on, so leaving the page really is a person stopping it, and `cancelled` has the Server clear
 * up after it.
 *
 * Returns the way to stand down. A caller that reaches finalize must use it: see `runPhiMediaUploadSession`
 * for why the moment matters.
 */
function reportPhiMediaUploadAbandonmentOnLeaving(reportUrl: string, plan: PhiMediaUploadPlan) {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return () => {};
  }

  const reason = plan.kind === "multipart-put"
    ? PHI_MEDIA_UPLOAD_FAILURE_REASONS.Interrupted
    : PHI_MEDIA_UPLOAD_FAILURE_REASONS.Cancelled;

  const announce = () => {
    try {
      navigator.sendBeacon(
        reportUrl,
        new Blob(
          [JSON.stringify({
            reason,
            detail: "The page was left while the body was in flight.",
          })],
          { type: "application/json" },
        ),
      );
    } catch {
      // Leaving is not the moment to handle a failure to say one is leaving. Expiry still releases the
      // reservation; only the staged object is worse off, which is the state this existed to improve.
    }
  };

  window.addEventListener("pagehide", announce);
  return () => window.removeEventListener("pagehide", announce);
}

/**
 * What the Server is told this failure was.
 *
 * Only the four readings a browser can honestly distinguish are passed on; anything else is reported as
 * a Client error rather than as a guess about whose end it happened at. One rule, because both runs
 * below report against the same vocabulary and a second copy would be a second answer.
 */
function readPhiMediaUploadFailureReason(error: unknown): PhiMediaUploadFailureReason {
  const code = error instanceof PhiMediaUploadError ? error.code : null;
  return (Object.values(PHI_MEDIA_UPLOAD_FAILURE_REASONS) as string[]).includes(code ?? "")
    ? (code as PhiMediaUploadFailureReason)
    : PHI_MEDIA_UPLOAD_FAILURE_REASONS.ClientError;
}

/**
 * Whether a plan says enough to be carried out.
 *
 * Per kind, because a multipart plan has no single address: what makes it usable is an upload to name and
 * at least one part to send. A plan missing that is a control-plane answer nobody can act on, and saying
 * so at init is better than failing at the first part.
 */
/* Exported for the test that freezes the resumed case, not for a caller: init is the only reader. */
export function isUsablePhiMediaUploadPlan(
  plan: PhiMediaUploadPlan | undefined,
  storedParts = 0,
): plan is PhiMediaUploadPlan {
  if (!plan) return false;
  if (plan.kind === "multipart-put") {
    /*
     * A part to send, or one that is already there. The second case is a body that finished arriving and
     * was never finalized -- the page went away in between -- and it has no part left to address. Refusing
     * it as unusable would mean re-sending a whole body that is complete at the storage.
     */
    return Boolean(plan.uploadId)
      && plan.partSizeBytes > 0
      && plan.parts.length + storedParts > 0;
  }
  return Boolean(plan.url);
}

/** The address a plan delivers to -- for a multipart plan, the one its parts share. */
function readPlanAddress(plan: PhiMediaUploadPlan) {
  return plan.kind === "multipart-put" ? plan.parts[0]?.url ?? "" : plan.url;
}

/** The origin the browser was told to deliver to, and never the signature that came with it. */
function readPlanTarget(plan: PhiMediaUploadPlan) {
  try {
    const target = new URL(readPlanAddress(plan), typeof location === "undefined" ? undefined : location.href);
    const pageProtocol = typeof location === "undefined" ? null : location.protocol;
    const blockedAsMixedContent = pageProtocol === "https:" && target.protocol === "http:";
    return {
      origin: target.origin,
      detail: blockedAsMixedContent
        ? `${target.origin} (blocked as mixed content on an https page)`
        : target.origin,
    };
  } catch {
    return { origin: "", detail: null };
  }
}

export type PhiMediaUploadInitOptions = {
  folderId?: number | null;
  presentationFlags?: number | null;
  /**
   * The Space the surface is currently reading, as the control plane named it.
   *
   * Inherited, never chosen here: an upload lands where the person is already looking. Omitting it asks
   * for the Site Space, and the control plane resolves it against the actor's authority either way.
   */
  spaceAddress?: string | null;
  meta?: Record<string, unknown> | null;
};

export type PhiMediaUploadContext = {
  folderId: number | null;
  presentationFlags: number | null;
};

/**
 * An upload inherits the context it was started from rather than asking for one.
 *
 * A Collection panel owns its own Folder and flag filters, so when one hosts the upload it wins
 * outright -- including a deliberate "no flags", which is why its flags fall back to none and never
 * to the Widget default. Standalone uploads inherit the Asset controller's current preview state and
 * only then the Widget's configured flags.
 *
 * The Space is inherited whole and separately, because it is not a filter a panel owns: it is the Space
 * the control plane said it served. An upload started while looking at a group's library therefore goes
 * to that group instead of silently to the Site Space.
 */
export function resolvePhiMediaUploadInitOptions(input: {
  collectionContext?: PhiMediaUploadContext | null;
  previewState: PhiMediaUploadContext;
  configPresentationFlags?: number | null;
  activeSpaceAddress?: string | null;
}): PhiMediaUploadInitOptions {
  const spaceAddress = input.activeSpaceAddress?.trim() || null;
  if (input.collectionContext) {
    return {
      folderId: input.collectionContext.folderId,
      presentationFlags: input.collectionContext.presentationFlags ?? 0,
      spaceAddress,
    };
  }
  return {
    folderId: input.previewState.folderId,
    presentationFlags:
      input.previewState.presentationFlags ?? input.configPresentationFlags ?? 0,
    spaceAddress,
  };
}

async function readJsonResponse<T extends { error?: string }>(response: Response) {
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !payload) {
    throw new PhiMediaUploadError(payload?.error ?? `Upload request failed (${response.status}).`, payload?.error ?? null, response.status);
  }

  return payload;
}

export async function initPhiMediaUploadSession(
  file: File,
  options?: PhiMediaUploadInitOptions,
  signal?: AbortSignal,
): Promise<PhiMediaUploadInitSession> {
  const folderId = Number.isInteger(options?.folderId) && (options?.folderId ?? 0) > 0
    ? options?.folderId
    : null;
  const presentationFlags = Number.isInteger(options?.presentationFlags) && (options?.presentationFlags ?? 0) >= 0 ? options?.presentationFlags : null;
  const meta =
    isPhiRecord(options?.meta)
      ? options.meta
      : null;
  // The Space is named the way every Media route names one -- as a query parameter -- while the Folder
  // and the flags travel in the body, because those describe the Asset rather than the Space it lands in.
  const spaceAddress = options?.spaceAddress?.trim() || null;
  /*
   * Hashed before the session is asked for, because the Server signs the digest into the upload request
   * and cannot do that after it has issued one. Null where the browser cannot hash -- an upload without a
   * digest still works; it simply arrives with nothing the storage was asked to verify.
   */
  const digest = await buildPhiMediaClientDigest(file);
  const initUrl = spaceAddress
    ? `/api/site/media/uploads/init?spaceId=${encodeURIComponent(spaceAddress)}`
    : "/api/site/media/uploads/init";
  throwIfPhiMediaUploadAborted(signal);
  const response = await fetch(initUrl, {
    method: "POST",
    headers: buildPhiMediaRequestHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
    }),
    cache: "no-store",
    ...(signal ? { signal } : {}),
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      ...(folderId ? { folderId } : {}),
      ...(presentationFlags != null ? { presentationFlags } : {}),
      ...(meta ? { meta } : {}),
      ...(digest ?? {}),
    }),
  });

  const payload = await readJsonResponse<PhiMediaUploadInitResponse>(response);
  const uploaded = payload.uploaded ?? [];
  // A stored part this side cannot name is one finalize would leave out; that is not the Server's upload.
  const partsReadable = uploaded.every((part) =>
    Number.isInteger(part?.partNumber) && part.partNumber > 0 && Boolean(part?.eTag));
  if (
    !payload.token ||
    !partsReadable ||
    !isUsablePhiMediaUploadPlan(payload.plan, uploaded.length) ||
    !payload.finalizeUrl ||
    !payload.reportUrl ||
    !payload.expiresAt
  ) {
    throw new Error(payload.error ?? "Failed to create upload session.");
  }

  return {
    token: payload.token,
    plan: payload.plan,
    finalizeUrl: payload.finalizeUrl,
    reportUrl: payload.reportUrl,
    expiresAt: payload.expiresAt,
    uploaded,
    resumed: payload.resumed === true,
  };
}

/**
 * One part of a body, to its own signed address.
 *
 * The entity tag is the point. `CompleteMultipartUpload` names every part by number and tag, so a part
 * whose tag the browser cannot read is a part that cannot be assembled -- which is why the bucket's CORS
 * rule exposes `ETag`, and why a missing one is an error here rather than an empty string passed along.
 *
 * Retried on a transport failure and on a `5xx`, and never on a `4xx`: a signature the endpoint rejected
 * will be rejected again, and repeating it only delays saying so.
 */
async function uploadPhiMediaUploadPart(
  part: { partNumber: number; url: string; headers?: Record<string, string> },
  body: Blob,
  onPartProgress: (loadedBytes: number) => void,
  signal: AbortSignal,
): Promise<{ partNumber: number; eTag: string }> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= PHI_MEDIA_UPLOAD_PART_ATTEMPTS; attempt += 1) {
    throwIfPhiMediaUploadAborted(signal);
    let abort = () => {};
    const unbind = bindPhiMediaUploadAbort(signal, () => abort());
    try {
      return await new Promise<{ partNumber: number; eTag: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        abort = () => xhr.abort();
        xhr.onabort = () => reject(createPhiMediaUploadCancelledError());
        xhr.open("PUT", part.url);
        for (const [header, value] of Object.entries(part.headers ?? {})) {
          xhr.setRequestHeader(header, value);
        }
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) onPartProgress(event.loaded);
        };
        xhr.onerror = () => reject(new PhiMediaUploadError(
          `Part ${part.partNumber} did not reach the storage endpoint.`,
          PHI_MEDIA_UPLOAD_FAILURE_REASONS.StorageUnreachable,
          0,
        ));
        xhr.onload = () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new PhiMediaUploadError(
              `Part ${part.partNumber} was refused (${xhr.status}).`,
              PHI_MEDIA_UPLOAD_FAILURE_REASONS.StorageRejected,
              xhr.status,
            ));
            return;
          }
          const eTag = (xhr.getResponseHeader("etag") ?? "").trim();
          if (!eTag) {
            reject(new PhiMediaUploadError(
              `Part ${part.partNumber} arrived without an entity tag, so it cannot be assembled.`,
              PHI_MEDIA_UPLOAD_FAILURE_REASONS.ClientError,
              xhr.status,
            ));
            return;
          }
          onPartProgress(body.size);
          resolve({ partNumber: part.partNumber, eTag });
        };
        xhr.send(body);
      });
    } catch (error) {
      lastError = error;
      const status = error instanceof PhiMediaUploadError ? error.status : 0;
      if (
        isPhiMediaUploadCancelled(error) ||
        !isPhiMediaUploadPartWorthRepeating(status) ||
        attempt === PHI_MEDIA_UPLOAD_PART_ATTEMPTS
      ) {
        throw error;
      }
      // Whatever a part already reported is undone before it is sent again, or the total would grow.
      onPartProgress(0);
    } finally {
      unbind();
    }
  }

  throw lastError ?? new Error("Part upload failed.");
}

/**
 * The body as parts, which is what makes a large upload survivable.
 *
 * The gain is not a higher ceiling but a smaller unit of failure: a single request that dies at ninety
 * per cent has to start over, while a part that dies repeats alone. That is why the threshold for this is
 * the part size rather than some number where a file counts as large.
 *
 * The same reasoning reaches one step further than a failed request. A page that is reloaded or closed used
 * to cost every part that had arrived; now those parts stay at the storage and the Server hands them back
 * with the plan, so this sends what is missing and names the rest. Which parts they are is not this side's
 * to work out -- the storage was asked.
 *
 * Progress is the sum of what every part reports, which is why a retry resets its own contribution
 * first: a part that reported ten megabytes and then started again would otherwise count them twice and
 * the total would run past the file.
 *
 * The first part to give up ends the upload, and ends it for every worker: an assembly missing one part
 * cannot be completed, and the Server aborts the parts already sent once the failure is reported. So
 * the failure stops the others -- no worker takes another part, and the ones in flight are aborted --
 * and only once all of them have stopped is it thrown. Thrown earlier, the failure would be reported
 * while the remaining workers were still sending bytes nobody will assemble, and their progress would
 * land on an upload that already reads as failed.
 */
async function uploadPhiMediaUploadParts(
  plan: Extract<PhiMediaUploadPlan, { kind: "multipart-put" }>,
  file: File,
  onProgress?: PhiMediaUploadProgressHandler,
  /** What an earlier attempt already delivered, which this one neither sends nor waits for. */
  stored: readonly PhiMediaUploadStoredPart[] = [],
  signal?: AbortSignal,
): Promise<PhiMediaUploadUploadResponse> {
  const loadedByPart = new Map<number, number>();
  const report = () => onProgress?.(resolvePhiMediaUploadPartProgress(loadedByPart, file.size));
  const stop = new AbortController();
  const unbind = bindPhiMediaUploadAbort(signal, () => stop.abort());
  const failures: unknown[] = [];

  for (const [partNumber, bytes] of resolvePhiMediaUploadStoredProgress(stored, plan.partSizeBytes, file.size)) {
    loadedByPart.set(partNumber, bytes);
  }
  if (stored.length > 0) report();

  const queue = [...plan.parts].sort((left, right) => left.partNumber - right.partNumber);
  // Seeded with what is already there: a completion has to name every part, and these tags come from the
  // Server because the page that read them is gone.
  const done: { partNumber: number; eTag: string }[] = stored.map((part) => ({
    partNumber: part.partNumber,
    eTag: part.eTag,
  }));
  let next = 0;

  const worker = async () => {
    while (!stop.signal.aborted) {
      const index = next;
      next += 1;
      const part = queue[index];
      if (!part) return;
      const range = resolvePhiMediaUploadPartRange(part.partNumber, plan.partSizeBytes, file.size);
      const body = file.slice(range.start, range.end);
      try {
        done.push(await uploadPhiMediaUploadPart(part, body, (loadedBytes) => {
          if (stop.signal.aborted) return;
          loadedByPart.set(part.partNumber, loadedBytes);
          report();
        }, stop.signal));
      } catch (error) {
        // The first failure is the one reported; the others are this one stopping them.
        failures.push(error);
        stop.abort();
        return;
      }
    }
  };

  try {
    await Promise.all(
      Array.from({ length: Math.min(PHI_MEDIA_UPLOAD_PART_CONCURRENCY, queue.length) }, worker),
    );
  } finally {
    unbind();
  }
  // A person who stopped it is the reason, whichever part noticed first.
  throwIfPhiMediaUploadAborted(signal);
  if (failures.length > 0) throw failures[0];

  return {
    status: "uploaded",
    completion: {
      uploadId: plan.uploadId,
      parts: done.sort((left, right) => left.partNumber - right.partNumber),
    },
  };
}

export async function uploadPhiMediaUploadBody(
  plan: PhiMediaUploadPlan,
  file: File,
  onProgress?: PhiMediaUploadProgressHandler,
  /** Parts an earlier attempt delivered, where this session was taken over rather than opened. */
  stored: readonly PhiMediaUploadStoredPart[] = [],
  /** Stops the body where it is; what is in flight is aborted and the call throws `cancelled`. */
  signal?: AbortSignal,
) {
  throwIfPhiMediaUploadAborted(signal);
  if (plan.kind === "multipart-put") {
    return await uploadPhiMediaUploadParts(plan, file, onProgress, stored, signal);
  }
  if (plan.kind !== "proxy-stream" && plan.kind !== "presigned-put") {
    // A newer control plane issued a plan this Client cannot carry out. Saying so is the only safe
    // answer: there is no transport to fall back to that would not be a guess about where the body goes.
    throw new PhiMediaUploadError(
      `This upload plan is not supported by this Client (${(plan as { kind: string }).kind}).`,
      "unsupported_upload_plan",
      0,
    );
  }
  // A presigned plan addresses the Provider, not this Site: its credentials must not travel with the
  // body, and its content type is whatever the signature was issued over.
  const external = plan.kind === "presigned-put";

  let abort = () => {};
  const unbind = bindPhiMediaUploadAbort(signal, () => abort());
  try {
    return await sendPhiMediaUploadSingleBody(plan, file, external, onProgress, (abortRequest) => {
      abort = abortRequest;
    });
  } finally {
    unbind();
  }
}

/** The single-request plans: one PUT to the Site or to a presigned address. */
function sendPhiMediaUploadSingleBody(
  plan: Extract<PhiMediaUploadPlan, { kind: "proxy-stream" | "presigned-put" }>,
  file: File,
  external: boolean,
  onProgress: PhiMediaUploadProgressHandler | undefined,
  onRequest: (abort: () => void) => void,
) {
  return new Promise<PhiMediaUploadUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    onRequest(() => xhr.abort());
    xhr.onabort = () => reject(createPhiMediaUploadCancelledError());
    xhr.open(plan.method, plan.url);
    xhr.withCredentials = !external;
    if (!external) {
      xhr.setRequestHeader("Accept", "application/json");
      if (file.type) {
        xhr.setRequestHeader("Content-Type", file.type);
      }
      const area = buildPhiMediaRequestHeaders().get(PHIS_AREA_HEADER);
      if (area) {
        xhr.setRequestHeader(PHIS_AREA_HEADER, area);
      }
    }
    for (const [header, value] of Object.entries(plan.headers ?? {})) {
      xhr.setRequestHeader(header, value);
    }
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      onProgress?.(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
    };
    xhr.onerror = () => {
      // Status 0 and no body: the browser is saying it never got there. For a presigned plan that is
      // almost always the Provider's endpoint being unreachable from where the person is standing --
      // a loopback address, a name that does not resolve outside, or http on an https page.
      const target = external ? readPlanTarget(plan) : null;
      reject(
        new PhiMediaUploadError(
          target?.origin
            ? `The browser could not reach the storage endpoint at ${target.detail}.`
            : "Upload failed.",
          external
            ? PHI_MEDIA_UPLOAD_FAILURE_REASONS.StorageUnreachable
            : PHI_MEDIA_UPLOAD_FAILURE_REASONS.ClientError,
          0,
        ),
      );
    };
    xhr.onload = () => {
      const raw = xhr.responseText?.trim() || "";
      const ok = xhr.status >= 200 && xhr.status < 300;
      // A Provider answers in its own dialect, or with nothing at all. Only the Server's own reply is
      // read as one of ours.
      if (external) {
        if (ok) {
          resolve({ status: "uploaded" });
          return;
        }
        reject(
          new PhiMediaUploadError(
            `The storage endpoint refused the upload (${xhr.status || 0}).`,
            PHI_MEDIA_UPLOAD_FAILURE_REASONS.StorageRejected,
            xhr.status || 0,
          ),
        );
        return;
      }
      try {
        const payload = raw ? (JSON.parse(raw) as PhiMediaUploadUploadResponse) : null;
        if (!payload || !ok) {
          reject(
            new PhiMediaUploadError(
              payload?.error ?? `Upload failed (${xhr.status || 0}).`,
              payload?.error ?? null,
              xhr.status || 0,
            ),
          );
          return;
        }

        resolve(payload);
      } catch {
        reject(new PhiMediaUploadError(`Upload failed (${xhr.status || 0}).`, null, xhr.status || 0));
      }
    };
    xhr.send(file);
  });
}

export async function finalizePhiMediaUploadSession(
  finalizeUrl: string,
  completion?: unknown,
): Promise<{ asset: PhiImagePreviewApiRecord }> {
  const response = await fetch(finalizeUrl, {
    method: "POST",
    headers: buildPhiMediaRequestHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
    }),
    cache: "no-store",
    body: JSON.stringify(completion === undefined ? {} : { completion }),
  });

  // An Asset that is already there is an answer, not a failure: finalize is where every plan is judged
  // for duplicates, because what the object is decides that and not how it travelled.
  const payload = (await response.json().catch(() => null)) as
    | (PhiMediaUploadFinalizeResponse & { error?: string })
    | null;
  if (response.status === 409 && payload?.error === "media_asset_exists" && payload.asset) {
    return { asset: payload.asset };
  }
  if (!response.ok || !payload) {
    throw new PhiMediaUploadError(
      payload?.error ?? `Upload request failed (${response.status}).`,
      payload?.error ?? null,
      response.status,
    );
  }
  if (!payload.asset) {
    throw new Error(payload.error ?? "Finalize failed.");
  }

  return {
    asset: payload.asset,
  };
}

/**
 * An init aborted by the signal reads as `cancelled`, not as the `AbortError` fetch throws: the
 * caller asks one question, whether it was stopped.
 */
async function readPhiMediaUploadCancellation<T>(run: () => Promise<T>, signal: AbortSignal | undefined) {
  try {
    return await run();
  } catch (error) {
    throwIfPhiMediaUploadAborted(signal);
    throw error;
  }
}

/**
 * One file through Core's own upload routes.
 *
 * `signal` stops it up to the moment finalize is sent: an init in flight is aborted, a body in flight is
 * aborted and reported `cancelled`, so the Server clears up the reservation and whatever arrived. Once
 * finalize is sent it is not stopped -- the Server is already turning the body into an Asset, and aborting
 * the request would only hide the answer. A caller that stopped it ignores what comes back.
 */
export async function runPhiMediaUploadSession(
  file: File,
  onProgress?: PhiMediaUploadProgressHandler,
  options?: PhiMediaUploadInitOptions,
  signal?: AbortSignal,
): Promise<PhiMediaUploadSessionResult> {
  const init = await readPhiMediaUploadCancellation(() => initPhiMediaUploadSession(file, options, signal), signal);
  const standDown = reportPhiMediaUploadAbandonmentOnLeaving(init.reportUrl, init.plan);
  let upload;
  try {
    upload = await uploadPhiMediaUploadBody(init.plan, file, onProgress, init.uploaded, signal);
    // Stopped after the last byte and before finalize: the body is there, and nobody wants the Asset.
    throwIfPhiMediaUploadAborted(signal);
  } catch (uploadError) {
    standDown();
    // The Server cannot see this leg, so it is told rather than left to infer it from an expiry.
    await reportPhiMediaUploadFailure(
      init.reportUrl,
      readPhiMediaUploadFailureReason(uploadError),
      uploadError instanceof Error ? uploadError.message : null,
    );
    throw uploadError;
  }
  /*
   * Stood down before finalize is sent, and deliberately not after it answers.
   *
   * Once the Server holds the finalize request it copies the staged object onto its final key and closes
   * the session; a beacon arriving in the middle of that would be a second request racing the first for
   * the same row and the same object. A beacon arriving *after* it is harmless -- the row is gone, so the
   * report answers 404 and touches nothing -- but the window in between is not worth leaving open for a
   * body that has already arrived. What this gives up is the sliver where somebody leaves after the body
   * landed and before finalize was sent, and expiry already answers for that.
   */
  standDown();
  const finalize = await finalizePhiMediaUploadSession(init.finalizeUrl, upload.completion);
  return {
    asset: finalize.asset,
    token: init.token,
  };
}

/**
 * A place an Add-on's route made for a file, as `assets:v1` answered it.
 *
 * Structurally the same three fields Core's own init returns, and deliberately so: there is one upload
 * lifecycle, and an Add-on's reservation is a reservation in it rather than something parallel.
 */
export type PhiAddonAssetReservation = {
  token: string;
  plan: PhiMediaUploadPlan;
  expiresAt?: string;
};

/**
 * Carries out an upload an Add-on's own route reserved.
 *
 * The two legs an Add-on must not write for itself. `begin` and `finalize` are its own -- they are the
 * calls that name a row and a slot, and Core has no route that could know either -- but everything
 * between them is Core's: which transport the plan asks for, how a presigned endpoint differs from a
 * proxied one, what a browser may honestly claim about a body it could not deliver, and where it says
 * so. An Add-on that reimplemented this leg would get the transport wrong on the Provider it was not
 * developed against, and its failures would be the ones no operator can see.
 *
 * The report address is derived from the token rather than asked for, the way Core's own run derives it
 * when a control plane did not send one: reporting is a courtesy to the operator's log, and losing it
 * must not be what makes an upload fail.
 *
 * `finalize` is the caller's because only the Add-on's route knows what its answer looks like. It is
 * called with whatever the plan's issuer wanted reported back, unread on the way through.
 */
export async function runPhiAddonAssetUpload<TAsset>(input: {
  file: File;
  reservation: PhiAddonAssetReservation;
  finalize: (completion: unknown) => Promise<TAsset>;
  onProgress?: PhiMediaUploadProgressHandler;
  /** Where the Add-on's Client says a body will not arrive. Core's own route when absent. */
  reportUrl?: string;
  /** Stops the body up to finalize, as in `runPhiMediaUploadSession`. */
  signal?: AbortSignal;
}): Promise<TAsset> {
  const { file, reservation, finalize, onProgress, signal } = input;
  const reportUrl = input.reportUrl
    ?? `/api/site/media/uploads/${encodeURIComponent(reservation.token)}/report`;

  const standDown = reportPhiMediaUploadAbandonmentOnLeaving(reportUrl, reservation.plan);
  let upload;
  try {
    upload = await uploadPhiMediaUploadBody(reservation.plan, file, onProgress, [], signal);
    throwIfPhiMediaUploadAborted(signal);
  } catch (uploadError) {
    standDown();
    await reportPhiMediaUploadFailure(
      reportUrl,
      readPhiMediaUploadFailureReason(uploadError),
      uploadError instanceof Error ? uploadError.message : null,
    );
    throw uploadError;
  }
  // The same moment as Core's own flow, for the same reason: there is one upload lifecycle.
  standDown();

  return await finalize(upload.completion);
}
