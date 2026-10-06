"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { usePhiApplicationFeedback } from "../../../../components/runtime/use-phi-application-feedback";
import { PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignalAddress } from "../../../../types/signals";
import type { PhiDraftStatusSignalValue } from "../../../../types/draft-status";
import type { PhiBlockRuntime } from "../../../../types/widget-runtime";
import { createPhiThemeControllerAddress } from "../../../../plugins/runtime-modules/theme/controller/address";
import { PHI_THEME_SIGNAL_CHANNELS } from "../../../../plugins/runtime-modules/theme/controller/signals";
import { createPhiCoreRuntimeControllerAddress } from "../../../../components/runtime/core-runtime-controller-address";
import { usePhiConfig } from "../../../../components/root/phi-config-provider";
import { usePhiThemeBlockCatalog } from "../../../../components/root/phi-theme-block-catalog-provider";
import { resolvePhiThemeComposition } from "../../../../theme/phi-theme-composition";
import { resolvePhiThemeRuntimePayload } from "../../../../theme/phi-theme-runtime";
import { materializePhiThemeBrandLogo, materializePhiThemeModuleBlocks } from "../materialize-images";
import {
  buildPhiSiteThemeSelectOptions,
  createPhiSiteThemeSelectionValue,
  createPhiThemeDerivation,
  ensurePhiThemeDerivation,
  readPhiSiteThemeSelectionState,
  resolvePhiThemeSelectionValue,
} from "../../../../theme/phi-theme-selection";
import type { PhiControlOption } from "../../../../components/controls/phi-control-options";
import type { PhiThemeRuntimeControllerConfig } from "./definition";
import { dispatchPhiSignalCapability } from "../../../../components/runtime/runtime-signal-identity";
import {
  formatPhiHistoryMoveMessage,
  formatPhiHistoryTooltip,
  type PhiHistoryLabels,
} from "../../../../components/widgets/label-types/history";

import {
  phiThemeHistory,
  resolvePhiThemeHistoryAction,
  DEFAULT_THEME_KEY,
  resolveThemeKey,
  normalizeTheme,
  resolveInitialTheme,
  resolveThemePayloadPreset,
  applyThemePreset,
  resetThemeToPreset,
  buildThemeReviewHref,
  createInitialBrandThemeState,
  isSameThemePayload,
  mergeThemeSetChoice,
} from "../brand-theme-model";
import type {
  ThemePayload,
  ThemeReadResponse,
  ThemeWriteResponse,
  BrandThemeState,
} from "../brand-theme-model";

/*
 * `correlationId` is the exchange this state belongs to: the command that saved, published or reset,
 * or the draft another Widget asked the Controller to take. It is absent only where the Controller
 * announces the state it loaded on arrival, which begins one.
 */
function emitThemeState(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  theme: ThemePayload,
  revisionId: number | null,
  selectionValue: string,
  draftStatus: "draft" | "published" = "draft",
  correlationId?: string,
) {
  const receiver = "broadcast" as const;
  dispatchBrandThemeSignal(dispatchSignal, { receiver, theme, revisionId, draftStatus, correlationId });
  dispatchSignal({
    scope: "area",
    channel: PHI_THEME_SIGNAL_CHANNELS.presetSelect,
    action: "change",
    value: selectionValue,
    valueType: "string",
    sender: createPhiThemeControllerAddress(),
    receiver,
    correlationId,
    timestamp: Date.now(),
  });
}

/** The Theme as one Signal, to everybody or to the one Widget that asked; both emitters send this. */
function dispatchBrandThemeSignal(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  {
    receiver,
    theme,
    revisionId,
    draftStatus,
    correlationId,
  }: {
    receiver: PhiSignalAddress | "broadcast";
    theme: ThemePayload;
    revisionId: number | null;
    draftStatus: "draft" | "published";
    correlationId: string | undefined;
  },
) {
  dispatchSignal({
    scope: "area",
    channel: PHI_THEME_SIGNAL_CHANNELS.brandTheme,
    action: "change",
    value: { theme, revisionId, draftStatus, themeKey: DEFAULT_THEME_KEY },
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.brandTheme,
    sender: createPhiThemeControllerAddress(),
    receiver,
    correlationId,
    timestamp: Date.now(),
  });
}

