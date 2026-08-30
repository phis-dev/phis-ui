"use client";

import { useEffect } from "react";
import { Typography } from "antd";

import type { PhiCmsRenderIssue } from "../../types/cms-plugins";
import { PhiAlertControl } from "../controls/phi-alert-control";
import { usePhiApplicationFeedback } from "../runtime/use-phi-application-feedback";

const notifiedIssueKeys = new Set<string>();

function formatKind(kind: PhiCmsRenderIssue["kind"]) {
  return `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
}

function buildIssueTitle(issue: PhiCmsRenderIssue) {
  return `${formatKind(issue.kind)} not renderable`;
}

function buildIssueDescription(issue: PhiCmsRenderIssue) {
  const moduleDescription = issue.code === "missing-module"
    ? issue.moduleId
      ? `Missing module: ${issue.moduleId}.`
      : "The required active module is unavailable."
    : issue.moduleId
      ? `Module: ${issue.moduleId}.`
      : "The required renderer is unavailable.";
  return `${issue.type}. ${moduleDescription}${issue.detail ? ` ${issue.detail}` : ""}`;
}

function buildIssueKey(issue: PhiCmsRenderIssue) {
  return [issue.kind, issue.type, issue.code, issue.moduleId ?? "unknown"].join(":");
}

export function PhiCmsRenderDiagnostic({ issue }: { issue: PhiCmsRenderIssue }) {
  const { showNotification } = usePhiApplicationFeedback();
  const issueKey = buildIssueKey(issue);
  const title = buildIssueTitle(issue);
  const description = buildIssueDescription(issue);

  useEffect(() => {
    console.warn(
      `[phi-cms-render-diagnostic] ${title}: ${description} ` +
      `(code=${issue.code}, blockId=${issue.blockId ?? "unknown"})`,
    );
    if (issue.code === "missing-module") {
      return;
    }
    if (notifiedIssueKeys.has(issueKey)) {
      return;
    }

    notifiedIssueKeys.add(issueKey);
    showNotification({
      level: "error",
      title,
      description,
      placement: "bottomRight",
      durationSeconds: 6,
    });
  }, [description, issue.blockId, issue.code, issue.detail, issue.kind, issue.moduleId, issue.type, issueKey, showNotification, title]);

  return (
    <div
      data-phi-cms-render-diagnostic={issue.kind}
      data-phi-cms-render-diagnostic-code={issue.code}
      data-phi-cms-render-diagnostic-type={issue.type}
      data-phi-cms-render-diagnostic-block-id={issue.blockId ?? undefined}
      data-phi-cms-render-diagnostic-module={issue.moduleId ?? undefined}
    >
      <PhiAlertControl
        level="error"
        showIcon
        title={title}
        description={(
          <div>
            <Typography.Text code>{issue.type}</Typography.Text>
            <br />
            <Typography.Text>
              {issue.code === "missing-module"
                ? issue.moduleId
                  ? `Missing module: ${issue.moduleId}`
                  : "Required active module unavailable"
                : issue.moduleId
                  ? `Module: ${issue.moduleId}`
                  : "Required renderer unavailable"}
            </Typography.Text>
            {issue.detail ? (
              <>
                <br />
                <Typography.Text type="secondary">{issue.detail}</Typography.Text>
              </>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
