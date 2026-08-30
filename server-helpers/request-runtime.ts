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
  const context = getPhiRequestRuntimeStore().navigationByArea.get(area);
  if (!context) {
    throw new Error(`Missing Phi request navigation context for Area "${area}".`);
  }
  return context;
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
