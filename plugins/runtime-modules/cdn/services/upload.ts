import type {
  PhisCdnAdminFileV1,
  PhisCdnAdminListV1,
  PhisCdnUploadInitV1,
  PhisCdnUploadStateV1,
} from "@phis/contracts/addon";
import { isPhiRecord } from "../../../../helpers/is-record";
import { readPhiJsonError, requestPhiJson, type PhiJsonReply } from "../../../../helpers/client-json-request";
import { buildPhiMediaClientDigest } from "../../../../components/media/media-upload-digest";
import {
  PhiMediaUploadError,
  type PhiUploadSession,
  type PhiUploadTarget,
} from "../../../../components/media/media-upload-flow";

/**
 * The Site's CDN as an upload target (`runPhiUploadSession`): the Media upload's sequence -- the parts
 * hashed as the Media upload divides a file, the parts the storage does not hold sent with a heartbeat
 * beside them, retried as Media's are -- carried to Core's CDN routes (`/api/site/admin/cdn/uploads`).
 *
 * What is the CDN's own is only what its routes say differently:
 *
 * - **A part goes to Core**, `PUT …/parts/<n>`, which streams it on to the bucket; it answers no entity
 *   tag (`partReceipt: "none"`), because Core completes the assembly itself.
 * - **Resuming is opening.** The same key, size and part digests answer the session that is open, with the
 *   parts that arrived, so the plan addresses only what is missing. Nothing tells Core a page went away: a
 *   session whose heartbeat stops expires on its own, and until then it can be taken up again.
 * - **Cancel discards.** Stopped with `PHI_CDN_UPLOAD_DISCARD` as the abort reason, the session is deleted
 *   and what arrived goes with it; stopped for any other reason -- the dialog closed -- it is left.
 * - **Settling is hashing.** Completed, Core hashes the whole file from the bucket and records it; the
 *   target asks until it has (`finish`).
 *
 * Limits are Core's: one file's size, the Space's quota, the types the CDN serves. A refusal is a
 * `PhiMediaUploadError` with Core's code and Core's sentence.
 */

const PHI_CDN_UPLOAD_API_PATH = "/api/site/admin/cdn/uploads";

/** The abort reason that deletes the session instead of leaving it to be resumed. */
export const PHI_CDN_UPLOAD_DISCARD = "phi-cdn-upload-discard";

/** How long between two questions about a completed upload while Core hashes it. */
const DEFAULT_POLL_INTERVAL_MS = 1000;

/** What a file is published as: its key's three segments and its platform. */
export type PhiCdnUploadInput = {
  name: string;
  version: string;
  fileName: string;
  /** `PhisCdnFileOs` bits. */
  os: number;
  /** `PhisCdnFileArch` bits. */
  arch: number;
};

function readCoreRefusal(reply: PhiJsonReply<unknown>) {
  const code = isPhiRecord(reply.payload) && typeof reply.payload.error === "string"
    ? reply.payload.error
    : `status-${reply.status}`;
  return new PhiMediaUploadError(
    readPhiJsonError(reply.payload, `The CDN answered with status ${reply.status}.`, ["message", "error"]),
    code,
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
    throw new PhiMediaUploadError("The CDN upload answer is not in the shape Core states.", "invalid-response", 0);
  }
  return value as unknown as PhisCdnUploadStateV1;
}

function sleep(ms: number, signal: AbortSignal | undefined) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new PhiMediaUploadError("The upload was stopped.", "cancelled", 0));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

const uploadPath = (token: string) => `${PHI_CDN_UPLOAD_API_PATH}/${encodeURIComponent(token)}`;

/** Asks after a completed upload until Core has hashed and recorded it, or says why it did not. */
async function waitForPublished(
  state: PhisCdnUploadStateV1,
  signal: AbortSignal | undefined,
  pollIntervalMs: number,
): Promise<PhisCdnAdminFileV1> {
  let current = state;
  while (current.state === "hashing") {
    await sleep(pollIntervalMs, signal);
    const asked = await requestPhiJson(uploadPath(current.token), { ...(signal ? { signal } : {}) });
    if (!asked.ok) throw readCoreRefusal(asked);
    current = readUploadState(asked.payload);
  }
  if (current.state === "published" && current.file) return current.file;
  if (current.state === "aborted") throw new PhiMediaUploadError("The upload was aborted.", "cancelled", 0);
  throw new PhiMediaUploadError(
    current.error?.message ?? "Core did not publish the file.",
    current.error?.code ?? "failed",
    0,
  );
}

/** One file into the Site's CDN as `input` names it. */
export function createPhiCdnUploadTarget(
  input: PhiCdnUploadInput,
  { pollIntervalMs = DEFAULT_POLL_INTERVAL_MS }: { pollIntervalMs?: number } = {},
): PhiUploadTarget<PhisCdnAdminFileV1> {
  return {
    open: async (file, signal): Promise<PhiUploadSession<PhisCdnAdminFileV1>> => {
      const digest = await buildPhiMediaClientDigest(file);
      if (!digest) {
        throw new PhiMediaUploadError(
          "This browser cannot compute the file's checksum here (it needs a secure connection).",
          "checksum-unavailable",
          0,
        );
      }
      const init: PhisCdnUploadInitV1 = {
        name: input.name,
        version: input.version,
        fileName: input.fileName,
        sizeBytes: file.size,
        ...(file.type ? { contentType: file.type } : {}),
        os: input.os,
        arch: input.arch,
        partSha256: "sha256" in digest ? [digest.sha256] : digest.partSha256,
      };
      const opened = await requestPhiJson(PHI_CDN_UPLOAD_API_PATH, {
        method: "POST",
        body: init,
        ...(signal ? { signal } : {}),
      });
      if (!opened.ok) throw readCoreRefusal(opened);
      const state = readUploadState(opened.payload);
      const held = new Set(state.uploaded);
      const parts = Array.from({ length: state.partCount }, (_, index) => index + 1)
        .filter((partNumber) => !held.has(partNumber));
      return {
        plan: {
          kind: "multipart-put",
          method: "PUT",
          uploadId: state.token,
          partSizeBytes: state.partSizeBytes,
          parts: parts.map((partNumber) => ({ partNumber, url: `${uploadPath(state.token)}/parts/${partNumber}` })),
        },
        uploaded: [...held].map((partNumber) => ({ partNumber, eTag: "" })),
        heartbeat: { url: `${uploadPath(state.token)}/heartbeat`, intervalMs: Math.max(1000, state.heartbeatIntervalMs) },
        partReceipt: "none",
        abandon: async (_error, stopped) => {
          if (stopped?.aborted && stopped.reason === PHI_CDN_UPLOAD_DISCARD) {
            await requestPhiJson(uploadPath(state.token), { method: "DELETE" }).catch(() => undefined);
          }
        },
        finish: async (_completion, stopped) => {
          // A session taken up again after its completion was sent is hashing already: only the wait is left.
          if (state.state === "hashing" || state.state === "published") {
            return await waitForPublished(state, stopped, pollIntervalMs);
          }
          const completed = await requestPhiJson(`${uploadPath(state.token)}/complete`, { method: "POST" });
          if (!completed.ok) throw readCoreRefusal(completed);
          return await waitForPublished(readUploadState(completed.payload), stopped, pollIntervalMs);
        },
      };
    },
  };
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
