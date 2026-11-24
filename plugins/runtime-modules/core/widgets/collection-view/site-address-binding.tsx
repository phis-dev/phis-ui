"use client";

import { useMemo, useState } from "react";

import { isPhiRecord } from "../../../../../helpers/is-record";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type {
  PhiCollectionProviderResourceDescriptor,
  PhiCollectionViewBindingModel,
} from "../../../../../types/collection-provider";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";
import { createPhiSignalAddress } from "../../../../../types/signals";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiCardControl } from "../../../../../components/controls/phi-card-control";
import {
  PhiCollectionViewControl,
  PhiCollectionViewSkeletonControl,
} from "../../../../../components/controls/phi-collection-view-control";
import { PhiConfirmControl } from "../../../../../components/controls/phi-confirm-control";
import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";
import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";
import { PhiToolbarControl } from "../../../../../components/controls/phi-toolbar-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { usePhiIntlLocale } from "../../../../../components/root/phi-intl-locale";
import { usePhiApplicationFeedback } from "../../../../../components/runtime/use-phi-application-feedback";
import { resolvePhiButtonIcon } from "../../../../../components/widgets/client/shared/phi-button-icons";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import { PhiWidgetFailure } from "../../../../../components/widgets/shared/widget-failure-client";
import {
  readPhiSiteAddressTile,
  readPhiSiteAddressToolFailure,
  resolvePhiSiteAddressTileActions,
  type PhiSiteAddressItemAction,
  type PhiSiteAddressPurpose,
  type PhiSiteAddressTile,
} from "./site-address-tiles";

/**
 * What the tiles say, in English, under what the placement's `presentation.labels` says in the reader's
 * language: a Page writes its own words there, from its Label Set, group by group.
 */
export type PhiSiteAddressRendererLabels = {
  purposes: Record<PhiSiteAddressPurpose, string>;
  actions: {
    edit: string;
    remove: string;
    defaultBilling: string;
    defaultShipping: string;
    select: string;
    reload: string;
  };
  remove: { title: string; text: string; ok: string; cancel: string };
  empty: string;
  /** Said where the Provider refused an action and gave no words of its own. */
  failed: string;
};

export const PHI_SITE_ADDRESS_RENDERER_DEFAULT_LABELS: PhiSiteAddressRendererLabels = {
  purposes: {
    billing: "Billing",
    shipping: "Shipping",
    defaultBilling: "Default billing",
    defaultShipping: "Default shipping",
  },
  actions: {
    edit: "Change",
    remove: "Remove",
    defaultBilling: "Use for billing by default",
    defaultShipping: "Use for shipping by default",
    select: "Choose",
    reload: "Reload",
  },
  remove: { title: "Remove this address?", text: "", ok: "Remove", cancel: "Cancel" },
  empty: "No address yet.",
  failed: "The address could not be changed.",
};

/** A group of the defaults with the placement's strings laid over it, key by key; anything else is left. */
function overlayGroup<T extends Record<string, string>>(base: T, override: unknown): T {
  if (!isPhiRecord(override)) return base;
  const result: Record<string, string> = { ...base };
  for (const key of Object.keys(base)) {
    const value = override[key];
    if (typeof value === "string") result[key] = value;
  }
  return result as T;
}

function readLabels(raw: unknown): PhiSiteAddressRendererLabels {
  const labels = isPhiRecord(raw) ? raw : {};
  const base = PHI_SITE_ADDRESS_RENDERER_DEFAULT_LABELS;
  return {
    purposes: overlayGroup(base.purposes, labels.purposes),
    actions: overlayGroup(base.actions, labels.actions),
    remove: overlayGroup(base.remove, labels.remove),
    empty: typeof labels.empty === "string" ? labels.empty : base.empty,
    failed: typeof labels.failed === "string" ? labels.failed : base.failed,
  };
}

const TILE_MIN_COLUMN_WIDTH = 233;

const ACTION_ICONS: Record<PhiSiteAddressItemAction, string> = {
  edit: "edit",
  makeDefaultBilling: "antd:file-text",
  makeDefaultShipping: "antd:shopping",
  delete: "antd:delete",
};

