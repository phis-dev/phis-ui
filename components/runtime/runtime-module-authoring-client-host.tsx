"use client";

import { lazy, Suspense, type ComponentType, type ReactNode } from "react";

import "../../styles/layout-affordances.css";
import "../../styles/layout-authoring-scaffold.css";
import "../../styles/builder-scaffold.css";
import type { PhiRuntimeModuleAuthoringClientProps, PhiRuntimeModuleId } from "../../types/cms-plugins";
import { usePhiRuntimeModuleAuthoringClientManifest } from "./runtime-module-authoring-client-manifest";

const authoringClientByLoader = new WeakMap<() => Promise<ComponentType<PhiRuntimeModuleAuthoringClientProps>>, ComponentType<PhiRuntimeModuleAuthoringClientProps>>();

function getAuthoringClient(load: () => Promise<ComponentType<PhiRuntimeModuleAuthoringClientProps>>) {
  const cached = authoringClientByLoader.get(load);
  if (cached) return cached;
  const Client = lazy(async () => ({ default: await load() }));
  authoringClientByLoader.set(load, Client);
  return Client;
}

export function PhiRuntimeModuleAuthoringClientHost({ moduleIds, children }: { moduleIds: readonly PhiRuntimeModuleId[]; children: ReactNode }) {
  const manifest = usePhiRuntimeModuleAuthoringClientManifest();
  return moduleIds.reduceRight<ReactNode>((content, moduleId) => {
    const loadAuthoring = manifest.get(moduleId);
    if (!loadAuthoring) throw new Error(`Active runtime module "${moduleId}" has no Authoring Client loader.`);
    const AuthoringClient = getAuthoringClient(loadAuthoring);
    return <Suspense key={moduleId} fallback={null}><AuthoringClient>{content}</AuthoringClient></Suspense>;
  }, children);
}
