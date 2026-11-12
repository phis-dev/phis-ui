"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { PHI_SEARCH_QUERY_PARAM } from "@phis/contracts/search";

import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import { usePhiHydrated } from "../../../../../components/state/use-phi-hydrated";
import type { PhiSearchWidgetLabels } from "../../../../../components/widgets/label-types/search";
import type { PhiClientBlockBaseProps } from "../../../../../types";
import type { PhiControlSize } from "../../../../../types/control";
import type { PhiSearchBoxVariant } from "./config";

export type PhiSearchBoxWidgetClientConfig = {
  /** The results Page, as the form's address. Absent on the Builder's canvas, where nothing submits. */
  action?: string;
  placeholder: string;
  size?: PhiControlSize;
  /** The query the page is answering, so the box shows what was searched for. */
  initialQuery: string;
  /** Absent is `input`. */
  variant?: PhiSearchBoxVariant;
  /**
   * False on the Builder's canvas: the box is drawn as a visitor sees it, but a submit there would leave
   * the Builder for the results Page, so the field takes no input and the magnifier does not open.
   */
  interactive?: boolean;
};

export type PhiSearchBoxWidgetClientProps = PhiClientBlockBaseProps<PhiSearchWidgetLabels, PhiSearchBoxWidgetClientConfig>;

/** The Shell's phone, as `styles/shell.css` measures it: the render viewport below 768px. */
const PHI_SEARCH_BOX_PHONE_WIDTH = 768;

/**
 * Whether the magnifier stands on a phone, measured where `styles/shell.css` measures it: the nearest
 * `phi-render-viewport` container, which is the window less the sider live and the device frame in the
 * Builder. Read once when the magnifier is pressed, which is the only moment it decides anything.
 */
function readPhiSearchBoxOnPhone(element: HTMLElement): boolean {
  for (let node: HTMLElement | null = element.parentElement; node; node = node.parentElement) {
    if (getComputedStyle(node).containerName.split(/\s+/).includes("phi-render-viewport")) {
      return node.clientWidth < PHI_SEARCH_BOX_PHONE_WIDTH;
    }
  }
  return window.innerWidth < PHI_SEARCH_BOX_PHONE_WIDTH;
}

/** `closing` while the field folds back into the magnifier; it is gone when that animation ends. */
type PhiSearchBoxOpen =
  | null
  | { kind: "inline"; closing?: true }
  | { kind: "row"; region: HTMLElement; closing?: true };

/** Whether the reader asked for less motion: then there is no fold to wait for. */
function readPhiReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * A `GET` form around one search field (SEARCH.md), as the input or as a magnifier alone that opens into one (`icon-only`).
 *
 * The browser submits it: Enter, or the keyboard's search key, sends `?q=` to the results Page without
 * a script, and a static Public page needs none. The field is the house's text Control with the form's
 * field name, so it clears, labels and sizes like every other field, and the form is a landmark a screen
 * reader lists.
 *
 * The magnifier is a link to the results Page until the page has hydrated, so it leads somewhere without
 * a script too. After that it opens the field where it stands -- the field grows out of it -- or, on a
 * phone, as a row over the whole band it stands in: a header on a phone has no room for a field beside
 * the brand and the menu button, and one that wrapped would push the page down. Escape, the close mark,
 * or leaving the field empty closes it again, the field folding back into the magnifier as it came.
 *
 * `auto` draws both the field and the magnifier and `styles/shell.css` shows one, the way the Header
 * Navigation draws its row and its menu button: whether this is a phone is the Shell's width, known to
 * CSS on the first paint.
 */
