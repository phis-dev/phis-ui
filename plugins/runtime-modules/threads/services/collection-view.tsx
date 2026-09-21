"use client";

import { useMemo, useState } from "react";

import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import type { PhiCollectionViewBindingModel } from "../../../../types/collection-provider";
import type { PhiCmsCollectionViewWidgetConfig } from "../../core/widgets/collection-view/config";
import { PhisThreadStatus } from "../../../../constants/threads";
import { PhiAlertControl } from "../../../../components/controls/phi-alert-control";
import { PhiButtonControl } from "../../../../components/controls/phi-button-control";
import { PhiFlexControl } from "../../../../components/controls/phi-flex-control";
import { PhiTagControl } from "../../../../components/controls/phi-tag-control";
import { PhiTypographyControl } from "../../../../components/controls/phi-typography-control";
import { createPhiSignalSubcontrolAddress } from "../../../../types/signals";
import { usePhiControlSignalController } from "../../../../components/widgets/client/shared/phi-control-signals";
import type { PhiThreadDraft } from "./collection";
import { PhiNewConversationPanel } from "./new-conversation-panel";

/**
 * What a conversation row says, when nothing else says it.
 *
 * Not a Server label set, and the reason is worth knowing before the next renderer is written: which
 * renderer draws a Collection is decided by the Site's configuration, so the Widget's Server half cannot
 * resolve labels for it -- it does not know yet whose they would be. A renderer carries its own English
 * and a Site overrides it through `presentation.labels`, the same way the media grid does.
 */
export const PHI_THREAD_COLLECTION_DEFAULT_LABELS = {
  subjectFallback: "Conversation",
  unreadLabel: "New",
  archivedLabel: "Archived",
  emptyText: "No conversations yet.",
  loadingText: "Loading conversations.",
  errorTitle: "That did not work",
  archiveLabel: "Archive",
  reopenLabel: "Reopen",
  newConversationLabel: "New conversation",
  newConversation: {
    peopleKindLabel: "With people",
    groupKindLabel: "With a group",
    peopleLabel: "People",
    peoplePlaceholder: "Who is this with?",
    groupLabel: "Group",
    groupPlaceholder: "Which group?",
    subjectLabel: "Subject",
    subjectPlaceholder: "What is it about? (optional)",
    messageLabel: "Message",
    messagePlaceholder: "Write the first message",
    openLabel: "Open conversation",
    cancelLabel: "Cancel",
    loadingText: "Loading who you can write to.",
    noKindsText: "This site offers no conversations you can open.",
    errorTitle: "That did not work",
  },
};

export type PhiThreadCollectionLabels = typeof PHI_THREAD_COLLECTION_DEFAULT_LABELS;

type PhiThreadCollectionRow = {
  id: number;
  subject: string | null;
  status: number;
  unread: boolean;
  updatedAt: string;
  latestMessageAt: string | null;
};

function readRow(item: Record<string, unknown>): PhiThreadCollectionRow | null {
  const id = item.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return null;
  }
  return {
    id,
    subject: typeof item.subject === "string" && item.subject.trim() ? item.subject : null,
    status: typeof item.status === "number" ? item.status : PhisThreadStatus.Open,
    unread: item.unread === true,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
    latestMessageAt: typeof item.latestMessageAt === "string" ? item.latestMessageAt : null,
  };
}

