"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import type { PhiCmsRenderIssue } from "../../types/cms-plugins";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import { PhiCmsRenderDiagnostic } from "./phi-cms-render-diagnostic";

export type PhiCmsRenderErrorBoundaryProps = {
  kind: PhiCmsRenderIssue["kind"];
  blockId?: PhiCmsInstanceId | null;
  typeKey?: string | null;
  moduleId?: PhiCmsRenderIssue["moduleId"];
  children: ReactNode;
};

type PhiCmsRenderErrorBoundaryState = {
  error: Error | null;
};

export class PhiCmsRenderErrorBoundary extends Component<
  PhiCmsRenderErrorBoundaryProps,
  PhiCmsRenderErrorBoundaryState
> {
  state: PhiCmsRenderErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): PhiCmsRenderErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[phi-cms-render-error-boundary] CMS render failed.", {
      kind: this.props.kind,
      blockId: this.props.blockId,
      error,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return <PhiCmsRenderDiagnostic issue={{
        code: "render-failed",
        kind: this.props.kind,
        type: this.props.typeKey ?? "unknown",
        blockId: this.props.blockId,
        moduleId: this.props.moduleId,
        detail: this.state.error.message,
      }} />;
    }

    return this.props.children;
  }
}
