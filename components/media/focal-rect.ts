export type MediaFocalRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function clampRectValue(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function normalizeMediaFocalRect(value: unknown): MediaFocalRect | null {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const x = typeof record.x === "number" && Number.isFinite(record.x) ? clampRectValue(record.x) : null;
  const y = typeof record.y === "number" && Number.isFinite(record.y) ? clampRectValue(record.y) : null;
  const width =
    typeof record.width === "number" && Number.isFinite(record.width) && record.width > 0
      ? clampRectValue(record.width)
      : null;
  const height =
    typeof record.height === "number" && Number.isFinite(record.height) && record.height > 0
      ? clampRectValue(record.height)
      : null;

  if (x === null || y === null || width === null || height === null) {
    return null;
  }

  const normalizedWidth = Math.min(width, 1 - x);
  const normalizedHeight = Math.min(height, 1 - y);
  if (normalizedWidth <= 0 || normalizedHeight <= 0) {
    return null;
  }

  return {
    x,
    y,
    width: normalizedWidth,
    height: normalizedHeight,
  };
}

export function createDefaultFocalRect(): MediaFocalRect {
  return {
    x: 0.25,
    y: 0.25,
    width: 0.5,
    height: 0.5,
  };
}

export function focalRectToPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

export function focalRectToMetaValue(value: MediaFocalRect | null) {
  return value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null;
}

export function resolveFocalRectCoverCropBox(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  focalRect: MediaFocalRect | null,
) {
  const targetRatio = targetWidth / targetHeight;
  let cropWidth = sourceWidth;
  let cropHeight = Math.round(cropWidth / targetRatio);

  if (cropHeight > sourceHeight) {
    cropHeight = sourceHeight;
    cropWidth = Math.round(cropHeight * targetRatio);
  }

  cropWidth = Math.max(1, Math.min(sourceWidth, cropWidth));
  cropHeight = Math.max(1, Math.min(sourceHeight, cropHeight));

  let left = Math.round((sourceWidth - cropWidth) / 2);
  let top = Math.round((sourceHeight - cropHeight) / 2);

  if (focalRect) {
    const focalLeft = focalRect.x * sourceWidth;
    const focalTop = focalRect.y * sourceHeight;
    const focalRight = (focalRect.x + focalRect.width) * sourceWidth;
    const focalBottom = (focalRect.y + focalRect.height) * sourceHeight;
    const focalCenterX = (focalLeft + focalRight) / 2;
    const focalCenterY = (focalTop + focalBottom) / 2;

    left = Math.round(focalCenterX - cropWidth / 2);
    top = Math.round(focalCenterY - cropHeight / 2);

    if (cropWidth >= focalRight - focalLeft) {
      left = Math.min(Math.max(left, Math.ceil(focalRight - cropWidth)), Math.floor(focalLeft));
    }
    if (cropHeight >= focalBottom - focalTop) {
      top = Math.min(Math.max(top, Math.ceil(focalBottom - cropHeight)), Math.floor(focalTop));
    }
  }

  left = Math.min(Math.max(left, 0), Math.max(0, sourceWidth - cropWidth));
  top = Math.min(Math.max(top, 0), Math.max(0, sourceHeight - cropHeight));

  return {
    left,
    top,
    width: cropWidth,
    height: cropHeight,
  };
}

export function resolveFocalRectCoverImageStyle(
  sourceWidth: number | null | undefined,
  sourceHeight: number | null | undefined,
  targetWidth: number,
  targetHeight: number,
  focalRect: MediaFocalRect | null,
) {
  if (!sourceWidth || !sourceHeight) {
    return null;
  }

  const cropBox = resolveFocalRectCoverCropBox(sourceWidth, sourceHeight, targetWidth, targetHeight, focalRect);

  return {
    position: "absolute" as const,
    left: `${(-cropBox.left / cropBox.width) * 100}%`,
    top: `${(-cropBox.top / cropBox.height) * 100}%`,
    width: `${(sourceWidth / cropBox.width) * 100}%`,
    height: `${(sourceHeight / cropBox.height) * 100}%`,
    maxWidth: "none",
    maxHeight: "none",
  };
}

export function resolveContainedImageBox(
  frameWidth: number,
  frameHeight: number,
  sourceWidth: number,
  sourceHeight: number,
) {
  if (frameWidth <= 0 || frameHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return null;
  }

  const scale = Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    left: (frameWidth - width) / 2,
    top: (frameHeight - height) / 2,
    width,
    height,
  };
}

export function resolveFocalRectObjectPosition(
  objectPosition: string | null | undefined,
  focalRect: MediaFocalRect | null,
) {
  const normalizedObjectPosition = objectPosition?.trim();
  if (normalizedObjectPosition) {
    return normalizedObjectPosition;
  }

  if (!focalRect) {
    return "center";
  }

  const centerX = (focalRect.x + focalRect.width / 2) * 100;
  const centerY = (focalRect.y + focalRect.height / 2) * 100;
  return `${Math.round(centerX * 10) / 10}% ${Math.round(centerY * 10) / 10}%`;
}
