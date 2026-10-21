import type { PhiTourDefinition, PhiTourStepDefinition } from "../../../types/tours";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { PhiCmsRegionType } from "../../../constants/phi-cms";
import {
  createPhiPresetCmsInstanceId,
  createPhiPresetCmsInstanceIdMap,
  type PhiCmsInstanceId,
} from "../../../types/cms-instance-id";
import { PHI_BUILDER_AREA_SETTINGS_WIDGET_IDS } from "./addresses";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "./ids";
import { createPhiBuilderControllerAddress } from "./controller/address";
import {
  PHI_BUILDER_INSPECTOR_LAYOUT_IDS,
  PHI_BUILDER_INSPECTOR_OVERLAY_IDS,
  PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS,
} from "./inspector-overlay-addresses";

/*
 * The ids the workspace tree hands its nodes once it is remapped to the route's preset
 * (`remapBuilderPresetTreeInstanceIds`): the same Module, domain and node keys, under the Page's preset
 * key.
 */
function builderWorkspaceWidgetIds(presetKey: "builder-shells-page" | "builder-pages-page" | "builder-navigation-page") {
  return createPhiPresetCmsInstanceIdMap({
    domain: "area",
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    presetKey,
  }, [
    "widgetBuilderModeSwitch",
    "widgetToolbar",
    "widgetDraftStatus",
    "widgetCanvas",
    "widgetStructureSiderFullHeightSwitch",
    "widgetPagesHeaderSelector",
    "widgetPagesMetaToolbar",
    "widgetNavigationSource",
    "widgetNavigationItems",
  ]);
}

/*
 * The Area selector stands in the Builder's Shell and keeps the Shell's own id. A Page Tour does not make a
 * Shell frame live; this one is found because its signal routes make it live already.
 */
const AREA_SELECTOR_ID = createPhiPresetCmsInstanceId({
  domain: "area",
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-area-preset",
  nodeKey: "widgetBuilderAreaSelector",
});

/**
 * Clicking a region, then what that click opens. The second step selects the region the first one pointed
 * at, the way the click does -- through the Builder Controller's `selection` -- so its Inspector is open
 * while it is described, and puts the Inspector away again when the step is left.
 */
function inspectorSteps(canvasId: PhiCmsInstanceId, regionKey: "header_top" | "header_bottom", regionType: number) {
  return [
    {
      key: "select",
      target: `cms:${canvasId}:${regionKey}`,
      title: "Setting something up",
      description: "A click on a region, a Layout or a Widget opens its Inspector, where everything about it is set up.",
      placement: "bottom",
    },
    {
      key: "inspector",
      target: `cms:${PHI_BUILDER_INSPECTOR_OVERLAY_IDS.regionInspector}`,
      title: "The Inspector",
      description: "For a region: its size and whether it stays put while the Page scrolls, the screens and the Pages it shows on, its spacing and its surface. A Layout and a Widget open an Inspector of their own, with their settings and the signals they send and hear. A change shows on the canvas at once and is part of the draft.",
      placement: "left",
      prepare: [{
        receiver: createPhiBuilderControllerAddress(),
        channel: "selection",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderNodeSelection,
        value: { nodeKind: "region", nodeKey: `region:${regionKey}`, regionKey, regionType },
      }],
      release: [INSPECTOR_CLOSE],
    },
  ] as const satisfies readonly PhiTourStepDefinition[];
}

const INSPECTOR_CLOSE = {
  receiver: createPhiBuilderControllerAddress(),
  channel: "inspectorVisibility",
  action: "change",
  valueType: "boolean",
  value: false,
} as const;

/**
 * The Layout Inspector, section by section. Each step selects the Region's root Layout -- by the Region,
 * since a Site's node ids are not known here -- and opens its section of the Inspector; it closes the
 * Inspector when left. From one step to the next the close and the selection arrive together, so the
 * Inspector stays open and only the section changes. A Region without a Layout opens nothing, and the
 * steps are passed over.
 *
 * The slot keys follow the order of the Layout Inspector's sections in
 * `trees/phi-builder-inspector-area-overlay-tree.server.ts`.
 */
