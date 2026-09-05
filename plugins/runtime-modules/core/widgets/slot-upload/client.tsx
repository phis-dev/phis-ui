"use client";

import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Flex, List, Progress, Typography, Upload } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

import { usePhiMediaUpload } from "../../../../../components/media/phi-media-upload";
import {
  runPhiAddonAssetUpload,
  type PhiAddonAssetReservation,
} from "../../../../../components/media/media-upload-flow";
import { PHI_MEDIA_UPLOAD_DEFAULT_LABELS } from "../../../../../components/media/phi-media-upload";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { usePhiSignalIdentity } from "../../../../../components/runtime/runtime-signal-identity";
import { readPhiTableBindingParamsSignalValue } from "../../../../../types/table-widget";
import type { PhiSignal, PhiSignalRoute } from "../../../../../types/signals";
import type { PhiSlotUploadWidgetConfig } from "./config";

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

function matchesListenRoute(route: PhiSignalRoute, signal: PhiSignal) {
  return route.receiver !== null && route.channel === signal.channel && route.action === signal.action &&
    route.valueType === signal.valueType &&
    (route.valueType !== "json" || route.valueSchema === signal.valueSchema);
}

export type PhiSlotUploadWidgetClientProps = {
  config?: PhiSlotUploadWidgetConfig;
};

export function PhiSlotUploadWidgetClient({ config }: PhiSlotUploadWidgetClientProps) {
  const addon = config?.addon?.trim() ?? "";
  const table = config?.table?.trim() ?? "";
  const slotName = config?.slot?.trim() ?? "";
  const ownerParam = config?.ownerParam?.trim() || "id";
  const signalIdentity = usePhiSignalIdentity();
  const listenRoutes = useMemo(() => config?.signalRoutes?.listens ?? [], [config?.signalRoutes?.listens]);

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
  const [failure, setFailure] = useState<string | null>(null);

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
        typeof body?.error === "string" ? body.error : `The server answered ${response.status}.`,
      );
    }
    return body ?? {};
  }, []);

  usePhiSignalListener(useCallback((signal: PhiSignal) => {
    const route = listenRoutes.find((candidate: PhiSignalRoute) => matchesListenRoute(candidate, signal));
    if (!route || (signal.receiver !== "broadcast" && signal.receiver !== signalIdentity.receiver)) {
      return;
    }
    const params = readPhiTableBindingParamsSignalValue(signal.value)?.params;
    const next = params?.[ownerParam];
    setOwnerId(next == null ? null : String(next));
  }, [listenRoutes, ownerParam, signalIdentity.receiver]));

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
        if (!declared) setFailure(`This table declares no slot named "${slotName}".`);
      })
      .catch((error: unknown) => {
        if (live) setFailure(error instanceof Error ? error.message : "Unreachable.");
      });
    return () => { live = false; };
  }, [base, read, slotName]);

  // Reads rather than stores: what to do with the answer belongs to whoever asked, and an effect that
  // only subscribes is one the rules about effects are happy with.
  const readFiles = useCallback(async (owner: string) => {
    if (!base) return [] as readonly SlotFile[];
    const body = await read(`${base}/${encodeURIComponent(owner)}`);
    return ((body.files as SlotFile[] | undefined) ?? []).filter((file) => file.slot === slotName);
  }, [base, read, slotName]);

  const reload = useCallback(async () => {
    if (!ownerId) return;
    setLoaded({ ownerId, files: await readFiles(ownerId) });
  }, [ownerId, readFiles]);

  useEffect(() => {
    if (!base || !ownerId) {
      return;
    }
    let live = true;
    void readFiles(ownerId)
      .then((files) => { if (live) setLoaded({ ownerId, files }); })
      .catch((error: unknown) => {
        if (live) setFailure(error instanceof Error ? error.message : "Unreachable.");
      });
    return () => { live = false; };
  }, [base, ownerId, readFiles]);

  /*
   * The session, begun and settled at the Add-on's root; the transfer between them is Core's own and
   * the same one every Media surface runs, progress and refusals included.
   */
  const runSession = useCallback(async (file: File, onProgress?: (progress: number) => void) => {
    if (!base || !ownerId) {
      throw new Error("There is no row to put this on.");
    }
    const slotBase = `${base}/${encodeURIComponent(ownerId)}/${encodeURIComponent(slotName)}`;
    const begun = await read(slotBase, {
      method: "POST",
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
    onUploaded: () => { void reload(); },
    onRejected: (message) => setFailure(message),
  });

  const files = loaded?.ownerId === ownerId ? loaded.files : [];

  const remove = useCallback(async (id: string) => {
    if (!base || !ownerId) return;
    await read(`${base}/${encodeURIComponent(ownerId)}/${encodeURIComponent(id)}`, { method: "DELETE" });
    await reload();
  }, [base, ownerId, read, reload]);

  if (!base || !slotName) {
    return <Typography.Text type="secondary">This field names no Add-on, table or slot.</Typography.Text>;
  }

  return (
    <Flex vertical gap={8} data-phis-slot-upload={slotName}>
      {ownerId === null ? (
        <Typography.Text type="secondary">Nothing selected.</Typography.Text>
      ) : (
        <Upload
          multiple={slot?.cardinality === "many"}
          accept={slot?.contentTypes.join(",")}
          showUploadList={false}
          beforeUpload={(file) => { void upload.upload(file); return false; }}
        >
          <Button icon={<UploadOutlined />}>Choose a file</Button>
        </Upload>
      )}
      {upload.items.filter((item) => item.status === "uploading").map((item) => (
        <Progress key={item.localId} percent={item.progress} size="small" />
      ))}
      {failure ? <Typography.Text type="danger" role="alert">{failure}</Typography.Text> : null}
      <List
        size="small"
        dataSource={[...files]}
        locale={{ emptyText: "Nothing here yet." }}
        renderItem={(file) => (
          <List.Item
            actions={[
              <Button
                key="remove"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => { void remove(file.id).catch(() => setFailure("That file stayed.")); }}
              />,
            ]}
          >
            <Typography.Text>{file.contentType} — {file.byteSize} bytes</Typography.Text>
          </List.Item>
        )}
      />
    </Flex>
  );
}
