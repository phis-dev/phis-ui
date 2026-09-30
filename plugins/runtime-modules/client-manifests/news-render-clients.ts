import dynamic from "next/dynamic";
import {
  definePhiRuntimeModuleRenderClient,
  type PhiRuntimeModuleRenderClient,
} from "../../../components/runtime/runtime-module-render-client-manifest";
import { PhiCmsWidgetType } from "../../../constants/cms-widget-types";

export const PHI_NEWS_RUNTIME_MODULE_RENDER_CLIENT_LOADERS = [
  [
    PhiCmsWidgetType.NewsList,
    definePhiRuntimeModuleRenderClient(
      dynamic(() => import("../news/widgets/news-list/client")
        .then((module) => module.PhiNewsListWidgetClient)),
    ),
  ],
] as const satisfies ReadonlyArray<readonly [string, PhiRuntimeModuleRenderClient]>;
