import {
  PhiDeveloperBuilderPagesHeaderSection,
  type PhiDeveloperBuilderPagesHeaderSectionMode,
} from "./clients/pages-header";
import type { PhiPageTitleWidgetLabels } from "../../../components/widgets/label-types/page-title";

export function PhiDeveloperBuilderPagesHeaderWidget({
  mode = "full",
  pageTitle,
  disabled = false,
  labels,
}: {
  mode?: PhiDeveloperBuilderPagesHeaderSectionMode;
  pageTitle?: string | null;
  disabled?: boolean;
  labels?: PhiPageTitleWidgetLabels;
}) {
  return (
    <PhiDeveloperBuilderPagesHeaderSection
      mode={mode}
      pageTitle={pageTitle}
      disabled={disabled}
      labels={labels}
    />
  );
}