export function PhiSearchBoxWidgetClient({ labels, config }: PhiSearchBoxWidgetClientProps) {
  const [draft, setDraft] = useState(config?.initialQuery ?? "");
  const [open, setOpen] = useState<PhiSearchBoxOpen>(null);
  const hydrated = usePhiHydrated();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const interactive = config?.interactive !== false;
  const variant = config?.variant ?? "input";
  const placeholder = config?.placeholder ?? "";

  /*
   * Closing plays the opening backwards: the field is marked `closing`, folds, and is removed when its
   * animation ends (`finishClosing`). Without motion there is nothing to wait for.
   */
  const close = useCallback(() => {
    if (readPhiReducedMotion()) {
      setOpen(null);
      return;
    }
    setOpen((current) => (current && !current.closing ? { ...current, closing: true } : current));
  }, []);
  const finishClosing = (event: AnimationEvent<HTMLElement>) => {
    if (event.target === event.currentTarget && open?.closing) setOpen(null);
  };

  /*
   * The band the row covers is its containing block. A band that is already positioned -- a sticky
   * header -- stays as it is; a static one is positioned while the row is open and given back after.
   */
  useEffect(() => {
    if (open?.kind !== "row") return undefined;
    const { region } = open;
    if (getComputedStyle(region).position !== "static") return undefined;
    const previous = region.style.position;
    region.style.position = "relative";
    return () => {
      region.style.position = previous;
    };
  }, [open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!interactive || !config?.action) event.preventDefault();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Escape" && open && !open.closing) {
      event.preventDefault();
      close();
    }
  };

  const form = ({ autoFocus = false, collapsible = false }: { autoFocus?: boolean; collapsible?: boolean } = {}) => (
    <form
      method="get"
      action={interactive ? config?.action : undefined}
      role="search"
      aria-label={labels.title}
      className="phi-search-box__form"
      onSubmit={submit}
    >
      <PhiTextControl
        name={PHI_SEARCH_QUERY_PARAM}
        inputType="search"
        ariaLabel={labels.ariaLabel}
        placeholder={placeholder}
        clearLabel={labels.clearLabel}
        size={config?.size}
        value={draft}
        readOnly={!interactive}
        tabIndex={interactive ? undefined : -1}
        autoFocus={autoFocus}
        onChange={(value) => setDraft(value ?? "")}
        onClear={() => setDraft("")}
        onKeyDown={onKeyDown}
        onBlur={collapsible ? () => {
          if (!draft.trim()) close();
        } : undefined}
        style={{ width: "100%" }}
      />
    </form>
  );

  const pressMagnifier = () => {
    const root = rootRef.current;
    if (!root) return;
    // A header band only: a row over the content Region would cover the page, where the field has room.
    const region = root.closest<HTMLElement>('[data-phi-region-key^="header_"]');
    setOpen(region && readPhiSearchBoxOnPhone(root) ? { kind: "row", region } : { kind: "inline" });
  };

  const magnifier = open?.kind === "inline"
    ? (
      <span
        className={open.closing ? "phi-search-box__expand phi-search-box__expand--closing" : "phi-search-box__expand"}
        onAnimationEnd={finishClosing}
      >
        {form({ autoFocus: true, collapsible: true })}
      </span>
    )
    : (
      <span className="phi-search-box__magnifier">
        <PhiButtonControl
          type="text"
          shape="circle"
          ariaLabel={labels.title}
          ariaExpanded={open != null}
          icon={<PhiIcon name="search" size="inherit" />}
          size={config?.size}
          readOnly={!interactive}
          /* Before hydration a link to the results Page; after it, the field opens here. */
          {...(interactive && !hydrated && config?.action ? { href: config.action } : { onClick: pressMagnifier })}
        />
      </span>
    );

  return (
    <div ref={rootRef} className={`phi-search-box phi-search-box--${variant}`}>
      {variant === "icon-only" ? null : <span className="phi-search-box__field">{form()}</span>}
      {variant === "input" ? null : magnifier}
      {open?.kind === "row"
        ? createPortal(
          <div
            className={open.closing ? "phi-search-box__row phi-search-box__row--closing" : "phi-search-box__row"}
            onAnimationEnd={finishClosing}
          >
            {form({ autoFocus: true })}
            <PhiButtonControl
              type="text"
              shape="circle"
              ariaLabel={labels.closeLabel}
              icon={<PhiIcon name="close" size="inherit" />}
              onClick={close}
            />
          </div>,
          open.region,
        )
        : null}
    </div>
  );
}