/**
 * The address renderer (`PHI_SITE_ADDRESS_ITEM_RENDERER_KEY`): a Collection's items as the addresses of a
 * Site's book, one Card each in the View's grid (COLLECTIONS.md, "The address renderer").
 *
 * - **Items** in the shape `toPhiSiteAddressRow` answers (`helpers/site-address-row.ts`); `id` is the
 *   address id and the item's key. A tile names the company and the name, the parts after them a line
 *   each, the country in the reader's language, and the purposes and defaults as tags.
 * - **Item actions** are the resource's: `edit` is announced on `actionActivate` as `{ actionKey, itemKey }`
 *   -- a record-bound Form opens on it -- and `makeDefaultBilling`, `makeDefaultShipping` and `delete` run
 *   through the Provider, `delete` after its confirmation. A resource that declares none is read-only.
 * - **Toolbar actions** (`features.actions.toolbar`) are announced as `{ actionKey, query }`, each one the
 *   resource declares at resource scope; one it does not is the Widget's failure.
 * - **Choosing** (`features.selection: { mode: "single" }`, prepared for the Shop's checkout) puts a
 *   Choose on every tile and says the chosen address on `selection` as `{ addressId }`.
 * - **The Provider's own empty sentence** (`meta.emptyDescription`) stands in for the placement's where it
 *   answers no items for a reason of its own.
 */
