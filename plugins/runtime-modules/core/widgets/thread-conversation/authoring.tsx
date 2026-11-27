"use client";

import type { PhisThreadDetail, PhisThreadMessage } from "../../../../../types/threads";
import { PhisThreadKind, PhisThreadMessageFlag, PhisThreadParticipantFlag, PhisThreadStatus } from "../../../../../constants/threads";
import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import {
  PHI_THREAD_CONVERSATION_DEFAULT_LABELS as labels,
  type PhiThreadConversationLabels,
} from "../../messaging/label-defaults";
import type { PhiThreadWidgetConfig } from "../thread-widget-config";
import { PHI_THREAD_CONVERSATION_WIDGET_DEFINITION } from "./config";
import { PhiThreadConversationView } from "./client";

/*
 * The canvas draws the reader itself, with a made-up conversation, the way the live Widget draws one it
 * has read: the canvas may not read anybody's conversation, and the one a Page shows arrives with a
 * selection that never happens here. The words are the Label Set's, in its source language, as the
 * Builder shows every text, and a tag on the heading says it is a sample. Its Reply and its attachment
 * lead nowhere; nothing is fetched.
 *
 * A placement that names its conversation (`title`) is one whose conversation Core opens without a
 * subject -- a customer file -- so it gets staff's notes under that name; any other gets an exchange
 * under a subject, with the people in it.
 */

const SAMPLE_THREAD_ID = -1;
const member = { userId: -1, displayName: labels.sample.memberName, companyName: null };
const staff = { userId: -2, displayName: labels.sample.staffName, companyName: null };

function sampleMessage(
  id: number,
  author: typeof member,
  bodyText: string,
  createdAt: string,
  options: { internal?: boolean; attachment?: string } = {},
): PhisThreadMessage {
  return {
    id,
    author: { kind: "user", user: author },
    bodyText,
    bodyMarkdown: null,
    sourceLang: null,
    flags: options.internal ? PhisThreadMessageFlag.Internal : 0,
    assets: options.attachment ? [{
      assetId: id,
      fileName: options.attachment,
      contentType: "application/pdf",
      byteSize: 0,
      flags: 0,
      href: "#",
    }] : [],
    createdAt,
    updatedAt: createdAt,
  };
}

function sampleThread(
  kind: "file" | "conversation",
  sample: PhiThreadConversationLabels["sample"],
): PhisThreadDetail {
  const file = kind === "file";
  const messages = file ? [
    sampleMessage(-1, staff, sample.fileCall, "2026-03-02T09:14:00Z", { internal: true }),
    sampleMessage(-2, staff, sample.fileAddress, "2026-03-09T14:40:00Z", { internal: true }),
    sampleMessage(-3, staff, sample.fileContract, "2026-03-12T10:05:00Z", { internal: true, attachment: sample.fileAttachment }),
  ] : [
    sampleMessage(-1, member, sample.question, "2026-03-02T09:14:00Z"),
    sampleMessage(-2, staff, sample.note, "2026-03-02T10:31:00Z", { internal: true }),
    sampleMessage(-3, staff, sample.answer, "2026-03-02T10:47:00Z", { attachment: sample.answerAttachment }),
  ];
  const latest = messages.at(-1)?.createdAt ?? null;
  return {
    thread: {
      id: SAMPLE_THREAD_ID,
      kind: file ? PhisThreadKind.File : PhisThreadKind.Support,
      status: PhisThreadStatus.Open,
      flags: 0,
      subject: file ? null : sample.subject,
      createdAt: messages[0]?.createdAt ?? "",
      updatedAt: latest ?? "",
      latestMessageAt: latest,
      readerFlags: 0,
    },
    participants: file ? [] : [
      { kind: "user", user: member, flags: PhisThreadParticipantFlag.Requester },
      { kind: "user", user: staff, flags: 0 },
    ],
    messages,
    hasMoreMessages: false,
  };
}

const SAMPLE_FILE = sampleThread("file", labels.sample);
const SAMPLE_CONVERSATION = sampleThread("conversation", labels.sample);

export const PHI_THREAD_CONVERSATION_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiThreadWidgetConfig>(
  PHI_THREAD_CONVERSATION_WIDGET_DEFINITION,
  ({ config, runtime }) => (
    <PhiThreadConversationView
      detail={config?.title ? SAMPLE_FILE : SAMPLE_CONVERSATION}
      labels={labels}
      config={config}
      locale={runtime.locale.current}
      sampleLabel={labels.sample.tag}
    />
  ),
);
