import type {
  PhisCdnAdminFileV1,
  PhisCdnAdminListV1,
  PhisCdnUploadInitV1,
  PhisCdnUploadStateV1,
} from "@phis/contracts/addon";
import { isPhiRecord } from "../../../../helpers/is-record";
import { readPhiJsonError, requestPhiJson, type PhiJsonReply } from "../../../../helpers/client-json-request";
import { buildPhiMediaClientDigest } from "../../../../components/media/media-upload-digest";

/**
 * A Maintainer's upload into the Site's CDN, from the browser through Core.
 *
 * The same sequence as the Media upload's (`runPhiMediaUploadSession`): the parts are hashed as the
 * Media upload divides a file (`buildPhiMediaClientDigest`), the session is opened with those digests,
 * the parts the storage does not hold yet go one after another with a heartbeat beside them, and the
 * upload is completed and asked after until Core has hashed the whole file. The endpoints are the CDN's
 * (`/api/site/admin/cdn/uploads`), and so are two differences:
 *
 * - **A reload resumes.** Opening the same key with the same size and the same part digests answers the
 *   session that is open, with the parts that arrived (`uploaded`), so picking the same file again sends
 *   only what is missing. That is also why nothing here tells Core that a page went away: a session
 *   whose heartbeat stops expires on its own, and until then it can be taken up again.
 * - **Cancel discards.** Stopped with `PHI_CDN_UPLOAD_DISCARD` as the abort reason, the session is
 *   deleted and what arrived goes with it. Stopped for any other reason -- the dialog closed -- it is
 *   left for a later resume.
 *
 * Limits are Core's: the size of one file, the Space's quota, the types the CDN serves. A refusal comes
 * back with Core's own sentence, which is what the person is shown.
 */

const PHI_CDN_UPLOAD_API_PATH = "/api/site/admin/cdn/uploads";

/** The abort reason that deletes the session instead of leaving it to be resumed. */
export const PHI_CDN_UPLOAD_DISCARD = "phi-cdn-upload-discard";

/** How often a part is tried again after the network failed it, before the upload stops. */
const PART_ATTEMPTS = 3;

/** How long between two questions about a completed upload while Core hashes it. */
const DEFAULT_POLL_INTERVAL_MS = 1000;

export type PhiCdnUploadInput = {
  file: File;
  name: string;
  version: string;
  fileName: string;
  /** `PhisCdnFileOs` bits. */
  os: number;
  /** `PhisCdnFileArch` bits. */
  arch: number;
};

export type PhiCdnUploadProgress =
  | { stage: "checksum" }
  | { stage: "uploading"; loadedBytes: number; totalBytes: number; partCount: number; resumedParts: number }
  | { stage: "hashing" };

/**
 * Why an upload did not end published. `code` is Core's (`key_taken`, `too_large`, `quota-exceeded` ...)
 * or one of this flow's own: `checksum-unavailable` (the browser cannot hash: no secure context),
 * `cancelled`, `network`, `invalid-response`. `message` is Core's sentence where Core said one.
 */
export class PhiCdnUploadError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 0) {
    super(message);
    this.name = "PhiCdnUploadError";
    this.code = code;
    this.status = status;
  }
}

function readCoreRefusal(reply: PhiJsonReply<unknown>) {
  const code = isPhiRecord(reply.payload) && typeof reply.payload.error === "string"
    ? reply.payload.error
    : `status-${reply.status}`;
  return new PhiCdnUploadError(
    code,
    readPhiJsonError(reply.payload, `The CDN answered with status ${reply.status}.`, ["message", "error"]),
    reply.status,
  );
}

function readUploadState(value: unknown): PhisCdnUploadStateV1 {
  if (
    !isPhiRecord(value) ||
    typeof value.token !== "string" ||
    typeof value.state !== "string" ||
    typeof value.partSizeBytes !== "number" ||
    typeof value.partCount !== "number" ||
    !Array.isArray(value.uploaded) ||
    typeof value.heartbeatIntervalMs !== "number"
  ) {
    throw new PhiCdnUploadError("invalid-response", "The CDN upload answer is not in the shape Core states.");
  }
  return value as unknown as PhisCdnUploadStateV1;
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw new PhiCdnUploadError("cancelled", "The upload was stopped.");
}