/**
 * The draft's state in the words every draft keeper uses (`PhiDraftStatusSignalValue`), for the Core
 * Draft Status Widget: broadcast when it changes, or addressed to the one Widget that asked on mount.
 */
function emitThemeDraftStatus(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  receiver: PhiSignalAddress | "broadcast",
  value: PhiDraftStatusSignalValue,
  correlationId?: string,
) {
  dispatchSignal({
    scope: "area",
    channel: PHI_THEME_SIGNAL_CHANNELS.draftStatus,
    action: "change",
    value: { ...value, themeKey: DEFAULT_THEME_KEY },
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
    sender: createPhiThemeControllerAddress(),
    receiver,
    correlationId,
    timestamp: Date.now(),
  });
}

/**
 * The Set select's options, stated again for a stored Theme that changed.
 *
 * The Site Theme entry names the Set the stored Theme was derived from, and a save or a publish is a
 * new stored Theme. The whole list goes out, because that is what the select takes; the Sets come from
 * the server, where the active Modules are known.
 */
function emitThemeSelectOptions(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  options: readonly PhiControlOption[],
  correlationId?: string,
) {
  dispatchSignal({
    scope: "area",
    channel: PHI_THEME_SIGNAL_CHANNELS.presetOptions,
    action: "change",
    value: { options: options.map((option) => ({ ...option })) },
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.controlOptions,
    sender: createPhiThemeControllerAddress(),
    receiver: "broadcast",
    correlationId,
    timestamp: Date.now(),
  });
}

/**
 * The reply, addressed to the one Widget that asked.
 *
 * Deliberately not `emitThemeState`. That one announces a change everybody is affected by, and says
 * three things -- the theme, the draft status, the selected preset -- because all three moved. Nothing
 * moved here: one Widget arrived late and needs catching up, so a broadcast would set the state of
 * Widgets that already had it, under the correlation of a mount they had no part in.
 */
function emitThemeStateTo(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  receiver: PhiSignalAddress,
  theme: ThemePayload,
  revisionId: number | null,
  draftStatus: "draft" | "published",
  correlationId: string,
) {
  dispatchBrandThemeSignal(dispatchSignal, { receiver, theme, revisionId, draftStatus, correlationId });
}

function emitRootThemeState(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  theme: ThemePayload,
  correlationId: string,
) {
  dispatchSignal({
    scope: "site",
    channel: "theme",
    action: "change",
    value: theme,
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeTheme,
    sender: createPhiThemeControllerAddress(),
    receiver: createPhiCoreRuntimeControllerAddress(),
    correlationId,
    timestamp: Date.now(),
  });
}

/**
 * The Page, asked again for the Theme it now has.
 *
 * Publishing moves what the server renders from, and almost none of that is in this Widget's hands.
 * The Root layout reads the Site's Theme once per server render and hands the whole of it down --
 * fonts, the root background, the Brand's pictures -- and the Builder page around this Widget was
 * measured with the shell heights of the Theme that stood before. The broadcast beside this one
 * reaches the Theme Widgets on this page and nothing above them, and the preview signal only paints
 * the draft; so without this, what was published is visible on the next navigation and not before.
 *
 * `reload` at the Core Runtime's address is the Site's one way of saying it: the always-mounted
 * adapter answers with `router.refresh()`, which re-renders the route's Server components and leaves
 * the operator on the panel they had open (components/runtime/core-runtime-application-adapter.tsx).
 * A document reload would close it.
 */
function emitRootReload(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  correlationId: string | undefined,
) {
  dispatchSignal({
    scope: "site",
    channel: "reload",
    action: "activate",
    value: null,
    valueType: "none",
    sender: createPhiThemeControllerAddress(),
    receiver: createPhiCoreRuntimeControllerAddress(),
    correlationId,
    timestamp: Date.now(),
  });
}