function layoutInspectorSteps(regionKey: "header_top" | "content") {
  const selectLayout = {
    receiver: createPhiBuilderControllerAddress(),
    channel: "selection",
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderNodeSelection,
    value: { nodeKind: "layout", nodeKey: "layout", regionKey },
  } as const;
  const openSection = (slotKey: string) => ({
    receiver: `cms:${PHI_BUILDER_INSPECTOR_LAYOUT_IDS.layoutInspectorBody}`,
    channel: "slot",
    action: "open",
    valueType: "string",
    value: slotKey,
  }) as const;
  const step = (key: string, target: PhiCmsInstanceId, slotKey: string, title: string, description: string) => ({
    key,
    target: `cms:${target}`,
    title,
    description,
    placement: "left",
    ifMissing: "skip",
    prepare: [selectLayout, openSection(slotKey)],
    // Back to the section the Inspector opens with, so the next click finds it as it always does.
    release: [INSPECTOR_CLOSE, openSection("slot_0")],
  }) as const satisfies PhiTourStepDefinition;
  const ids = PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS;
  return [
    /*
     * The whole Inspector rather than its Settings section: a kind that declares no settings hides the
     * section, and a step waiting for it would hold the Tour until its wait runs out.
     */
    step(
      "layout-settings",
      PHI_BUILDER_INSPECTOR_OVERLAY_IDS.layoutInspector,
      "slot_0",
      "What only this Layout has",
      "A Layout's Inspector starts with the settings of its kind: the columns of a grid, the direction and the gaps of a row, the slides of a carousel. A kind without settings of its own starts with the anchor. Every kind of Layout and Widget brings its own.",
    ),
    step(
      "layout-anchor",
      ids.layoutAnchor,
      "slot_1",
      "Where it sits",
      "The anchor aligns the Layout in the space it is given: to an edge, to a corner, or in the middle.",
    ),
    step(
      "layout-padding",
      ids.layoutPadding,
      "slot_2",
      "Room inside",
      "Besides the paddings at its edges, the Layout has a gap in the middle: the space between the things that stand in it, side by side or one below the other. One value keeps them all the same distance apart.",
    ),
    step(
      "layout-viewport",
      ids.layoutViewport,
      "slot_3",
      "On which screens",
      "Whether the Layout shows on compact, medium and wide screens -- hidden on one, it is still there on the others.",
    ),
    step(
      "layout-surface",
      ids.layoutSurface,
      "slot_4",
      "What it stands on",
      "The surface is what the Layout stands on: none, one of the Theme's styles -- Card or Wash -- or Custom, which opens its background (a colour or an image), its border and its shadow. Mode draws it in the Page's colours, always light, always dark, or the other way round. A region has one as well; a Widget usually stands on its Layout's.",
    ),
    step(
      "layout-signals",
      ids.layoutSignals,
      "slot_5",
      "What it says and hears",
      "Signals connect the Layout with other parts of the Page: what it sends when something happens in it, and what it answers to -- a button that opens a slot, a list that follows a choice.",
    ),
  ];
}

const SHELLS_IDS = builderWorkspaceWidgetIds("builder-shells-page");
const PAGES_IDS = builderWorkspaceWidgetIds("builder-pages-page");

/**
 * The Shells workspace's Tour. What the workspace does not say is what a Shell is: the frame every Page
 * of the Area stands in, so a change here reaches all of them at once. The rest is the order a person
 * meets the workspace in, ending where the work goes live. The canvas steps point at single Regions
 * (`cms:<canvas>:<regionKey>`): the canvas is taller than the window, and pointing at all of it scrolled
 * it under the Builder's header and lit the header up with it.
 */
