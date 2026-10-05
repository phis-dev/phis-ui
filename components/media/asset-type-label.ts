import { PhiMediaKind } from "../../constants/media";

/**
 * The short word a tile or an inspector shows for what an asset is: an image's subtype (`png`), a file's
 * extension (`pdf`), the content subtype where there is no extension, and the kind where there is nothing.
 * Three files carried this, two word for word and one shortened to the content type alone.
 */
export function resolvePhiMediaAssetTypeLabel(kind: string, contentType: string, originalName: string) {
  const normalizedContentType = contentType.trim().toLowerCase();
  if (kind === PhiMediaKind.Image) {
    const subtype = normalizedContentType.startsWith("image/")
      ? normalizedContentType.split("/", 2)[1]
      : null;
    if (subtype) {
      return subtype.split(";")[0].trim();
    }
    return normalizedContentType || "image";
  }

  const extension = originalName.trim().split(".").pop()?.trim().toLowerCase();
  if (extension && extension !== originalName.trim().toLowerCase()) {
    return extension;
  }

  const [, subtype] = normalizedContentType.split("/", 2);
  if (subtype) {
    return subtype.split(";")[0].trim();
  }
  return kind;
}
