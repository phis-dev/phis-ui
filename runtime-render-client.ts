export {
  PhiRuntimeModuleRenderClientHost,
  PhiRuntimeModuleRenderClientManifestProvider,
  createPhiRuntimeModuleRenderClientManifest,
  definePhiRuntimeModuleRenderClient,
  extendPhiRuntimeModuleRenderClientManifest,
} from "./components/runtime/runtime-module-render-client-manifest";
export type {
  PhiRuntimeModuleRenderClient,
  PhiRuntimeModuleRenderClientManifest,
  PhiRuntimeModuleRenderClientProps,
} from "./components/runtime/runtime-module-render-client-manifest";
// The page's language and the Site's time zone, which a Module's own binding sends with a Provider request.
export { usePhiIntlLocale, usePhiIntlTimeZone } from "./components/root/phi-intl-locale";
