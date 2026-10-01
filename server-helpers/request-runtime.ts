import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import { cache } from "react";

import type { PhiBlockRuntime } from "../types";
import type {
  PhiCmsCompiledDescriptorCatalog,
  PhiRuntimeModuleId,
} from "../types/cms-module-descriptors";
import type { PhiCmsAreaKey } from "../constants/cms-areas";

type PhiRequestRuntimeStore = {
  runtime: PhiBlockRuntime | null;
  navigationByArea: Map<PhiCmsAreaKey, {
    catalog: PhiCmsCompiledDescriptorCatalog;
    activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  }>;
};

function createPhiRequestRuntimeStore(): PhiRequestRuntimeStore {
  return {
    runtime: null,
    navigationByArea: new Map(),
  };
}

const getPhiRscRequestRuntimeStore = cache(createPhiRequestRuntimeStore);

/**
 * Route handlers run outside the React render, where `React.cache` provides no request scope — a
 * store written there is invisible to the next read. This AsyncLocalStorage scope is the counterpart
 * for that context: `runWithPhiRequestRuntime` wraps the unit of work, and every store access inside
 * it resolves here first, falling back to the RSC-scoped store during component rendering.
 */
const phiRequestRuntimeScope = new AsyncLocalStorage<PhiRequestRuntimeStore>();

function getPhiRequestRuntimeStore(): PhiRequestRuntimeStore {
  return phiRequestRuntimeScope.getStore() ?? getPhiRscRequestRuntimeStore();
}

export function runWithPhiRequestRuntime<T>(runtime: PhiBlockRuntime, work: () => T): T {
  const store = createPhiRequestRuntimeStore();
  store.runtime = runtime;
  return phiRequestRuntimeScope.run(store, work);
}

/**
 * A request scope for a Server Action, which renders nothing until it has returned.
 *
 * An Action's body runs outside the React render, so the RSC-scoped store gives it a fresh object on
 * every read; this scope holds one store for the body instead. What the body then returns is rendered by
 * Next afterwards, outside the scope -- `capturePhiRequestRuntimeStore` and `restorePhiRequestRuntimeStore`
 * carry what the body learned into that render.
 */
export function runInPhiRequestScope<T>(work: () => T): T {
  return phiRequestRuntimeScope.run(createPhiRequestRuntimeStore(), work);
}

export type PhiCapturedRequestRuntime = Readonly<PhiRequestRuntimeStore>;

export function capturePhiRequestRuntimeStore(): PhiCapturedRequestRuntime {
  const store = getPhiRequestRuntimeStore();
  return { runtime: store.runtime, navigationByArea: new Map(store.navigationByArea) };
}

export function restorePhiRequestRuntimeStore(captured: PhiCapturedRequestRuntime) {
  const store = getPhiRequestRuntimeStore();
  store.runtime = captured.runtime;
  for (const [area, context] of captured.navigationByArea) {
    store.navigationByArea.set(area, context);
  }
}

export function setPhiRequestRuntime(runtime: PhiBlockRuntime) {
  const store = getPhiRequestRuntimeStore();
  store.runtime = runtime;
  return runtime;
}

export function setPhiRequestNavigationContext(
  area: PhiCmsAreaKey,
  catalog: PhiCmsCompiledDescriptorCatalog,
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
) {
  const store = getPhiRequestRuntimeStore();
  const context = { catalog, activeModuleIds };
  store.navigationByArea.set(area, context);
  return context;
}

export function getPhiRequestNavigationContext(area: PhiCmsAreaKey) {
  const context = maybeGetPhiRequestNavigationContext(area);
  if (!context) {
    throw new Error(`Missing Phi request navigation context for Area "${area}".`);
  }
  return context;
}

/**
 * The same, for an Area this request may not have set up.
 *
 * One Area is prepared per request -- the one being served -- so asking about another is a legitimate
 * question with no answer here rather than a mistake. A link that points into another Area is the case:
 * the compiled catalogue is the same object for every Area, but which Modules answer in one is that
 * Area's own fact, and this request never read it.
 */
export function maybeGetPhiRequestNavigationContext(area: PhiCmsAreaKey) {
  return getPhiRequestRuntimeStore().navigationByArea.get(area) ?? null;
}

export function maybeGetPhiRequestRuntime() {
  return getPhiRequestRuntimeStore().runtime;
}

export function getPhiRequestRuntime() {
  const runtime = maybeGetPhiRequestRuntime();

  if (!runtime) {
    throw new Error(
      "Missing phi request runtime. Resolve and set it in app/[root]/layout.tsx or PhiCmsRootLayout before using shared server helpers.",
    );
  }

  return runtime;
}
