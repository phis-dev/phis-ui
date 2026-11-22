// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { resolvePhiFormRecordTitle } from "../forms/form-record-title";
import { usePhiOverlayTitle } from "./phi-overlay-title";

/*
 * An Overlay's title: its own, or one it was told on its `title` input for the opening it was told for.
 * The Form of a record dialog tells it the record's name after each read and an empty title as a row is
 * asked for (`components/forms/form-record-title.ts`); these are the Overlay's half of that.
 */

const gallery = { title: "Gallery" };
const titleFromRecord = { template: { kind: "label", key: "galleryOf", fallback: "Gallery: %1" }, field: "product" } as const;
/** What the gallery's Form announces for a record, in the reader's language. */
const announced = (record: Record<string, unknown> | null) =>
  resolvePhiFormRecordTitle(titleFromRecord, record, { galleryOf: "Galerie : %1" });

describe("an Overlay's title", () => {
  it("is its own until it is told one: a create dialog, whose Form reads no record, keeps it", () => {
    const { result } = renderHook(() => usePhiOverlayTitle(gallery));
    expect(result.current.title).toBe("Gallery");
  });

  it("is the record's once the Form has read it", () => {
    const { result } = renderHook(() => usePhiOverlayTitle(gallery));
    act(() => result.current.tell(announced({ product: "Private Cloud" })));
    expect(result.current.title).toBe("Galerie : Private Cloud");
  });

  it("is its own again for a record without the value, and while a row is on its way", () => {
    const { result } = renderHook(() => usePhiOverlayTitle(gallery));
    act(() => result.current.tell(announced({ product: "Private Cloud" })));
    act(() => result.current.tell(announced(null)));
    expect(result.current.title).toBe("Gallery");
    act(() => result.current.tell(announced({ product: "Private Cloud" })));
    act(() => result.current.tell(announced({ product: "" })));
    expect(result.current.title).toBe("Gallery");
    // Not a string at all is no title either.
    act(() => result.current.tell(null));
    expect(result.current.title).toBe("Gallery");
  });

  it("does not carry one row's name into the opening for the next", () => {
    const { result } = renderHook(() => usePhiOverlayTitle(gallery));
    act(() => result.current.tell(announced({ product: "Private Cloud" })));
    // Closing forgets it: the next opening starts from the Overlay's own while its Form reads the next row.
    act(() => result.current.forget());
    expect(result.current.title).toBe("Gallery");
    act(() => result.current.tell(announced({ product: "Backup" })));
    expect(result.current.title).toBe("Galerie : Backup");
    // A row switched while open: the empty title as it is asked for, then its own name.
    act(() => result.current.tell(announced(null)));
    expect(result.current.title).toBe("Gallery");
    act(() => result.current.tell(announced({ product: "Private Cloud" })));
    expect(result.current.title).toBe("Galerie : Private Cloud");
  });

  it("starts from the config's title when the config changes", () => {
    const { result, rerender } = renderHook(({ config }) => usePhiOverlayTitle(config), { initialProps: { config: gallery } });
    act(() => result.current.tell("Galerie : Private Cloud"));
    rerender({ config: { title: "Pictures" } });
    expect(result.current.title).toBe("Pictures");
  });
});
