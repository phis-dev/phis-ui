"use client";

import { PhiEntryListControl } from "../../../../../components/controls/phi-entry-list-control";
import { PhiProgressControl } from "../../../../../components/controls/phi-progress-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePhiMediaUpload } from "../../../../../components/media/phi-media-upload";
import {
  runPhiAddonAssetUpload,
  type PhiAddonAssetReservation,
} from "../../../../../components/media/media-upload-flow";
import { PHI_MEDIA_UPLOAD_DEFAULT_LABELS } from "../../../../../components/media/phi-media-upload";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import {
  emitPhiSignalCapability,
  usePhiSignalEmitter,
  usePhiSignalIdentity,
} from "../../../../../components/runtime/runtime-signal-identity";
import { readPhiTableBindingParamsSignalValue } from "../../../../../types/table-signal-values";
import type { PhiSignal } from "../../../../../types/signals";
import { findPhiSignalListenRoute } from "../../../../../helpers/signal-listen-routes";
import type { PhiSlotUploadWidgetConfig } from "./config";
import {
  formatPhiSlotUploadWidgetLabel,
  type PhiSlotUploadWidgetLabels,
} from "../../../../../components/widgets/label-types/slot-upload";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import { PhiImageControl } from "../../../../../components/controls/phi-image-control";
import { PhiLabeledControl } from "../../../../../components/controls/phi-labeled-control";
import { resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import { PhiMediaKind, resolvePhiMediaKindFromContentType } from "../../../../../constants/media";

/**
 * A file on a row, through the door Core opens under every Add-on's own root.
 *
 * What a slot takes is asked rather than configured: the Add-on's schema descriptor states the types,
 * the ceiling and whether the slot holds one file or many, and Core answers with them. A second copy in
 * a widget config would be wrong from the first time somebody widened a slot.
 *
 * The row arrives as a Signal, so the same field serves whichever row the surface around it is about.
 * Until one arrives there is nothing to upload to, and the widget says so rather than offering a button
 * that would fail.
 */

type SlotDescriptor = {
  name: string;
  cardinality: "one" | "many";
  maxBytes: number;
  contentTypes: string[];
};

type SlotFile = {
  id: string;
  slot: string;
  contentPath: string;
  byteSize: number;
  contentType: string;
};

/** The side of the square a picture of the slot is shown at, beside its type and size. */
const THUMBNAIL_SIZE = 48;

/*
 * A picture is shown, everything else is named: its type and size are said either way, because a
 * thumbnail tells which picture it is but not whether it is the 40 MB original somebody meant to shrink.
 * The address is Core's delivery path for the file, drawn as it is rather than through the optimiser:
 * a slot's file is not a public Asset, so the optimiser may not take its bytes.
 */
function SlotFileTitle({ file, text }: { file: SlotFile; text: string }) {
  if (resolvePhiMediaKindFromContentType(file.contentType) !== PhiMediaKind.Image) {
    return text;
  }
  return (
    <PhiFlexControl align="center" gap={8}>
      <PhiImageControl
        presentation={resolvePhiImagePresentation({ sourceKind: "url", sourceUrl: file.contentPath, fit: "cover" })}
        source="url"
        alt=""
        width={THUMBNAIL_SIZE}
        height={THUMBNAIL_SIZE}
        loading="lazy"
        style={{ flex: "none", borderRadius: "var(--phi-border-radius-sm)", overflow: "hidden" }}
      />
      <span>{text}</span>
    </PhiFlexControl>
  );
}

export type PhiSlotUploadWidgetClientProps = {
  config?: PhiSlotUploadWidgetConfig;
  labels: PhiSlotUploadWidgetLabels;
};

export function PhiSlotUploadWidgetClient({ config, labels }: PhiSlotUploadWidgetClientProps) {
  const addon = config?.addon?.trim() ?? "";
  const table = config?.table?.trim() ?? "";
  const slotName = config?.slot?.trim() ?? "";
  const ownerParam = config?.ownerParam?.trim() || "id";
  const signalIdentity = usePhiSignalIdentity();
  const listenRoutes = useMemo(() => config?.signalRoutes?.listens ?? [], [config?.signalRoutes?.listens]);
  const emitRoutes = useMemo(() => config?.signalRoutes?.emits ?? [], [config?.signalRoutes?.emits]);
  const emitSignal = usePhiSignalEmitter();
  /*
   * The row's files changed -- a file arrived or went -- so whatever shows the row can read it again.
   * Sent only once the change is through, never for an upload that was refused or a removal that failed.
   */
  const announceChanged = useCallback(
    () => emitPhiSignalCapability(emitSignal, emitRoutes, "changed", null),
    [emitRoutes, emitSignal],
  );

  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotDescriptor | null>(null);
  /*
   * Kept with the row it was read for, rather than cleared when the row changes.
   *
   * Clearing would be a state write inside an effect, and it would also be a lie for one render: the
   * files of the previous row are not this row's, and an empty list is not what is known about it yet.
   * Holding both together makes "not for this row" a thing the render can see.
   */
  const [loaded, setLoaded] = useState<{ ownerId: string; files: readonly SlotFile[] } | null>(null);
  /** What went wrong with this row: reading its files, an upload, a removal. Cleared with the row. */
  const [failure, setFailure] = useState<string | null>(null);
  /** What is wrong with the slot itself, which no row changes. */
  const [slotFailure, setSlotFailure] = useState<string | null>(null);

  /** `/api/addons/<scope>/<name>/_assets`, which is Core's and the same for every Add-on. */
  const base = useMemo(() => {
    const match = /^@([^/]+)\/([^/]+)$/u.exec(addon);
    return match ? `/api/addons/${match[1]}/${match[2]}/_assets/${table}` : null;
  }, [addon, table]);

  const read = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}) },
      ...init,
    });
    const body = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      throw new Error(
        typeof body?.error === "string"
          ? body.error
          : formatPhiSlotUploadWidgetLabel(labels.serverAnswered, response.status),
      );
    }
    return body ?? {};
  }, [labels.serverAnswered]);

  usePhiSignalListener(useCallback((signal: PhiSignal) => {
    if (!findPhiSignalListenRoute(listenRoutes, signal, signalIdentity.receiver)) return;
    const params = readPhiTableBindingParamsSignalValue(signal.value)?.params;
    const next = params?.[ownerParam];
    const nextOwnerId = next == null ? null : String(next);
    // What went wrong on the previous row is not this row's to show.
    if (nextOwnerId !== ownerId) setFailure(null);
    setOwnerId(nextOwnerId);
  }, [listenRoutes, ownerId, ownerParam, signalIdentity.receiver]),
  undefined,
  /*
   * The address this Widget answers for. Read without being named, a signal sent to it is held by the
   * bus until somebody answers -- which nobody did, so a binding parameter aimed at this upload slot
   * waited forever while a broadcast of the same value went through.
   */
  signalIdentity.receiver ?? undefined);

  // What the slot takes. Asked once per table, because it is the manifest's answer and does not vary
  // with the row.
  useEffect(() => {
    if (!base || !slotName) return;
    let live = true;
    void read(base)
      .then((body) => {
        if (!live) return;
        const declared = (body.slots as SlotDescriptor[] | undefined ?? [])
          .find((entry) => entry.name === slotName);
        setSlot(declared ?? null);
        setSlotFailure(declared ? null : formatPhiSlotUploadWidgetLabel(labels.slotMissing, slotName));
      })
      .catch((error: unknown) => {
        if (live) setSlotFailure(error instanceof Error ? error.message : labels.unreachable);
      });
    return () => { live = false; };
  }, [base, labels.slotMissing, labels.unreachable, read, slotName]);

  // Reads rather than stores: what to do with the answer belongs to whoever asked, and an effect that
  // only subscribes is one the rules about effects are happy with.
  const readFiles = useCallback(async (owner: string) => {
    if (!base) return [] as readonly SlotFile[];
    const body = await read(`${base}/${encodeURIComponent(owner)}`);
    return ((body.files as SlotFile[] | undefined) ?? []).filter((file) => file.slot === slotName);
  }, [base, read, slotName]);

  /*
   * Reads the row's files again and says so where it cannot. Never rejects: it runs after an upload and
   * after a removal, which both already happened -- a read that failed afterwards is a failure to show,
   * not one to hand back to them.
   */
  const reload = useCallback(async () => {
    if (!ownerId) return;
    try {
      setLoaded({ ownerId, files: await readFiles(ownerId) });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : labels.unreachable);
    }
  }, [labels.unreachable, ownerId, readFiles]);

  useEffect(() => {
    if (!base || !ownerId) {
      return;
    }
    let live = true;
    void readFiles(ownerId)
      .then((files) => { if (live) setLoaded({ ownerId, files }); })
      .catch((error: unknown) => {
        if (live) setFailure(error instanceof Error ? error.message : labels.unreachable);
      });
    return () => { live = false; };
  }, [base, labels.unreachable, ownerId, readFiles]);

  /*
   * The session, begun and settled at the Add-on's root; the transfer between them is Core's own and
   * the same one every Media surface runs, progress and refusals included.
   */
  const runSession = useCallback(async (
    file: File,
    onProgress?: (progress: number) => void,
    _options?: unknown,
    signal?: AbortSignal,
  ) => {
    if (!base || !ownerId) {
      throw new Error("There is no row to put this on.");
    }
    const slotBase = `${base}/${encodeURIComponent(ownerId)}/${encodeURIComponent(slotName)}`;
    const begun = await read(slotBase, {
      method: "POST",
      ...(signal ? { signal } : {}),
      body: JSON.stringify({
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        filename: file.name,
      }),
    });
    const reservation = begun.reservation as PhiAddonAssetReservation;
    const view = await runPhiAddonAssetUpload({
      file,
      reservation,
      ...(onProgress ? { onProgress } : {}),
      ...(signal ? { signal } : {}),
      finalize: async (completion) => {
        const settled = await read(`${slotBase}/finalize`, {
          method: "POST",
          body: JSON.stringify({ token: reservation.token, completion }),
        });
        return settled.file as SlotFile & { mediaAssetId: number };
      },
    });
    return { asset: { id: view.mediaAssetId } };
  }, [base, ownerId, read, slotName]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = usePhiMediaUpload({
    labels: PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
    ...(slot
      ? {
        acceptance: {
          contentTypes: slot.contentTypes,
          maxBytes: slot.maxBytes,
          multiple: slot.cardinality === "many",
        },
      }
      : {}),
    runSession,
    onUploaded: async () => {
      setFailure(null);
      announceChanged();
      await reload();
    },
    onRejected: (message) => setFailure(message),
  });

  const files = loaded?.ownerId === ownerId ? loaded.files : [];

  /*
   * The removal and the read after it fail apart: a DELETE that went through and a list that could not
   * be read again are two answers, and saying "That file stayed" for the second was untrue.
   */
  const remove = useCallback(async (id: string) => {
    if (!base || !ownerId) return;
    setFailure(null);
    try {
      await read(`${base}/${encodeURIComponent(ownerId)}/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      setFailure(labels.removeFailed);
      return;
    }
    announceChanged();
    await reload();
  }, [announceChanged, base, labels.removeFailed, ownerId, read, reload]);

  if (!base || !slotName) {
    return (
      <PhiLabeledControl label={config?.label}>
        <PhiTypographyControl type="secondary">{labels.unconfigured}</PhiTypographyControl>
      </PhiLabeledControl>
    );
  }

  return (
    <PhiLabeledControl label={config?.label} fill>
      <PhiFlexControl vertical gap={8} data-phis-slot-upload={slotName}>
        {ownerId === null ? (
          <PhiTypographyControl type="secondary">{labels.noRow}</PhiTypographyControl>
        ) : (
          <>
            {/*
              * The file dialog is a plain input the button opens, rather than an Upload wrapper that reacts
              * to a press on its child: that child would have been a button with nothing of its own to
              * call, which `PhiButtonControl` renders disabled. The upload itself never went through the
              * wrapper -- `usePhiMediaUpload` sends every file -- so nothing is lost by leaving it out.
              */}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple={slot?.cardinality === "many"}
              accept={slot?.contentTypes.join(",")}
              onChange={(event) => {
                for (const file of Array.from(event.target.files ?? [])) void upload.upload(file);
                // Cleared so choosing the same file again is a change, and uploads again.
                event.target.value = "";
              }}
            />
            <PhiButtonControl
              icon={<PhiIcon name="upload" size="inherit" />}
              label={labels.choose}
              onClick={() => fileInputRef.current?.click()}
            />
          </>
        )}
        {upload.items.filter((item) => item.status === "uploading").map((item) => (
          <PhiProgressControl key={item.localId} percent={item.progress} size="small" />
        ))}
        {slotFailure ?? failure ? (
          <PhiTypographyControl type="danger" role="alert">{slotFailure ?? failure}</PhiTypographyControl>
        ) : null}
        <PhiEntryListControl
          emptyDescription={labels.empty}
          entries={[...files].map((file) => ({
            key: String(file.id),
            title: (
              <SlotFileTitle
                file={file}
                text={formatPhiSlotUploadWidgetLabel(labels.fileTitle, file.contentType, file.byteSize)}
              />
            ),
            action: (
              <PhiButtonControl
                size="small"
                icon={<PhiIcon name="delete" size="inherit" />}
                ariaLabel={labels.remove}
                tooltip={labels.remove}
                onClick={() => { void remove(file.id); }}
              />
            ),
          }))}
        />
      </PhiFlexControl>
    </PhiLabeledControl>
  );
}
