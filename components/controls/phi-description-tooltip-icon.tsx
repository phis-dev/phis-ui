"use client";

import type { ReactNode } from "react";
import { InfoCircleOutlined } from "@ant-design/icons";

import { usePhiConfig } from "../root/phi-config-provider";
import { PhiNameControl } from "./phi-name-control";

/** Canonical icon for Control and collection descriptions. */
const PHI_DESCRIPTION_TOOLTIP_ICON = <InfoCircleOutlined />;

/**
 * The glyph that carries a description, wherever a surface has a label and no room for a second line.
 *
 * Four surfaces drew it -- a labelled Control, a collection header, a Form field, an option in a
 * dropdown -- and each picked its own colour, cursor and spoken name. None of that was a choice; see
 * `PhiNameControl`, which holds what the four disagreed about.
 */
export function PhiDescriptionHint({ description }: { description: ReactNode }) {
  const { token } = usePhiConfig();
  return (
    <PhiNameControl name={description}>
      <span style={{ display: "inline-flex", color: token.colorTextTertiary }}>
        {PHI_DESCRIPTION_TOOLTIP_ICON}
      </span>
    </PhiNameControl>
  );
}
