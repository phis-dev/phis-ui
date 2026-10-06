"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PhiMediaKind, resolvePhiMediaKindFromContentType } from "../../constants/media";
import type { PhiMediaKindValue } from "../../types/media";
import {
  PhiMediaUploadError,
  isPhiMediaUploadCancelled,
  runPhiMediaUploadSession,
  type PhiMediaUploadSessionRunner,
  type PhiMediaUploadInitOptions,
} from "./media-upload-flow";

/**
 * What a surface accepts, stated by the Module that offers it.
 *
 * A narrowing of the Site's own rule and never a widening: the Site's `max_object_bytes` and
 * `allowed_content_types` are enforced by the control plane whatever is declared here, so a Module can
 * ask for less than its Site allows but never for more. An installed package overruling the operator
 * who installed it would be the wrong direction.
 *
 * Refusing here is therefore a courtesy, not a boundary -- it keeps the file dialog honest and answers
 * before a request is made. The answer that binds comes from the server either way.
 */
export type PhiMediaUploadAcceptance = {
  kinds?: readonly PhiMediaKindValue[];
  /** Exact types or `type/*` families, matched the way the control plane matches them. */
  contentTypes?: readonly string[];
  maxBytes?: number;
  multiple?: boolean;
};

export type PhiMediaUploadLabels = {
  errorGeneric: string;
  errorNetwork: string;
  errorTooLarge: string;
  errorDuplicate: string;
  errorTypeNotAllowed: string;
  errorQuotaExceeded: string;
  errorSpaceUnavailable: string;
  /** The body never reached the storage Provider, or the Provider refused it. */
  errorStorageUnreachable: string;
};

/**
 * Text for a surface that has no label set of its own.
 *
 * Not a substitute for one: it exists so a surface without translations still says something an ordinary
 * person can act on, rather than showing whatever string the server happened to send. Leaking a control
 * plane message into an interface is what these replace.
 */
export const PHI_MEDIA_UPLOAD_DEFAULT_LABELS: PhiMediaUploadLabels = {
  errorGeneric: "The upload did not work.",
  errorNetwork: "The site could not be reached.",
  errorTooLarge: "That file is too large.",
  errorDuplicate: "That file is already here.",
  errorTypeNotAllowed: "That file type is not accepted here.",
  errorQuotaExceeded: "There is no room left in this space.",
  errorSpaceUnavailable: "That space is not available.",
  errorStorageUnreachable: "The file storage could not be reached.",
};

/** The `accept` attribute a file dialog should carry, derived rather than written out by each caller. */
export function resolvePhiMediaUploadAccept(acceptance: PhiMediaUploadAcceptance | undefined) {
  const types = acceptance?.contentTypes ?? [];
  const kinds = acceptance?.kinds ?? [];
  const fromKinds = kinds.flatMap((kind) =>
    kind === PhiMediaKind.Image ? ["image/*"]
      : kind === PhiMediaKind.Video ? ["video/*"]
        : kind === PhiMediaKind.Audio ? ["audio/*"]
          : kind === PhiMediaKind.Pdf ? ["application/pdf"]
            : kind === PhiMediaKind.Markdown ? ["text/markdown"]
              /*
               * Fonts carry their suffixes as well as their family, because a file dialog is the one
               * place where the type is the operating system's opinion: plenty of desktops hand a
               * `.woff2` over with no type at all, and a dialog narrowed to `font/*` alone would grey
               * out exactly the files somebody opened it for.
               */
              : kind === PhiMediaKind.Font
                ? ["font/*", ".woff2", ".woff", ".ttf", ".otf", ".ttc"]
                : []);
  const merged = [...new Set([...types, ...fromKinds])];
  return merged.length > 0 ? merged.join(",") : "*/*";
}

function matchesContentType(contentType: string, allowed: readonly string[]) {
  if (allowed.length === 0) return true;
  const normalized = contentType.trim().toLowerCase().split(";")[0]!.trim();
  const slash = normalized.indexOf("/");
  const family = slash > 0 ? `${normalized.slice(0, slash)}/*` : null;
  return allowed.some((entry) => {
    const candidate = entry.trim().toLowerCase();
    return candidate === normalized || (family != null && candidate === family);
  });
}

/** Why this file cannot be sent, or `null` when it can. */
export function readPhiMediaUploadRejection(
  file: File,
  acceptance: PhiMediaUploadAcceptance | undefined,
  labels: PhiMediaUploadLabels,
) {
  if (acceptance?.maxBytes != null && file.size > acceptance.maxBytes) {
    return labels.errorTooLarge;
  }
  if (acceptance?.contentTypes?.length && !matchesContentType(file.type, acceptance.contentTypes)) {
    return labels.errorTypeNotAllowed;
  }
  /*
   * A file the browser could not name is not a file this can refuse.
   *
   * The kind is derived from the type the browser states, and for a font it often states nothing --
   * the check would then read `other` and turn away the very file the dialog was opened for. Refusing
   * on the absence of evidence is worse than sending it: the server reads the bytes, and that is the
   * answer that binds anyway.
   */
  if (acceptance?.kinds?.length && file.type.trim()
    && !acceptance.kinds.includes(resolvePhiMediaKindFromContentType(file.type))) {
    return labels.errorTypeNotAllowed;
  }
  return null;
}

/**
 * One reading of every refusal the upload path can produce.
 *
 * Each surface used to know a different subset -- one knew about duplicates, another about size and
 * an unavailable Space -- so the same refusal read differently depending on where a person happened to
 * be standing. The codes come from the control plane; anything unrecognized falls to the generic text
 * rather than leaking a server message into an interface.
 */
