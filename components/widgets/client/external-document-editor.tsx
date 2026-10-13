"use client";

import { useEffect, useEffectEvent } from "react";

import { logRuntimeEvent } from "../../../net/log";
import { PhiAlertControl } from "../../controls/phi-alert-control";
import { PhiFlexControl } from "../../controls/phi-flex-control";
import { PhiTypographyControl } from "../../controls/phi-typography-control";

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
  /*
   * The answer goes to whatever callback stands when it arrives. The callback is a new function on every
   * render of the caller, and as an effect dependency it aborted the request each time -- with a ref
   * that then refused to ask again, the locale was never set, under StrictMode not once.
   */
  const reportSourceLocale = useEffectEvent((detected: string) => onSourceLocaleChange?.(detected));
  const canReport = onSourceLocaleChange != null;
  useEffect(() => {
    if (!sourceUrl || sourceLocale?.trim() || !canReport) {
      return;
    }
    const controller = new AbortController();
    void fetch("/api/site/translation/detect", {
      method: "POST",
      credentials: "include",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ sourceUrl, format }),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Source locale detection answered ${response.status}.`);
      }
      const payload = await response.json() as { sourceLocale?: unknown };
      reportSourceLocale(
        typeof payload.sourceLocale === "string" && payload.sourceLocale.trim()
          ? payload.sourceLocale.trim()
          : "und",
      );
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      // Nothing is set, and the field stays open for the author; the reason is in the log.
      logRuntimeEvent("warn", "translation.detect.failed", {
        message: "The source locale of an external document could not be detected.",
        error,
      });
    });
    return () => controller.abort();
  }, [canReport, format, sourceLocale, sourceUrl]);

  return (
    <div style={{ width: 520, height: 260, maxWidth: "100%", minWidth: 0, minHeight: 0, display: "flex" }}>
      <PhiAlertControl
        level="info"
        showIcon
        title={`External ${format} source`}
        description={
          <PhiFlexControl vertical gap="var(--ant-padding-xs)" style={{ width: "100%", minWidth: 0 }}>
            <PhiTypographyControl>
              This widget renders the configured external document. Edit its URL and source locale in the widget settings.
            </PhiTypographyControl>
            <PhiTypographyControl code copyable={{ text: sourceUrl }} style={{ wordBreak: "break-all" }}>
              {sourceUrl || "No Source URL configured."}
            </PhiTypographyControl>
          </PhiFlexControl>
        }
      />
    </div>
  );
}
