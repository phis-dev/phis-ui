// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { PhiMediaSourceClientDefinition, PhiMediaSourceDescriptor } from "../../types/media-source";
import type { PhiRuntimeModuleId } from "../../types/cms-plugins";
import { PhiRuntimeModuleProvider } from "./runtime-module-context";
import {
  PhiRuntimeModuleMediaSourceClientManifestProvider,
  createPhiRuntimeModuleMediaSourceClientManifest,
  usePhiMediaSourceClientDefinitions,
} from "./runtime-module-media-source-client-manifest";

/** Which sources an Area offers: those whose Module is active in it, and no other. */

const SHOP_ID = "@acme/shop/modules/shop" as PhiRuntimeModuleId;
const OTHER_ID = "@acme/other/modules/other" as PhiRuntimeModuleId;

function definition(key: `${string}/${string}`, ownerModuleId: PhiRuntimeModuleId): PhiMediaSourceClientDefinition {
  return {
    key,
    ownerModuleId,
    load: async () => ({
      describe: async () => ({ label: key }),
      list: async () => ({ items: [], nextCursor: null }),
      take: async () => { throw new Error("not taken"); },
    }),
  };
}

function descriptor(key: `${string}/${string}`, ownerModuleId: PhiRuntimeModuleId): PhiMediaSourceDescriptor {
  return { key, ownerModuleId, title: key };
}

function wrapperFor(input: {
  manifest?: ReturnType<typeof createPhiRuntimeModuleMediaSourceClientManifest>;
  moduleIds: PhiRuntimeModuleId[];
  descriptors: PhiMediaSourceDescriptor[];
}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PhiRuntimeModuleProvider
        moduleIds={input.moduleIds}
        widgetTypes={[]}
        layoutTypes={[]}
        mediaSourceDescriptors={input.descriptors}
      >
        <PhiRuntimeModuleMediaSourceClientManifestProvider manifest={input.manifest}>
          {children}
        </PhiRuntimeModuleMediaSourceClientManifestProvider>
      </PhiRuntimeModuleProvider>
    );
  };
}

describe("usePhiMediaSourceClientDefinitions", () => {
  const manifest = createPhiRuntimeModuleMediaSourceClientManifest([
    definition("@acme/shop/stock", SHOP_ID),
    definition("@acme/other/archive", OTHER_ID),
  ]);
  const descriptors = [
    descriptor("@acme/shop/stock", SHOP_ID),
    descriptor("@acme/other/archive", OTHER_ID),
  ];

  it("offers the sources of the Modules that are active", () => {
    const { result } = renderHook(() => usePhiMediaSourceClientDefinitions(), {
      wrapper: wrapperFor({ manifest, moduleIds: [SHOP_ID, OTHER_ID], descriptors }),
    });
    expect(result.current.map((entry) => entry.key)).toEqual(["@acme/shop/stock", "@acme/other/archive"]);
  });

  it("does not offer a source whose owner Module is not active in the Area", () => {
    const { result } = renderHook(() => usePhiMediaSourceClientDefinitions(), {
      wrapper: wrapperFor({ manifest, moduleIds: [SHOP_ID], descriptors: [descriptors[0]!] }),
    });
    expect(result.current.map((entry) => entry.key)).toEqual(["@acme/shop/stock"]);
  });

  it("does not offer a Client whose Module is active but declared no such source", () => {
    const { result } = renderHook(() => usePhiMediaSourceClientDefinitions(), {
      wrapper: wrapperFor({ manifest, moduleIds: [SHOP_ID, OTHER_ID], descriptors: [] }),
    });
    expect(result.current).toEqual([]);
  });

  it("names a Client and a descriptor that disagree about their owner", () => {
    expect(() => renderHook(() => usePhiMediaSourceClientDefinitions(), {
      wrapper: wrapperFor({
        manifest,
        moduleIds: [SHOP_ID, OTHER_ID],
        descriptors: [descriptor("@acme/shop/stock", OTHER_ID)],
      }),
    })).toThrow(/inconsistent Server and Client owners/);
  });

  it("offers none where no manifest is mounted", () => {
    const { result } = renderHook(() => usePhiMediaSourceClientDefinitions(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <PhiRuntimeModuleProvider moduleIds={[SHOP_ID]} widgetTypes={[]} layoutTypes={[]}>
          {children}
        </PhiRuntimeModuleProvider>
      ),
    });
    expect(result.current).toEqual([]);
  });

  it("refuses a key twice when the manifest is built", () => {
    expect(() => createPhiRuntimeModuleMediaSourceClientManifest([
      definition("@acme/shop/stock", SHOP_ID),
      definition("@acme/shop/stock", SHOP_ID),
    ])).toThrow(/Duplicate media source Client loader for "@acme\/shop\/stock"/);
  });
});