export function PhiThemeControllerRuntime({
  runtime,
  config,
  setOptions,
  historyLabels,
}: {
  runtime: PhiBlockRuntime;
  config: PhiThemeRuntimeControllerConfig;
  setOptions: readonly PhiControlOption[];
  /** What an undo or redo, and the toolbar's tooltips, say about a Theme edit. */
  historyLabels: PhiHistoryLabels;
}) {
  const dispatchSignal = usePhiSignalDispatcher();
  const { showMessage } = usePhiApplicationFeedback();
  const { presets: themePresets } = usePhiConfig();
  const themeBlocks = usePhiThemeBlockCatalog();
  /*
   * Whom the history's state goes to: the Page that shows the undo and redo commands names them
   * (`controllerSettings`), and it is stated again when a Page arrives with other routes.
   */
  const emitRoutes = useMemo(() => config.signalRoutes?.emits ?? [], [config.signalRoutes?.emits]);
  const emitCapability = useCallback((capabilityId: string, value: boolean | string) => {
    dispatchPhiSignalCapability(
      dispatchSignal,
      createPhiThemeControllerAddress(),
      emitRoutes,
      capabilityId,
      value,
    );
  }, [dispatchSignal, emitRoutes]);
  const themeKey = resolveThemeKey(null);
  const siteKey = runtime.site.key;
  const historyScope = `theme:${siteKey}:${themeKey}`;
  const reviewArea =
    runtime.area === "builder" ? "public" : runtime.area;
  const fallbackTheme = useMemo(() => resolveInitialTheme(runtime), [runtime]);
  const initialState = useMemo(() => createInitialBrandThemeState(themeKey, fallbackTheme), [fallbackTheme, themeKey]);
  const [state, setState] = useState<BrandThemeState>(initialState);
  const stateRef = useRef<BrandThemeState>(initialState);
  /*
   * The Theme being worked on -- the Draft entry of the Set select. Trying on a Set or the Published
   * Theme leaves it alone, so picking Draft again takes the try-on back; any edit moves it.
   */
  const siteThemeRef = useRef<ThemePayload>(initialState.draft);
  /* The options last sent, so a draft that changes nothing in the select does not send them again. */
  const sentSelectOptionsRef = useRef<string | null>(null);
  /* The draft a picker edit started from, while one is open; see `PhiThemeDraftEdit`. */
  const pickerEditBeforeRef = useRef<ThemePayload | null>(null);
  const [saving, setSaving] = useState(false);
  /*
   * The Theme as it is stored -- the saved draft, or the published Theme where no draft stands -- and
   * why it could not be read, if it could not. What is on screen differing from it is `unsaved`.
   */
  const savedThemeRef = useRef<ThemePayload>(initialState.draft);
  const readErrorRef = useRef<string | null>(null);

  const resolveDraftStatus = useCallback((): PhiDraftStatusSignalValue => {
    const current = stateRef.current;
    const subject = `theme/${themeKey}`;
    if (readErrorRef.current !== null) {
      return { status: "error", revisionId: null, subject, error: readErrorRef.current };
    }
    if (!isSameThemePayload(current.draft, savedThemeRef.current)) {
      return { status: "unsaved", revisionId: current.revisionId, subject };
    }
    return current.revisionId != null
      ? { status: "draft", revisionId: current.revisionId, subject }
      : { status: "published", revisionId: null, subject };
  }, [themeKey]);

  const announceDraftStatus = useCallback((correlationId?: string) => {
    emitThemeDraftStatus(dispatchSignal, "broadcast", resolveDraftStatus(), correlationId);
  }, [dispatchSignal, resolveDraftStatus]);

  /*
   * A draft exists once one was saved, or once the Theme being worked on is no longer the published one.
   * Undoing back to the published Theme takes an unsaved draft away again.
   */
  const hasDraft = useCallback(() => {
    const current = stateRef.current;
    return current.revisionId != null || !isSameThemePayload(siteThemeRef.current, current.published);
  }, []);

  const resolveSelectionValue = useCallback(() => resolvePhiThemeSelectionValue(siteKey, {
    published: stateRef.current.hasPublishedThemeRevision,
    draft: hasDraft(),
  }), [hasDraft, siteKey]);

  const emitSelectOptions = useCallback((correlationId?: string) => {
    const current = stateRef.current;
    const options = [
      ...buildPhiSiteThemeSelectOptions({
        siteKey,
        published: current.hasPublishedThemeRevision
          ? { theme: current.published, revisionId: current.publishedRevisionId }
          : null,
        draft: hasDraft() ? { theme: siteThemeRef.current, revisionId: current.revisionId } : null,
      }),
      ...setOptions,
    ];
    const serialized = JSON.stringify(options);
    if (serialized === sentSelectOptionsRef.current) {
      return;
    }
    sentSelectOptionsRef.current = serialized;
    emitThemeSelectOptions(dispatchSignal, options, correlationId);
  }, [dispatchSignal, hasDraft, setOptions, siteKey]);

  /*
   * Every draft states the Set it was derived from. A Theme that never named one gets the core Set on
   * its first draft, so the Draft entry is never without a name.
   */
  const publishDraft = useCallback((
    draftTheme: ThemePayload,
    options?: {
      history?: boolean;
      updateSiteSnapshot?: boolean;
      correlationId?: string;
      /** What the Set select shows for this draft; a Site entry unless a Set is being tried. */
      selectionValue?: string;
    },
  ) => {
    const nextTheme = ensurePhiThemeDerivation(draftTheme);
    const current = stateRef.current;
    if (options?.history !== false && !isSameThemePayload(current.draft, nextTheme)) {
      phiThemeHistory.record(historyScope, {
        action: resolvePhiThemeHistoryAction(current.draft, nextTheme, historyLabels),
        before: current.draft,
        after: nextTheme,
      });
    }

    const nextState = {
      ...current,
      draft: nextTheme,
    };
    stateRef.current = nextState;
    if (options?.updateSiteSnapshot !== false) {
      siteThemeRef.current = nextTheme;
    }
    setState(nextState);
    emitThemeState(
      dispatchSignal,
      nextTheme,
      nextState.revisionId,
      options?.selectionValue ?? resolveSelectionValue(),
      "draft",
      options?.correlationId,
    );
    announceDraftStatus(options?.correlationId);
    emitSelectOptions(options?.correlationId);
  }, [announceDraftStatus, dispatchSignal, emitSelectOptions, historyLabels, historyScope, resolveSelectionValue]);

  useEffect(() => {
    const emitAvailability = () => {
      const availability = phiThemeHistory.getAvailability(historyScope);
      emitCapability("undoEnabled", availability.canUndo);
      emitCapability("redoEnabled", availability.canRedo);
      emitCapability("undoTooltip", formatPhiHistoryTooltip(historyLabels, "undo", availability.undoAction));
      emitCapability("redoTooltip", formatPhiHistoryTooltip(historyLabels, "redo", availability.redoAction));
    };

    emitAvailability();
    return phiThemeHistory.subscribe(historyScope, emitAvailability);
  }, [emitCapability, historyLabels, historyScope]);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/site/cms/theme?key=${encodeURIComponent(themeKey)}`, {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as ThemeReadResponse | null;
        if (!response.ok) {
          throw new Error((body as { error?: string } | null)?.error ?? "Failed to read theme.");
        }
        if (cancelled) {
          return;
        }

        const published = normalizeTheme(body?.published, fallbackTheme);
        const draft = normalizeTheme(body?.draft?.theme?.theme, published);
        const revisionId =
          typeof body?.draft?.revisionId === "number" && Number.isInteger(body.draft.revisionId)
            ? body.draft.revisionId
            : null;
        const publishedRevisionId =
          typeof body?.publishedRevisionId === "number" && Number.isInteger(body.publishedRevisionId)
            ? body.publishedRevisionId
            : null;
        const nextState = {
          key: body?.key?.trim() || themeKey,
          published,
          draft,
          revisionId,
          hasPublishedThemeRevision: publishedRevisionId != null,
          publishedRevisionId,
        };
        stateRef.current = nextState;
        siteThemeRef.current = draft;
        savedThemeRef.current = draft;
        readErrorRef.current = null;
        setState(nextState);
        phiThemeHistory.clear(historyScope);
        emitThemeState(
          dispatchSignal,
          draft,
          revisionId,
          resolveSelectionValue(),
          revisionId == null ? "published" : "draft",
        );
        announceDraftStatus();
        emitSelectOptions();
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to read theme.";
          readErrorRef.current = message;
          announceDraftStatus();
          showMessage({ level: "error", content: message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    announceDraftStatus,
    dispatchSignal,
    emitSelectOptions,
    fallbackTheme,
    historyScope,
    resolveSelectionValue,
    showMessage,
    siteKey,
    themeKey,
  ]);

  async function saveTheme(
    draftTheme = stateRef.current.draft,
    options?: { notify?: boolean; correlationId?: string },
  ) {
    let nextTheme = ensurePhiThemeDerivation(draftTheme);
    setSaving(true);
    try {
      const current = stateRef.current;
      /*
       * The blocks a Module brought become the Site's here, on the way to the server and nowhere else:
       * its palette, its style tokens, and its ground -- background, Chrome and Shadow of both modes as
       * values, every picture as a Site Asset. Following a block costs nothing; saving is what says
       * somebody means to keep it, and a look somebody decided on must not depend on a package staying
       * installed.
       */
      const materialized = await materializePhiThemeModuleBlocks(
        nextTheme,
        resolvePhiThemeComposition(nextTheme, themeBlocks),
      );
      /*
       * The Logo is taken the same way, from every Set, core included: a Set offers it, and a Site that
       * saved has decided to keep it -- as a picture in its own library, not as a data URL in its record.
       */
      nextTheme = await materializePhiThemeBrandLogo(
        materialized.theme,
        resolvePhiThemeComposition(materialized.theme, themeBlocks).markSet,
      );
      const response = await fetch("/api/site/cms/theme", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          key: current.key,
          theme: nextTheme,
          message: "Brand theme draft",
        }),
      });
      const body = (await response.json().catch(() => null)) as ThemeWriteResponse | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to save theme draft.");
      }
      const revisionId = typeof body?.revisionId === "number" && Number.isInteger(body.revisionId) ? body.revisionId : null;
      const savedTheme = normalizeTheme(body?.theme?.theme, nextTheme);
      const nextState = {
        ...stateRef.current,
        draft: savedTheme,
        revisionId,
      };
      stateRef.current = nextState;
      siteThemeRef.current = savedTheme;
      savedThemeRef.current = savedTheme;
      setState(nextState);
      emitThemeState(
        dispatchSignal,
        savedTheme,
        revisionId,
        resolveSelectionValue(),
        "draft",
        options?.correlationId,
      );
      announceDraftStatus(options?.correlationId);
      emitSelectOptions(options?.correlationId);
      if (options?.notify !== false) {
        showMessage(
          { level: "success", content: "Saved theme draft." },
          { correlationId: options?.correlationId ?? null },
        );
      }
      return revisionId;
    } finally {
      setSaving(false);
    }
  }

  async function publishTheme(correlationId?: string) {
    /*
     * Publish takes what is on screen. The server publishes a saved revision, so an unsaved draft is
     * saved first and that revision goes live; publishing `revisionId` as it stood would have put the
     * last save live and then replaced every panel with it, dropping the unsaved edits without a word.
     */
    if (!isSameThemePayload(stateRef.current.draft, savedThemeRef.current)) {
      await saveTheme(undefined, { notify: false, correlationId });
    }
    const current = stateRef.current;
    if (current.revisionId == null) {
      throw new Error("No saved theme draft found to publish.");
    }

    const response = await fetch("/api/site/cms/theme/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        key: current.key,
        revisionId: current.revisionId,
      }),
    });
    const body = (await response.json().catch(() => null)) as ThemeWriteResponse | null;
    if (!response.ok) {
      throw new Error(body?.error ?? "Failed to publish theme.");
    }
    const published = normalizeTheme(body?.theme?.theme, current.draft);
    const nextState = {
      ...current,
      published,
      draft: published,
      revisionId: null,
      hasPublishedThemeRevision: true,
      publishedRevisionId: current.revisionId,
    };
    stateRef.current = nextState;
    siteThemeRef.current = published;
    savedThemeRef.current = published;
    setState(nextState);
    emitThemeState(
      dispatchSignal,
      published,
      null,
      resolveSelectionValue(),
      "published",
      correlationId,
    );
    announceDraftStatus(correlationId);
    emitSelectOptions(correlationId);
    showMessage({ level: "success", content: "Published theme." }, { correlationId: correlationId ?? null });
    emitRootReload(dispatchSignal, correlationId);
  }

  /*
   * The Controller names the address it is addressed at, or the bus has nobody to deliver to.
   *
   * A signal is held until a listener answers for its receiver, and a listener answers only for an
   * address it names. Every draft a Widget sent -- and every hydrate request -- was held here and
   * never arrived, silently: the Widget rendered its own copy, so the controls looked right while the
   * Controller knew nothing and the preview was never told.
   */
  usePhiSignalListener((signal) => {
    if (
      signal.channel === PHI_THEME_SIGNAL_CHANNELS.brandTheme &&
      signal.action === "change" &&
      signal.receiver === createPhiThemeControllerAddress() &&
      signal.sender !== createPhiThemeControllerAddress()
    ) {
      const value = signal.value && typeof signal.value === "object"
        ? signal.value as { theme?: unknown; revisionId?: unknown; edit?: unknown }
        : null;
      const current = stateRef.current;
      const nextTheme = normalizeTheme(value?.theme, current.draft);
      const revisionId = typeof value?.revisionId === "number" && Number.isInteger(value.revisionId) ? value.revisionId : current.revisionId;
      if (revisionId !== current.revisionId) {
        stateRef.current = { ...current, revisionId };
      }
      const edit = value?.edit;
      if (edit === "live") {
        pickerEditBeforeRef.current ??= current.draft;
        publishDraft(nextTheme, { history: false, correlationId: signal.correlationId });
        return;
      }
      if (edit === "commit" || edit === "discard") {
        const before = pickerEditBeforeRef.current;
        pickerEditBeforeRef.current = null;
        if (edit === "discard") {
          publishDraft(before ?? nextTheme, { history: false, correlationId: signal.correlationId });
          return;
        }
        publishDraft(nextTheme, { history: false, correlationId: signal.correlationId });
        if (before && !isSameThemePayload(before, nextTheme)) {
          phiThemeHistory.record(historyScope, {
            action: resolvePhiThemeHistoryAction(before, nextTheme, historyLabels),
            before,
            after: nextTheme,
          });
        }
        return;
      }
      pickerEditBeforeRef.current = null;
      publishDraft(nextTheme, { correlationId: signal.correlationId });
      return;
    }

	    if (
      signal.scope === "area" &&
      signal.receiver === createPhiThemeControllerAddress() &&
      signal.channel === PHI_THEME_SIGNAL_CHANNELS.previewThemeMode &&
      signal.action === "change" &&
      signal.valueType === "boolean"
    ) {
	      const value = signal.value;
      const nextMode = typeof value === "boolean" ? value ? "dark" : "light" : null;

      if (!nextMode) {
        return;
      }
      const current = stateRef.current;
      const baseTheme = current.hasPublishedThemeRevision ? current.published : fallbackTheme;
      const nextTheme = {
        ...baseTheme,
        mode: nextMode,
      } satisfies ThemePayload;
      // Resolved here, where the catalogue is: the root applies what it receives and holds no blocks.
      emitRootThemeState(dispatchSignal, resolvePhiThemeRuntimePayload(nextTheme, themeBlocks).theme, signal.correlationId);
      return;
    }

    if (signal.channel === PHI_THEME_SIGNAL_CHANNELS.presetSelect) {
      if (
        signal.scope === "area" &&
        signal.action === "change" &&
        signal.receiver === createPhiThemeControllerAddress() &&
        typeof signal.value === "string" &&
        signal.value.trim().length > 0
      ) {
        /*
         * Draft goes back to the Theme being worked on; Published is tried on the way a Set is -- it
         * replaces what is shown, the Draft entry keeps what was there, and only a save or an edit on
         * top makes it the draft. Both are one history entry.
         */
        const siteState = readPhiSiteThemeSelectionState(signal.value, siteKey);
        if (siteState) {
          const current = stateRef.current;
          if (siteState === "published" && !current.hasPublishedThemeRevision) {
            return;
          }
          const nextTheme = siteState === "draft" ? siteThemeRef.current : current.published;
          if (!isSameThemePayload(current.draft, nextTheme)) {
            publishDraft(nextTheme, {
              updateSiteSnapshot: false,
              correlationId: signal.correlationId,
              selectionValue: createPhiSiteThemeSelectionValue(siteKey, siteState),
            });
          }
          return;
        }
        /*
         * A Set is tried on, not taken: it decides all three parts and names itself as the derivation,
         * but the Site Theme entry keeps what was there before, so choosing it again takes the Set back.
         */
        const set = themeBlocks.sets.find((candidate) => candidate.key === signal.value);
        if (!set) {
          return;
        }
        const palette = themeBlocks.palettes.find((candidate) => candidate.key === set.palette);
        const withSet = mergeThemeSetChoice(stateRef.current.draft, set);
        const nextTheme: ThemePayload = {
          ...(palette ? applyThemePreset(withSet, palette) : withSet),
          derivedFrom: createPhiThemeDerivation(set),
        };
        if (!isSameThemePayload(stateRef.current.draft, nextTheme)) {
          publishDraft(nextTheme, {
            updateSiteSnapshot: false,
            correlationId: signal.correlationId,
            selectionValue: set.key,
          });
        }
        return;
      }

      return;
    }

    /*
     * A Draft Status Widget that mounted asks what stands; the answer goes to it alone, for the reason
     * `emitThemeStateTo` gives. Answered whatever is in progress, because it is a question about state.
     */
    if (
      signal.scope === "area" &&
      signal.channel === PHI_THEME_SIGNAL_CHANNELS.draftStatus &&
      signal.action === "activate" &&
      signal.receiver === createPhiThemeControllerAddress()
    ) {
      if (signal.sender != null) {
        emitThemeDraftStatus(dispatchSignal, signal.sender, resolveDraftStatus(), signal.correlationId);
      }
      return;
    }

    if (
      signal.scope !== "area" ||
      signal.channel !== PHI_THEME_SIGNAL_CHANNELS.command ||
      signal.action !== "activate" ||
      signal.valueType !== "string" ||
      signal.receiver !== createPhiThemeControllerAddress()
    ) {
      return;
    }

    const commandValue = signal.value;

    /*
     * Answered before the saving guard: a Widget that mounts mid-save is asking what is there, which
     * is a question about state and not a command that would compete with the save.
     */
    if (commandValue === "hydrate") {
      const asker = signal.sender;
      if (asker == null) {
        return;
      }
      const current = stateRef.current;
      emitThemeStateTo(
        dispatchSignal,
        asker,
        current.draft,
        current.revisionId,
        current.revisionId == null ? "published" : "draft",
        signal.correlationId,
      );
      return;
    }

    if (saving) {
      return;
    }

    if (commandValue === "save") {
      void saveTheme(undefined, { correlationId: signal.correlationId }).catch((error) => {
        showMessage(
          { level: "error", content: error instanceof Error ? error.message : "Failed to save theme draft." },
          { correlationId: signal.correlationId },
        );
      });
      return;
    }

    if (commandValue === "publish") {
      void publishTheme(signal.correlationId).catch((error) => {
        showMessage(
          { level: "error", content: error instanceof Error ? error.message : "Failed to publish theme." },
          { correlationId: signal.correlationId },
        );
      });
      return;
    }

    if (commandValue === "preview") {
      const revisionId = stateRef.current.revisionId;
      if (!Number.isInteger(revisionId) || (revisionId as number) <= 0) {
        showMessage(
          { level: "error", content: "No saved theme draft found. Save first before opening live preview." },
          { correlationId: signal.correlationId },
        );
        return;
      }

      const href = buildThemeReviewHref({
        area: reviewArea,
        revisionId: revisionId as number,
        themeKey: stateRef.current.key,
      });
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    if (commandValue === "reset") {
      const preset = resolveThemePayloadPreset(stateRef.current.draft, themePresets);
      publishDraft(
        resetThemeToPreset(stateRef.current.draft, themePresets, preset),
        { correlationId: signal.correlationId },
      );
      showMessage(
        { level: "success", content: `Reset theme to ${preset.title}.` },
        { correlationId: signal.correlationId },
      );
      return;
    }

    if (commandValue === "undo" || commandValue === "redo") {
      pickerEditBeforeRef.current = null;
      const apply = (snapshot: ThemePayload) => {
        publishDraft(snapshot, { history: false, correlationId: signal.correlationId });
      };
      const entry = commandValue === "undo"
        ? phiThemeHistory.undo(historyScope, apply)
        : phiThemeHistory.redo(historyScope, apply);
      if (entry) {
        showMessage(
          { level: "info", content: formatPhiHistoryMoveMessage(historyLabels, commandValue, entry.action) },
          { correlationId: signal.correlationId },
        );
      }
    }
  }, undefined, createPhiThemeControllerAddress());

  void state;

  return null;
}