export function PhiThreadCollectionViewBinding({
  config,
  binding,
  labels: rawLabels,
  widgetId,
}: {
  config: PhiCmsCollectionViewWidgetConfig;
  binding: PhiCollectionViewBindingModel;
  labels?: unknown;
  widgetId?: PhiCmsInstanceId | null;
}) {
  const labels = (config.presentation.labels ?? rawLabels ?? PHI_THREAD_COLLECTION_DEFAULT_LABELS) as
    PhiThreadCollectionLabels;
  /*
   * The selection leaves from a subcontrol address, not from the Widget.
   *
   * The Widget is the frame and may be wired for other things; what a person clicked is this listing's
   * to announce. The schema the route carries is the resource's -- `signals/thread-selection` -- which
   * is why a package replacing this renderer reaches the same conversation Widget without either of them
   * knowing the other.
   */
  const selectionSignals = usePhiControlSignalController<Record<string, unknown>>({
    key: "threadSelection",
    sender: widgetId == null ? null : createPhiSignalSubcontrolAddress("cms", widgetId, "selection"),
    signalRoutes: config.signalRoutes,
    valueType: "json",
    typeKey: "collection-view",
  });

  const [creating, setCreating] = useState(false);
  const panelOpen = binding.openPanelKey === "newConversation";
  const toolbarActions = config.features.tools.mode === "self-contained"
    ? config.features.actions?.toolbar ?? []
    : [];

  const rows = useMemo(
    () => (binding.data?.items ?? []).map(readRow).filter((row): row is PhiThreadCollectionRow => row != null),
    [binding.data],
  );
  const formatTime = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
    return (value: string) => {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : formatter.format(parsed);
    };
  }, []);

  /*
   * Opening one and selecting it are the same gesture, finished in two places.
   *
   * The Provider answers with the new conversation's id in `meta`, because a listing cannot say which
   * of its rows is new -- and then this announces it on the same route a click on a row uses. A person
   * who opens a conversation is already reading it.
   */
  async function createConversation(draft: PhiThreadDraft) {
    setCreating(true);
    try {
      const data = await binding.activate({ actionKey: "newConversation", item: draft, query: binding.query });
      if (data.error) return;
      const createdThreadId = data.meta?.createdThreadId;
      binding.setOpenPanelKey(null);
      if (typeof createdThreadId === "number") {
        selectionSignals.emitCapability("selection", { threadId: createdThreadId });
      }
    } finally {
      setCreating(false);
    }
  }

  const toolbar = toolbarActions.length === 0 ? null : (
    <PhiFlexControl gap="small" wrap>
      {toolbarActions.map((action) => (
        <PhiButtonControl
          key={action.key}
          label={action.label ?? (action.key === "newConversation" ? labels.newConversationLabel : action.key)}
          tooltip={action.description}
          type={action.mode === "primary" ? "primary" : "default"}
          danger={action.mode === "danger"}
          size={config.presentation.controlSize}
          onClick={action.key === "newConversation"
            ? () => binding.setOpenPanelKey(panelOpen ? null : "newConversation")
            : undefined}
        />
      ))}
    </PhiFlexControl>
  );

  const panel = panelOpen ? (
    <PhiNewConversationPanel
      labels={labels.newConversation}
      busy={creating}
      onCancel={() => binding.setOpenPanelKey(null)}
      onSubmit={(draft) => void createConversation(draft)}
    />
  ) : null;

  /*
   * A failure, a wait and an empty listing all keep the toolbar and the panel.
   *
   * An empty inbox is the most likely moment for somebody to want a new conversation, and it was also
   * the one state where the way to start one used to disappear.
   */
  const body = binding.error
    ? <PhiAlertControl level="error" showIcon title={labels.errorTitle} description={binding.error} />
    : binding.loading && rows.length === 0
      ? <PhiTypographyControl type="secondary">{labels.loadingText}</PhiTypographyControl>
      : rows.length === 0
        ? (
          <PhiTypographyControl type="secondary">
            {config.presentation.emptyDescription ?? labels.emptyText}
          </PhiTypographyControl>
        )
        : null;

  return (
    <PhiFlexControl vertical gap="small">
      {toolbar}
      {panel}
      {body}
      {body != null ? null : rows.map((row) => {
        const archived = row.status === PhisThreadStatus.Archived;
        const select = () => selectionSignals.emitCapability("selection", { threadId: row.id });
        return (
          /*
           * The action sits beside what opens the conversation, never inside it.
           *
           * A row that is one large target with a smaller one inside needs the inner click to stop the
           * outer from also firing -- and `PhiButtonControl` hands its handler no event to stop it
           * with. Two siblings need none of that: the conversation opens from the part that names it,
           * and archiving is its own target.
           */
          <PhiFlexControl key={row.id} align="center" justify="space-between" gap="small">
            <PhiFlexControl
              align="center"
              gap="small"
              wrap
              role="button"
              tabIndex={0}
              onClick={select}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                select();
              }}
              style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
            >
              <PhiTypographyControl strong={row.unread} style={{ margin: 0 }}>
                {row.subject ?? labels.subjectFallback}
              </PhiTypographyControl>
              {row.unread ? <PhiTagControl>{labels.unreadLabel}</PhiTagControl> : null}
              {archived ? <PhiTagControl>{labels.archivedLabel}</PhiTagControl> : null}
              <PhiTypographyControl type="secondary">
                {formatTime(row.latestMessageAt ?? row.updatedAt)}
              </PhiTypographyControl>
            </PhiFlexControl>
            <PhiButtonControl
              label={archived ? labels.reopenLabel : labels.archiveLabel}
              type="link"
              size="small"
              onClick={() => void binding.activate({
                actionKey: archived ? "reopen" : "archive",
                itemKey: row.id,
                query: binding.query,
              })}
            />
          </PhiFlexControl>
        );
      })}
    </PhiFlexControl>
  );
}
