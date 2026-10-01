"use client";

import Image from "next/image";

/** An `asset:` icon: a picture from the Site's own files, at the icon's size. */
export function PhiAssetIcon({ path, size }: { path: string; size: number | string }) {
  const src = path.startsWith("/") ? path : `/${path}`;
  return typeof size === "number" ? (
    <Image src={src} alt="" width={size} height={size} aria-hidden="true" />
  ) : (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </span>
  );
}
