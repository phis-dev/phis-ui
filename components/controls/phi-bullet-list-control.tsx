import type { CSSProperties, ReactNode } from "react";

import { PhiIcon } from "../shell/phi-icon";
import { phiSurfaceDrawsChrome, resolvePhiSurfaceStyle } from "../../helpers/surface-style";
import { PHI_COLOR, PHI_RADIUS, PHI_SPACE } from "../../theme/antd-css-var-contract";
import { resolvePhiSpacingScaleValue } from "../widgets/config/spacing-options";
import {
  PhiBulletListFlag,
  resolvePhiBulletListLevel,
  resolvePhiBulletListStyle,
  type PhiBulletListMarker,
  type PhiBulletListNode,
  type PhiResolvedBulletListStyle,
} from "../widgets/shared/bullet-list-vocabulary";
import { hasPhiFlag } from "../../helpers/flags";

export type PhiBulletListControlProps = {
  items: readonly PhiBulletListNode<ReactNode>[];
  /** How the list is set (`bullet-list-vocabulary.ts`); left out, the defaults. */
  listStyle?: PhiResolvedBulletListStyle;
  /** How deep this list stands, 1 for the outermost; the level picks the marker. */
  depth?: number;
  /** A list that counts whatever its level's marker says -- a Markdown `1.` list. */
  ordered?: boolean;
  /** The first number of a counting list. */
  start?: number;
  /**
   * The height of an entry's first line, which the marker is centred on. The text's own line by default;
   * an entry that is a text field has the field's height instead.
   */
  markerLineHeight?: string;
};

const PHI_BULLET_LIST_MARKER_SIZE = PHI_SPACE.xs;
const PHI_BULLET_LIST_ICON_SIZE = 14;

function renderMarker(marker: PhiBulletListMarker, icon: string | null, number: number): ReactNode {
  switch (marker) {
    case "none":
      return null;
    case "number":
      return (
        <span style={{ color: PHI_COLOR.textSecondary, fontVariantNumeric: "tabular-nums", minWidth: "1.5em", textAlign: "end" }}>
          {number}.
        </span>
      );
    case "icon":
      // An icon marker with no icon chosen yet draws the dot, so the entries do not stand bare meanwhile.
      if (icon) {
        return <PhiIcon name={icon} size={PHI_BULLET_LIST_ICON_SIZE} style={{ color: PHI_COLOR.primary }} />;
      }
      return renderMarker("dot", null, number);
    case "dash":
      return <span style={{ width: PHI_SPACE.sm, height: 2, borderRadius: 1, background: PHI_COLOR.primary }} />;
    case "circle":
      return (
        <span
          style={{
            width: PHI_BULLET_LIST_MARKER_SIZE,
            height: PHI_BULLET_LIST_MARKER_SIZE,
            boxSizing: "border-box",
            borderRadius: "50%",
            border: `1.5px solid ${PHI_COLOR.primary}`,
          }}
        />
      );
    case "dot":
      return (
        <span
          style={{
            width: PHI_BULLET_LIST_MARKER_SIZE,
            height: PHI_BULLET_LIST_MARKER_SIZE,
            borderRadius: "50%",
            background: PHI_COLOR.primary,
          }}
        />
      );
  }
}

/**
 * A list, as the house draws one: a marker per level, entries with a box of their own or none, lines
 * between them if asked, and lists inside entries one level down.
 *
 * Drawn the same on the server, in a Widget's preview and in its editor -- no hooks, no Ant Design -- so
 * the Description's aside, a Markdown text's lists and whatever comes next are one list, set with one
 * vocabulary (`bullet-list-vocabulary.ts`), rather than three copies that drift apart. It is a real
 * `ul` or `ol` with `li`s: a reader that announces lists finds one.
 *
 * What an entry shows is the caller's: text on a page, a text field in an editor, a Markdown entry's
 * blocks. An entry's children are the list one level below it, drawn inside the entry under its content,
 * so they are indented by the marker and keep to the entry's box.
 */
export function PhiBulletListControl({
  items,
  listStyle = resolvePhiBulletListStyle(null),
  depth = 1,
  ordered = false,
  start = 1,
  markerLineHeight = "1lh",
}: PhiBulletListControlProps) {
  const level = resolvePhiBulletListLevel(depth);
  const marker = ordered ? "number" : listStyle.markers[level];
  const gap = resolvePhiSpacingScaleValue(listStyle.gap);
  const boxed = phiSurfaceDrawsChrome(listStyle.itemSurface);
  const surface = resolvePhiSurfaceStyle(listStyle.itemSurface, { cornerFallback: PHI_RADIUS.base, groundLayer: false });
  // A line between entries that have edges of their own would only double them.
  const divided = !boxed && hasPhiFlag(listStyle.flags, PhiBulletListFlag.Dividers);
  const ListTag = marker === "number" ? "ol" : "ul";
  const listCss: CSSProperties = { display: "grid", gap, margin: 0, padding: 0, listStyle: "none", width: "100%", minWidth: 0 };

  return (
    <ListTag style={listCss} {...(ListTag === "ol" && start !== 1 ? { start } : {})}>
      {items.map((item, index) => (
        <li
          key={index}
          className={surface.className}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: PHI_SPACE.sm,
            minWidth: 0,
            ...surface.style,
            ...(boxed ? { padding: `${PHI_SPACE.sm} ${PHI_SPACE.md}` } : {}),
            ...(divided && index > 0 ? { borderTop: `1px solid ${PHI_COLOR.borderSecondary}`, paddingTop: gap } : {}),
          }}
        >
          {marker === "none" ? null : (
            <span
              aria-hidden="true"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, height: markerLineHeight }}
            >
              {renderMarker(marker, listStyle.icon, start + index)}
            </span>
          )}
          <div style={{ display: "grid", gap, flex: 1, minWidth: 0 }}>
            {item.content}
            {item.children?.length ? (
              <PhiBulletListControl
                items={item.children}
                listStyle={listStyle}
                depth={depth + 1}
                markerLineHeight={markerLineHeight}
              />
            ) : null}
          </div>
        </li>
      ))}
    </ListTag>
  );
}