export const PHI_BUILDER_SHELLS_TOUR = {
  id: `${PHI_BUILDER_RUNTIME_MODULE_ID}/shells`,
  version: 1,
  steps: [
    {
      key: "area",
      target: `cms:${AREA_SELECTOR_ID}`,
      title: "Which Area you are building",
      description: "Every Area has its own Shell, and everything in this workspace applies to the Area chosen here. Usually only Public and App are worked on; the other Areas come as their Modules build them.",
      placement: "bottom",
      ifMissing: "skip",
    },
    {
      key: "shell",
      target: `cms:${SHELLS_IDS.widgetCanvas}:header_main`,
      title: "The frame of every Page",
      description: "The Shell is what every Page of the Area shares: the rows of the header, the left sider and the footer. What you change here appears on all of them.",
      placement: "bottom",
    },
    {
      key: "regions",
      target: `cms:${SHELLS_IDS.widgetCanvas}:sider_left`,
      title: "Regions and what stands in them",
      description: "A region holds only Layouts, and a Layout holds further Layouts or Widgets, so the first thing placed in an empty region is always a Layout.",
      placement: "right",
    },
    ...inspectorSteps(SHELLS_IDS.widgetCanvas, "header_top", PhiCmsRegionType.HeaderTop),
    ...layoutInspectorSteps("header_top"),
    {
      key: "mode",
      target: `cms:${SHELLS_IDS.widgetBuilderModeSwitch}`,
      title: "Editor and Preview",
      description: "Editor shows the regions to work in. Preview gives a first impression of your changes without saving them -- a sketch, not exactly what a visitor will see.",
      placement: "bottom",
    },
    {
      key: "sider",
      target: `cms:${SHELLS_IDS.widgetStructureSiderFullHeightSwitch}`,
      title: "How tall the sider is",
      description: "Whether the left sider runs the full height of the Shell, or stands beside the content between header and footer.",
      placement: "bottom",
      ifMissing: "skip",
    },
    {
      key: "area-settings",
      target: `cms:${PHI_BUILDER_AREA_SETTINGS_WIDGET_IDS.areaSettingsAction}`,
      title: "What the Area says about itself",
      description: "What the Area's own address shows, how Page titles are built, and for the public Area whether search engines may find it.",
      placement: "bottom",
    },
    {
      key: "commands",
      target: `cms:${SHELLS_IDS.widgetToolbar}`,
      title: "Saving and publishing",
      description: "Save keeps your changes as a draft, and Live preview opens the Area with it. Publish puts the Shell live on every Page; publishing takes the Publisher role. Undo and Redo step through your changes, and Reset discards the draft without touching what is live.",
      placement: "bottom",
    },
    {
      key: "draft-status",
      target: `cms:${SHELLS_IDS.widgetDraftStatus}`,
      title: "Where your changes stand",
      description: "What you change here is a draft. Visitors see the published Shell until the draft is published.",
      placement: "bottom",
    },
  ],
} as const satisfies PhiTourDefinition;

/**
 * The Pages workspace's Tour. Its first point is the split with Shells: a Page owns its own regions, and
 * the frame around them is not edited here. A new or deleted Page is a draft like any other change.
 */
export const PHI_BUILDER_PAGES_TOUR = {
  id: `${PHI_BUILDER_RUNTIME_MODULE_ID}/pages`,
  version: 1,
  steps: [
    {
      key: "area",
      target: `cms:${AREA_SELECTOR_ID}`,
      title: "Which Area you are building",
      description: "Every Area has its own Pages, and the Page list below holds those of the Area chosen here. Usually only Public and App are worked on; the other Areas come as their Modules build them.",
      placement: "bottom",
      ifMissing: "skip",
    },
    {
      key: "page-choice",
      target: `cms:${PAGES_IDS.widgetPagesHeaderSelector}`,
      title: "Which Page you are building",
      description: "Every Page of the Area, the ones created here and the ones a Module brings.",
      placement: "bottom",
    },
    {
      key: "page",
      target: `cms:${PAGES_IDS.widgetCanvas}:content`,
      title: "What belongs to this Page",
      description: "The content, the hero, the row under the header, the right sider, the row above the footer and the drawer are this Page's alone. The frame around them is the Shell, edited under Shells.",
      placement: "top",
    },
    {
      key: "regions",
      target: `cms:${PAGES_IDS.widgetCanvas}:hero`,
      title: "Regions and what stands in them",
      description: "A region holds only Layouts, and a Layout holds further Layouts or Widgets, so the first thing placed in an empty region is always a Layout.",
      placement: "bottom",
    },
    ...inspectorSteps(PAGES_IDS.widgetCanvas, "header_bottom", PhiCmsRegionType.HeaderBottom),
    ...layoutInspectorSteps("content"),
    {
      key: "page-commands",
      target: `cms:${PAGES_IDS.widgetPagesMetaToolbar}`,
      title: "New Pages and what a Page says",
      description: "New page creates one in this Area. Page meta sets its title, its description and whether search engines may find it. Delete takes the Page away once the change is published.",
      placement: "bottom",
    },
    {
      key: "mode",
      target: `cms:${PAGES_IDS.widgetBuilderModeSwitch}`,
      title: "Editor and Preview",
      description: "Editor shows the regions to work in. Preview gives a first impression of your changes without saving them -- a sketch, not exactly what a visitor will see.",
      placement: "bottom",
    },
    {
      key: "commands",
      target: `cms:${PAGES_IDS.widgetToolbar}`,
      title: "Saving and publishing",
      description: "Save keeps your changes as a draft, and Live preview opens the Page with it. Publish puts it live, and a new Page exists for visitors only from then on; publishing takes the Publisher role. Undo and Redo step through your changes, and Reset discards the draft without touching what is live.",
      placement: "bottom",
    },
    {
      key: "draft-status",
      target: `cms:${PAGES_IDS.widgetDraftStatus}`,
      title: "Where your changes stand",
      description: "What you change here is a draft. Visitors see the published Page until the draft is published.",
      placement: "bottom",
    },
  ],
} as const satisfies PhiTourDefinition;

