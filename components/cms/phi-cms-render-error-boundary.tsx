"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import type { PhiCmsRenderIssue } from "../../types/cms-plugins";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import { PhiCmsRenderDiagnostic } from "./phi-cms-render-diagnostic";
import { resolvePhiRenderFailureCode } from "../widgets/config/strict-config-reader";

export type PhiCmsRenderErrorBoundaryProps = {
  kind: PhiCmsRenderIssue["kind"];
  blockId?: PhiCmsInstanceId | null;
  typeKey?: string | null;
  moduleId?: PhiCmsRenderIssue["moduleId"];
  /**
   * Where the diagnostic of a failed render is drawn, for a host that frames its nodes.
   *
   * The Builder draws every node in a scaffold that selects and removes it, and that scaffold is part
   * of what failed. Handed the diagnostic, the host frames it again, so a node that throws can still
   * be taken out of the tree it broke.
   */
  renderDiagnostic?: (diagnostic: ReactNode) => ReactNode;
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
      const diagnostic = <PhiCmsRenderDiagnostic issue={{
        code: resolvePhiRenderFailureCode(this.state.error),
        kind: this.props.kind,
        type: this.props.typeKey ?? "unknown",
        blockId: this.props.blockId,
        moduleId: this.props.moduleId,
        detail: this.state.error.message,
      }} />;
      return this.props.renderDiagnostic ? this.props.renderDiagnostic(diagnostic) : diagnostic;
    }

    return this.props.children;
  }
}