function sleep(ms: number, signal: AbortSignal | undefined) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new PhiCdnUploadError("cancelled", "The upload was stopped."));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** The part digests Core is opened with: one per part, one for a file of one part. */
async function buildPhiCdnPartDigests(file: File): Promise<string[]> {
  const digest = await buildPhiMediaClientDigest(file);
  if (!digest) {
    throw new PhiCdnUploadError(
      "checksum-unavailable",
      "This browser cannot compute the file's checksum here (it needs a secure connection).",
    );
  }
  return "sha256" in digest ? [digest.sha256] : digest.partSha256;
}

/** The bytes of part `partNumber`, counted from one, as the plan divides the file. */
function partRange(partNumber: number, partSizeBytes: number, size: number) {
  const start = Math.min((partNumber - 1) * partSizeBytes, size);
  return { start, end: Math.min(start + partSizeBytes, size) };
}

function storedBytes(uploaded: readonly number[], partSizeBytes: number, size: number) {
  return [...new Set(uploaded)].reduce((sum, partNumber) => {
    const range = partRange(partNumber, partSizeBytes, size);
    return sum + (range.end - range.start);
  }, 0);
}

async function sendPart(
  token: string,
  partNumber: number,
  body: Blob,
  signal: AbortSignal | undefined,
) {
  for (let attempt = 1; ; attempt += 1) {
    throwIfAborted(signal);
    let response: Response;
    try {
      response = await fetch(`${PHI_CDN_UPLOAD_API_PATH}/${encodeURIComponent(token)}/parts/${partNumber}`, {
        method: "PUT",
        credentials: "include",
        cache: "no-store",
        headers: { "content-type": "application/octet-stream", accept: "application/json" },
        body,
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      throwIfAborted(signal);
      if (attempt >= PART_ATTEMPTS) {
        throw new PhiCdnUploadError("network", error instanceof Error ? error.message : "The part did not arrive.");
      }
      continue;
    }
    if (response.ok) return;
    const payload = await response.json().catch(() => null);
    // A refusal is Core's answer and is final; only a server error is worth another try.
    if (response.status < 500 || attempt >= PART_ATTEMPTS) {
      throw readCoreRefusal({ ok: false, status: response.status, payload });
    }
  }
}

/** Keeps the session alive while parts travel; stopped by the function it returns. */
function keepHeartbeat(token: string, intervalMs: number) {
  const timer = setInterval(() => {
    void requestPhiJson(`${PHI_CDN_UPLOAD_API_PATH}/${encodeURIComponent(token)}/heartbeat`, { method: "POST" })
      .catch(() => undefined);
  }, Math.max(1000, intervalMs));
  return () => clearInterval(timer);
}

async function discard(token: string) {
  await requestPhiJson(`${PHI_CDN_UPLOAD_API_PATH}/${encodeURIComponent(token)}`, { method: "DELETE" })
    .catch(() => undefined);
}

export type PhiCdnUploadOptions = {
  onProgress?: (progress: PhiCdnUploadProgress) => void;
  signal?: AbortSignal;
  /** Between two questions while Core hashes the completed file. */
  pollIntervalMs?: number;
};

/** One file into the Site's CDN; resolves with the published file. */
export async function runPhiCdnUpload(
  input: PhiCdnUploadInput,
  { onProgress, signal, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS }: PhiCdnUploadOptions = {},
): Promise<PhisCdnAdminFileV1> {
  const { file } = input;
  onProgress?.({ stage: "checksum" });
  const partSha256 = await buildPhiCdnPartDigests(file);
  throwIfAborted(signal);

  const init: PhisCdnUploadInitV1 = {
    name: input.name,
    version: input.version,
    fileName: input.fileName,
    sizeBytes: file.size,
    ...(file.type ? { contentType: file.type } : {}),
    os: input.os,
    arch: input.arch,
    partSha256,
  };
  const opened = await requestPhiJson(PHI_CDN_UPLOAD_API_PATH, { method: "POST", body: init, ...(signal ? { signal } : {}) })
    .catch((error: unknown) => {
      throwIfAborted(signal);
      throw new PhiCdnUploadError("network", error instanceof Error ? error.message : "Core did not answer.");
    });
  if (!opened.ok) throw readCoreRefusal(opened);
  let state = readUploadState(opened.payload);
  const token = state.token;

  const stopBeating = keepHeartbeat(token, state.heartbeatIntervalMs);
  try {
    let uploaded = new Set(state.uploaded);
    const resumedParts = uploaded.size;
    for (let round = 0; round < 2 && (state.state === "pending" || state.state === "uploading"); round += 1) {
      let loadedBytes = storedBytes([...uploaded], state.partSizeBytes, file.size);
      onProgress?.({ stage: "uploading", loadedBytes, totalBytes: file.size, partCount: state.partCount, resumedParts });
      for (let partNumber = 1; partNumber <= state.partCount; partNumber += 1) {
        if (uploaded.has(partNumber)) continue;
        const range = partRange(partNumber, state.partSizeBytes, file.size);
        await sendPart(token, partNumber, file.slice(range.start, range.end), signal);
        uploaded.add(partNumber);
        loadedBytes += range.end - range.start;
        onProgress?.({ stage: "uploading", loadedBytes, totalBytes: file.size, partCount: state.partCount, resumedParts });
      }
      throwIfAborted(signal);
      const completed = await requestPhiJson(`${PHI_CDN_UPLOAD_API_PATH}/${encodeURIComponent(token)}/complete`, {
        method: "POST",
      });
      // Core holds fewer parts than were sent (one expired, say): it names what it has, and the rest go again.
      if (completed.status === 409 && isPhiRecord(completed.payload) && completed.payload.error === "parts_missing") {
        const held = Array.isArray(completed.payload.uploaded)
          ? completed.payload.uploaded.filter((entry): entry is number => typeof entry === "number")
          : [];
        uploaded = new Set(held);
        continue;
      }
      if (!completed.ok) throw readCoreRefusal(completed);
      state = readUploadState(completed.payload);
    }
    if (state.state === "pending" || state.state === "uploading") {
      throw new PhiCdnUploadError("parts_missing", "Core still misses parts of the file after sending them again.", 409);
    }
  } catch (error) {
    stopBeating();
    if (signal?.aborted && signal.reason === PHI_CDN_UPLOAD_DISCARD) {
      await discard(token);
    }
    throw error;
  }
  stopBeating();

  /*
   * Completed: Core hashes the whole file from the bucket and records it. A stop now leaves that running
   * -- the bytes are all there -- and only ends the waiting here.
   */
  while (state.state === "hashing") {
    onProgress?.({ stage: "hashing" });
    await sleep(pollIntervalMs, signal);
    const asked = await requestPhiJson(`${PHI_CDN_UPLOAD_API_PATH}/${encodeURIComponent(token)}`, {
      ...(signal ? { signal } : {}),
    });
    if (!asked.ok) throw readCoreRefusal(asked);
    state = readUploadState(asked.payload);
  }
  if (state.state === "published" && state.file) return state.file;
  if (state.state === "aborted") throw new PhiCdnUploadError("cancelled", "The upload was aborted.");
  throw new PhiCdnUploadError(
    state.error?.code ?? "failed",
    state.error?.message ?? "Core did not publish the file.",
  );
}

/** The names the catalogue holds, for the upload dialog to offer: every state, in name order. */
export async function loadPhiCdnNames(signal?: AbortSignal): Promise<string[]> {
  const params = new URLSearchParams({ state: "all", sort: "name", dir: "asc", page: "1", pageSize: "200" });
  const reply = await requestPhiJson<PhisCdnAdminListV1>(`/api/site/admin/cdn?${params.toString()}`, {
    ...(signal ? { signal } : {}),
  });
  if (!reply.ok || !Array.isArray(reply.payload?.files)) return [];
  return [...new Set(reply.payload.files.map((file) => file.name).filter((name) => typeof name === "string"))];
}