export function readPhiMediaUploadErrorMessage(error: unknown, labels: PhiMediaUploadLabels) {
  const code = error instanceof PhiMediaUploadError
    ? error.code
    : (error as { code?: unknown } | null)?.code;
  switch (code) {
    case "media_asset_exists": return labels.errorDuplicate;
    case "media_asset_too_large": return labels.errorTooLarge;
    case "content_type_not_allowed": return labels.errorTypeNotAllowed;
    case "media_quota_exceeded": return labels.errorQuotaExceeded;
    case "space_kind_unavailable":
    case "space_forbidden":
    case "space_not_found": return labels.errorSpaceUnavailable;
    // A presigned plan is delivered past the Site: reaching the Site says nothing about reaching the
    // Provider, so this is deliberately not the same reading as a network failure.
    case "storage_unreachable":
    case "storage_rejected": return labels.errorStorageUnreachable;
    default: break;
  }
  // A TypeError from fetch is the browser saying it never reached the site at all.
  return error instanceof TypeError ? labels.errorNetwork : labels.errorGeneric;
}

export type PhiMediaUploadItem = {
  localId: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error: string | null;
  assetId: number | null;
};

/**
 * The shared half of every upload surface: accept, transport, progress, refusal.
 *
 * What it deliberately does not own is what happens afterwards -- appending a tile, binding an avatar,
 * replacing a preview. That is the only part that differs between the surfaces, so it stays with them
 * and arrives through `onUploaded`.
 *
 * An upload belongs to the surface that started it. When that surface goes away -- an Overlay closed, a
 * form unmounted -- every upload still running is stopped and reported `cancelled`, so no Asset is
 * finalized that nobody will enter anywhere. `cancel()` does the same while the surface stays. A stopped
 * upload leaves the list and calls neither `onUploaded` nor `onRejected`: nobody is waiting for it.
 *
 * `uploading` is true while any file is still on its way. A surface whose value is only complete once the
 * upload settled -- a form field that receives the Asset id in `onUploaded` -- reads it to hold back
 * whatever would act on the incomplete value.
 */
export function usePhiMediaUpload(input: {
  labels: PhiMediaUploadLabels;
  acceptance?: PhiMediaUploadAcceptance;
  initOptions?: PhiMediaUploadInitOptions;
  /**
   * Where the session is begun and settled. Core's Media routes unless a caller says otherwise.
   *
   * A slot on an Add-on's row is begun and settled at that Add-on's root and travels the same way in
   * between, so it is this one thing that differs -- and everything a person sees while it happens is
   * shared rather than reimplemented alongside.
   */
  runSession?: PhiMediaUploadSessionRunner;
  onUploaded?: (asset: { id: number }, file: File) => void | Promise<void>;
  onRejected?: (message: string, file: File) => void;
}) {
  const { labels, acceptance, initOptions, onUploaded, onRejected } = input;
  const runSession = input.runSession ?? runPhiMediaUploadSession;
  const [items, setItems] = useState<readonly PhiMediaUploadItem[]>([]);
  const sequence = useRef(0);
  const running = useRef(new Set<AbortController>());

  useEffect(() => {
    const controllers = running.current;
    return () => {
      for (const controller of controllers) controller.abort();
      controllers.clear();
    };
  }, []);

  const accept = useMemo(() => resolvePhiMediaUploadAccept(acceptance), [acceptance]);

  const patch = useCallback((localId: string, next: Partial<PhiMediaUploadItem>) => {
    setItems((current) => current.map((item) => item.localId === localId ? { ...item, ...next } : item));
  }, []);

  const upload = useCallback(async (file: File) => {
    const rejection = readPhiMediaUploadRejection(file, acceptance, labels);
    if (rejection) {
      onRejected?.(rejection, file);
      return null;
    }
    sequence.current += 1;
    const localId = `upload-${sequence.current}`;
    setItems((current) => [
      { localId, file, progress: 0, status: "uploading", error: null, assetId: null },
      ...current,
    ]);
    const controller = new AbortController();
    running.current.add(controller);
    let asset: { id: number };
    try {
      ({ asset } = await runSession(
        file,
        (progress) => patch(localId, { progress }),
        initOptions,
        controller.signal,
      ));
    } catch (error) {
      if (controller.signal.aborted || isPhiMediaUploadCancelled(error)) {
        setItems((current) => current.filter((item) => item.localId !== localId));
        return null;
      }
      const message = readPhiMediaUploadErrorMessage(error, labels);
      patch(localId, { progress: 100, status: "error", error: message });
      onRejected?.(message, file);
      return null;
    } finally {
      running.current.delete(controller);
    }
    // Stopped while finalize was answering: the Asset exists, but nobody is waiting to enter it.
    if (controller.signal.aborted) return null;
    patch(localId, { progress: 100, status: "done", assetId: asset.id });
    try {
      await onUploaded?.(asset, file);
    } catch (error) {
      const message = readPhiMediaUploadErrorMessage(error, labels);
      patch(localId, { status: "error", error: message });
      onRejected?.(message, file);
      return null;
    }
    return asset;
  }, [acceptance, initOptions, labels, onRejected, onUploaded, patch, runSession]);

  const cancel = useCallback(() => {
    for (const controller of running.current) controller.abort();
  }, []);
  const reset = useCallback(() => setItems([]), []);
  const uploading = items.some((item) => item.status === "uploading");

  return { accept, items, uploading, upload, cancel, reset };
}
