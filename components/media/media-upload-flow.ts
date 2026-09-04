import type { PhiImagePreviewApiRecord } from "./phi-image-preview-data";
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
  | { kind: "presigned-put"; url: string; method: "PUT"; headers: Record<string, string>; expiresAt?: string };

type PhiMediaUploadInitResponse = {
  token?: string;
  plan?: PhiMediaUploadPlan;
  finalizeUrl?: string;
  reportUrl?: string;
  expiresAt?: string;
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

export type PhiMediaUploadSessionResult = {
  asset: PhiImagePreviewApiRecord;
  token: string;
};

type PhiMediaUploadInitSession = {
  token: string;
  plan: PhiMediaUploadPlan;
  finalizeUrl: string;
  reportUrl: string;
  expiresAt: string;
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

/** The origin the browser was told to deliver to, and never the signature that came with it. */
function readPlanTarget(plan: PhiMediaUploadPlan) {
  try {
    const target = new URL(plan.url, typeof location === "undefined" ? undefined : location.href);
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
): Promise<PhiMediaUploadInitSession> {
  const folderId = Number.isInteger(options?.folderId) && (options?.folderId ?? 0) > 0
    ? options?.folderId
    : null;
  const presentationFlags = Number.isInteger(options?.presentationFlags) && (options?.presentationFlags ?? 0) >= 0 ? options?.presentationFlags : null;
  const meta =
    options?.meta && typeof options.meta === "object" && !Array.isArray(options.meta)
      ? options.meta
      : null;
  // The Space is named the way every Media route names one -- as a query parameter -- while the Folder
  // and the flags travel in the body, because those describe the Asset rather than the Space it lands in.
  const spaceAddress = options?.spaceAddress?.trim() || null;
  const initUrl = spaceAddress
    ? `/api/site/media/uploads/init?spaceId=${encodeURIComponent(spaceAddress)}`
    : "/api/site/media/uploads/init";
  const response = await fetch(initUrl, {
    method: "POST",
    headers: buildPhiMediaRequestHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
    }),
    cache: "no-store",
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      ...(folderId ? { folderId } : {}),
      ...(presentationFlags != null ? { presentationFlags } : {}),
      ...(meta ? { meta } : {}),
    }),
  });

  const payload = await readJsonResponse<PhiMediaUploadInitResponse>(response);
  if (!payload.token || !payload.plan?.url || !payload.finalizeUrl) {
    throw new Error(payload.error ?? "Failed to create upload session.");
  }

  return {
    token: payload.token,
    plan: payload.plan,
    finalizeUrl: payload.finalizeUrl,
    // Derived when an older control plane did not send it: reporting is a courtesy, and losing it must
    // not be what makes an upload fail.
    reportUrl: payload.reportUrl ?? `/api/site/media/uploads/${payload.token}/report`,
    expiresAt: payload.expiresAt ?? "",
  };
}

export async function uploadPhiMediaUploadBody(
  plan: PhiMediaUploadPlan,
  file: File,
  onProgress?: PhiMediaUploadProgressHandler,
) {
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

  return await new Promise<PhiMediaUploadUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
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

export async function runPhiMediaUploadSession(
  file: File,
  onProgress?: PhiMediaUploadProgressHandler,
  options?: PhiMediaUploadInitOptions,
): Promise<PhiMediaUploadSessionResult> {
  const init = await initPhiMediaUploadSession(file, options);
  let upload;
  try {
    upload = await uploadPhiMediaUploadBody(init.plan, file, onProgress);
  } catch (uploadError) {
    // The Server cannot see this leg, so it is told rather than left to infer it from an expiry.
    await reportPhiMediaUploadFailure(
      init.reportUrl,
      readPhiMediaUploadFailureReason(uploadError),
      uploadError instanceof Error ? uploadError.message : null,
    );
    throw uploadError;
  }
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
}): Promise<TAsset> {
  const { file, reservation, finalize, onProgress } = input;
  const reportUrl = input.reportUrl
    ?? `/api/site/media/uploads/${encodeURIComponent(reservation.token)}/report`;

  let upload;
  try {
    upload = await uploadPhiMediaUploadBody(reservation.plan, file, onProgress);
  } catch (uploadError) {
    await reportPhiMediaUploadFailure(
      reportUrl,
      readPhiMediaUploadFailureReason(uploadError),
      uploadError instanceof Error ? uploadError.message : null,
    );
    throw uploadError;
  }

  return await finalize(upload.completion);
}
