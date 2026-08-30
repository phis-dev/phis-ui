"use client";

import { useEffect, useRef } from "react";
import { Flex, Typography } from "antd";
import { PhiAlertControl } from "../../controls/phi-alert-control";

export type PhiExternalDocumentEditorProps = {
  format: "markdown" | "html";
  sourceUrl: string;
  sourceLocale?: string;
  onSourceLocaleChange?: (sourceLocale: string) => void;
};

export function PhiExternalDocumentEditor({
  format,
  sourceUrl,
  sourceLocale,
  onSourceLocaleChange,
}: PhiExternalDocumentEditorProps) {
  const detectionUrlRef = useRef("");
  useEffect(() => {
    if (!sourceUrl || sourceLocale?.trim() || !onSourceLocaleChange || detectionUrlRef.current === sourceUrl) {
      return;
    }
    detectionUrlRef.current = sourceUrl;
    const controller = new AbortController();
    void fetch("/api/site/translation/detect", {
      method: "POST",
      credentials: "include",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ sourceUrl, format }),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { sourceLocale?: unknown };
      onSourceLocaleChange(
        typeof payload.sourceLocale === "string" && payload.sourceLocale.trim()
          ? payload.sourceLocale.trim()
          : "und",
      );
    }).catch(() => undefined);
    return () => controller.abort();
  }, [format, onSourceLocaleChange, sourceLocale, sourceUrl]);

  return (
    <div style={{ width: 520, height: 260, maxWidth: "100%", minWidth: 0, minHeight: 0, display: "flex" }}>
      <PhiAlertControl
        level="info"
        showIcon
        title={`External ${format} source`}
        description={
          <Flex vertical gap="var(--ant-padding-xs)" style={{ width: "100%", minWidth: 0 }}>
            <Typography.Text>
              This widget renders the configured external document. Edit its URL and source locale in the widget settings.
            </Typography.Text>
            <Typography.Text code copyable={{ text: sourceUrl }} style={{ wordBreak: "break-all" }}>
              {sourceUrl || "No Source URL configured."}
            </Typography.Text>
          </Flex>
        }
      />
    </div>
  );
}
