import { describe, expect, it } from "vitest";

import type { PhiMediaAssetFolder } from "../../types/media";
import { buildPhiMediaFolderChoiceOptions } from "./media-folder-options";

function folder(id: number, name: string, parentId: number | null = null): PhiMediaAssetFolder {
  return { id, siteId: 1, spaceId: 1, parentId, name, sortOrder: 0, flags: 0 };
}

describe("buildPhiMediaFolderChoiceOptions", () => {
  it("names each Folder by its own name and stands it under its parent by id", () => {
    expect(buildPhiMediaFolderChoiceOptions([
      folder(3, "Summer", 2),
      folder(1, "Shop"),
      folder(2, "Events", 1),
    ])).toEqual([
      { value: "2", label: "Events", parentValue: "1" },
      { value: "1", label: "Shop" },
      { value: "3", label: "Summer", parentValue: "2" },
    ]);
  });

  it("gives a top-level Folder no parentValue at all", () => {
    expect(buildPhiMediaFolderChoiceOptions([folder(1, "Shop")])[0]).not.toHaveProperty("parentValue");
  });
});