const NAVIGATION_IDS = builderWorkspaceWidgetIds("builder-navigation-page");

/**
 * The Navigation workspace's Tour. What the workspace does not say is that a Site has several
 * navigations, that a Page is linked by dragging it across rather than by typing its path, and that the
 * items a Module brings stand in the same list as the Site's own.
 */
export const PHI_BUILDER_NAVIGATION_TOUR = {
  id: `${PHI_BUILDER_RUNTIME_MODULE_ID}/navigation`,
  version: 1,
  steps: [
    {
      key: "choice",
      target: `cms:${NAVIGATION_IDS.widgetNavigationItems}:filters`,
      title: "Which navigation",
      description: "A Site has more than one navigation -- the main menu, the one in the footer, a sider's. Everything below belongs to the one chosen here, and the plus beside it adds a new one under a key of its own.",
      placement: "bottom",
      ifMissing: "skip",
    },
    {
      key: "source",
      target: `cms:${NAVIGATION_IDS.widgetNavigationSource}`,
      title: "The Pages to link",
      description: "Every Page of the Area chosen above the list. Drag one into the navigation to link it, onto a container to put it inside; the link follows the Page wherever its path goes.",
      placement: "right",
    },
    {
      key: "items",
      target: `cms:${NAVIGATION_IDS.widgetNavigationItems}:header`,
      title: "What the navigation holds",
      description: "A row per item, in the order it is shown. Drag a row to move it, into a container to nest it. A click on a label or an icon changes it in place. Origin says whether the item is the Site's own or came with a Module.",
      placement: "bottom",
    },
    {
      key: "add",
      target: `cms:${NAVIGATION_IDS.widgetNavigationItems}:toolbar`,
      title: "Links, containers, separators",
      description: "Add link adds a link to an address outside the Site, written in its Path; a Page of the Site is linked by dragging it in. A container holds further items and opens as a group; a separator draws a line between them.",
      placement: "bottom",
      ifMissing: "skip",
    },
    {
      key: "row-actions",
      target: `cms:${NAVIGATION_IDS.widgetNavigationItems}:row-actions`,
      title: "Hiding and deleting",
      description: "A hidden item stays in the list and keeps its place, but visitors do not see it. Delete takes it out; Undo brings it back.",
      placement: "left",
      ifMissing: "skip",
    },
    {
      key: "commands",
      target: `cms:${NAVIGATION_IDS.widgetToolbar}`,
      title: "Saving and publishing",
      description: "Save keeps your changes as a draft, and Live preview shows the Site with it. Publish puts the navigation live; publishing takes the Publisher role. Undo and Redo step through your changes, and Reset discards the draft without touching what is live.",
      placement: "bottom",
    },
    {
      key: "draft-status",
      target: `cms:${NAVIGATION_IDS.widgetDraftStatus}`,
      title: "Where your changes stand",
      description: "What you change here is a draft. Visitors see the published navigation until the draft is published.",
      placement: "bottom",
    },
  ],
} as const satisfies PhiTourDefinition;