export function PhiSiteAddressCollectionViewBinding({
  config,
  binding,
  widgetId,
  renderMode,
  resource,
}: {
  config: PhiCmsCollectionViewWidgetConfig;
  binding: PhiCollectionViewBindingModel;
  labels?: unknown;
  widgetId?: PhiCmsInstanceId | null;
  renderMode: PhiRenderableBlockRenderMode;
  resource?: PhiCollectionProviderResourceDescriptor | null;
}) {
  const { presentation, features } = config;
  const { token } = usePhiConfig();
  const locale = usePhiIntlLocale();
  const { showMessage } = usePhiApplicationFeedback();
  const labels = useMemo(() => readLabels(presentation.labels), [presentation.labels]);
  const controlSize = presentation.controlSize ?? "small";
  const selectable = features.selection?.mode === "single";
  const toolbarActions = useMemo(() => features.actions?.toolbar ?? [], [features.actions?.toolbar]);
  const toolFailure = readPhiSiteAddressToolFailure({
    toolbarKeys: toolbarActions.map((action) => action.key),
    selection: selectable,
    resource,
  });
  const [pendingIds, setPendingIds] = useState<readonly number[]>([]);
  const [chosenId, setChosenId] = useState<number | null>(null);
  const signals = usePhiControlSignalController<Record<string, unknown>>({
    key: "siteAddressAction",
    sender: widgetId == null ? null : createPhiSignalAddress("cms", widgetId),
    signalRoutes: config.signalRoutes,
    valueType: "json",
    typeKey: "collection-action",
  });

  const tiles = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region", fallback: "code" });
    return (binding.data?.items ?? []).flatMap((item) => {
      const tile = readPhiSiteAddressTile(item, (code) => names.of(code) ?? code);
      return tile ? [tile] : [];
    });
  }, [binding.data?.items, locale]);

  if (toolFailure) {
    return (
      <PhiWidgetFailure
        renderMode={renderMode}
        widgetType={PhiCmsWidgetType.CollectionView}
        widgetId={widgetId}
        title={toolFailure}
      />
    );
  }

  async function runProviderAction(tile: PhiSiteAddressTile, actionKey: PhiSiteAddressItemAction) {
    setPendingIds((current) => current.includes(tile.id) ? current : [...current, tile.id]);
    try {
      const data = await binding.activate({ actionKey, itemKey: tile.id, query: binding.query });
      if (data.error) throw new Error(data.error);
    } catch (error) {
      showMessage({
        level: "error",
        content: error instanceof Error && error.message ? error.message : labels.failed,
        durationSeconds: 2.8,
      });
    } finally {
      setPendingIds((current) => current.filter((id) => id !== tile.id));
    }
  }

  function choose(tile: PhiSiteAddressTile) {
    setChosenId(tile.id);
    signals.emitCapability("selection", { addressId: tile.id });
  }

  function renderActions(tile: PhiSiteAddressTile) {
    const pending = pendingIds.includes(tile.id);
    const actions = resolvePhiSiteAddressTileActions(resource, tile);
    if (actions.length === 0 && !selectable) return null;
    const label = (key: PhiSiteAddressItemAction) => key === "edit" ? labels.actions.edit
      : key === "makeDefaultBilling" ? labels.actions.defaultBilling
        : key === "makeDefaultShipping" ? labels.actions.defaultShipping
          : labels.actions.remove;
    return (
      <PhiToolbarControl compact size={controlSize}>
        {selectable ? (
          <PhiButtonControl
            ariaLabel={labels.actions.select}
            ariaPressed={chosenId === tile.id}
            tooltip={labels.actions.select}
            icon={resolvePhiButtonIcon("check")}
            type={chosenId === tile.id ? "primary" : "default"}
            size={controlSize}
            onClick={() => choose(tile)}
          />
        ) : null}
        {actions.map((key) => key === "delete" ? (
          <PhiConfirmControl
            key={key}
            title={labels.remove.title}
            description={labels.remove.text || undefined}
            confirmLabel={labels.remove.ok}
            cancelLabel={labels.remove.cancel}
            danger
            disabled={pending}
            onConfirm={() => runProviderAction(tile, key)}
          >
            <PhiButtonControl
              ariaLabel={label(key)}
              tooltip={label(key)}
              icon={resolvePhiButtonIcon(ACTION_ICONS[key])}
              danger
              size={controlSize}
              disabled={pending}
              // The confirmation reacts to the press; this only keeps the button a live one.
              onClick={() => undefined}
            />
          </PhiConfirmControl>
        ) : (
          <PhiButtonControl
            key={key}
            ariaLabel={label(key)}
            tooltip={label(key)}
            icon={resolvePhiButtonIcon(ACTION_ICONS[key])}
            size={controlSize}
            disabled={pending}
            loading={pending && key !== "edit"}
            onClick={key === "edit"
              ? () => signals.emitCapability("actionActivate", { actionKey: key, itemKey: tile.id })
              : () => void runProviderAction(tile, key)}
          />
        ))}
      </PhiToolbarControl>
    );
  }

  const items = tiles.map((tile) => (
    <PhiCardControl
      key={tile.id}
      size="small"
      title={tile.title}
      toolbar={renderActions(tile)}
      style={selectable && chosenId === tile.id ? { borderColor: token.colorPrimary } : undefined}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: token.paddingXS }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {tile.lines.map((line, index) => (
            <PhiTypographyControl key={`${index}-${line}`}>{line}</PhiTypographyControl>
          ))}
        </div>
        {tile.purposes.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: token.paddingXXS }}>
            {tile.purposes.map((purpose) => (
              <PhiTagControl key={purpose} color={purpose.startsWith("default") ? "processing" : "default"}>
                {labels.purposes[purpose]}
              </PhiTagControl>
            ))}
          </div>
        ) : null}
      </div>
    </PhiCardControl>
  ));

  const mode = presentation.mode;
  const gap = presentation.gap;
  const minColumnWidth = presentation.minColumnWidth ?? TILE_MIN_COLUMN_WIDTH;
  const toolbar = toolbarActions.length > 0 || features.tools.reload ? (
    <PhiToolbarControl compact size={controlSize}>
      {toolbarActions.map((action) => {
        const display = action.display ?? "icon";
        const actionLabel = action.label ?? action.key;
        return (
          <PhiButtonControl
            key={action.key}
            label={display === "icon" ? undefined : actionLabel}
            ariaLabel={actionLabel}
            tooltip={action.description ?? (display === "icon" ? actionLabel : undefined)}
            icon={display === "label" || !action.icon ? undefined : resolvePhiButtonIcon(action.icon)}
            type={action.mode === "primary" ? "primary" : "default"}
            danger={action.mode === "danger"}
            size={controlSize}
            onClick={() => signals.emitCapability("actionActivate", { actionKey: action.key, query: binding.query })}
          />
        );
      })}
      {features.tools.reload ? (
        <PhiButtonControl
          ariaLabel={labels.actions.reload}
          tooltip={labels.actions.reload}
          icon={resolvePhiButtonIcon("reload")}
          size={controlSize}
          onClick={binding.reload}
        />
      ) : null}
    </PhiToolbarControl>
  ) : null;
  const emptyDescription = typeof binding.data?.meta?.emptyDescription === "string" && binding.data.meta.emptyDescription.trim()
    ? binding.data.meta.emptyDescription
    : presentation.emptyDescription ?? labels.empty;
  const body = binding.data == null ? (
    binding.error ? null : <PhiCollectionViewSkeletonControl mode={mode} gap={gap} minColumnWidth={minColumnWidth} count={2} />
  ) : tiles.length === 0 ? (
    <PhiEmptyControl description={emptyDescription} />
  ) : undefined;

  return (
    <PhiCollectionViewControl
      title={presentation.title}
      description={presentation.description}
      toolbar={features.tools.mode === "external" ? null : toolbar}
      diagnostics={binding.error && binding.data != null ? <PhiAlertControl level="error" title={binding.error} /> : null}
      body={body}
      items={items}
      mode={mode}
      {...(gap ? { gap } : {})}
      minColumnWidth={minColumnWidth}
      pagination={null}
    />
  );
}
