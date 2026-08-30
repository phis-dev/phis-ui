export type PhiEffectsWidgetLabels = {
  modalTitle: string;
  openEditor: string;
  add: string;
  cancel: string;
  save: string;
  removeTransition: string;
  removeViewportEffect: string;
  sections: {
    transparency: string;
    transitions: string;
    viewportEffects: string;
  };
  status: {
    off: string;
    configured: string;
    configuredPlural: string;
  };
  fields: {
    amount: string;
    trigger: string;
    once: string;
    type: string;
    mode: string;
    duration: string;
    delay: string;
    direction: string;
    distance: string;
    axis: string;
    angle: string;
    perspective: string;
    origin: string;
    scale: string;
    easing: string;
    property: string;
    from: string;
    to: string;
    unit: string;
    clamp: string;
    rangeStart: string;
    rangeEnd: string;
  };
  table: {
    number: string;
    transition: string;
    trigger: string;
    viewportEffect: string;
    emptyTransitions: string;
    emptyViewportEffects: string;
  };
  transitions: {
    fade: string;
    slide: string;
    flip: string;
    rotate: string;
    scale: string;
    in: string;
    out: string;
    onMount: string;
    onVisible: string;
    onHover: string;
    onFocus: string;
    manual: string;
  };
  directions: {
    top: string;
    topRight: string;
    right: string;
    bottomRight: string;
    bottom: string;
    bottomLeft: string;
    left: string;
    topLeft: string;
  };
  origins: {
    topLeft: string;
    topCenter: string;
    topRight: string;
    centerLeft: string;
    center: string;
    centerRight: string;
    bottomLeft: string;
    bottomCenter: string;
    bottomRight: string;
  };
  viewport: {
    x: string;
    y: string;
    translate: string;
    opacity: string;
    rotate: string;
    scale: string;
    enter: string;
    center: string;
    exit: string;
    unitNone: string;
  };
  easing: {
    linear: string;
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
};

export const PHI_EFFECTS_WIDGET_DEFAULT_LABELS: PhiEffectsWidgetLabels = {
  modalTitle: "Effects",
  openEditor: "Open effects editor",
  add: "Add",
  cancel: "Cancel",
  save: "Save",
  removeTransition: "Remove transition",
  removeViewportEffect: "Remove viewport effect",
  sections: {
    transparency: "Transparency",
    transitions: "Transitions",
    viewportEffects: "Viewport Effects",
  },
  status: {
    off: "Off",
    configured: "1 configured",
    configuredPlural: "{count} configured",
  },
  fields: {
    amount: "Amount",
    trigger: "Trigger",
    once: "Once",
    type: "Type",
    mode: "Mode",
    duration: "Duration",
    delay: "Delay",
    direction: "Direction",
    distance: "Distance",
    axis: "Axis",
    angle: "Angle",
    perspective: "Perspective",
    origin: "Origin",
    scale: "Scale",
    easing: "Easing",
    property: "Property",
    from: "From",
    to: "To",
    unit: "Unit",
    clamp: "Clamp",
    rangeStart: "Range start",
    rangeEnd: "Range end",
  },
  table: {
    number: "#",
    transition: "Transition",
    trigger: "Trigger",
    viewportEffect: "Viewport effect",
    emptyTransitions: "No transitions configured.",
    emptyViewportEffects: "No viewport effects configured.",
  },
  transitions: {
    fade: "Fade",
    slide: "Slide",
    flip: "Flip",
    rotate: "Rotate",
    scale: "Scale",
    in: "In",
    out: "Out",
    onMount: "On mount",
    onVisible: "On visible",
    onHover: "On hover",
    onFocus: "On focus",
    manual: "Manual",
  },
  directions: {
    top: "Top",
    topRight: "Top right",
    right: "Right",
    bottomRight: "Bottom right",
    bottom: "Bottom",
    bottomLeft: "Bottom left",
    left: "Left",
    topLeft: "Top left",
  },
  origins: {
    topLeft: "Top left",
    topCenter: "Top center",
    topRight: "Top right",
    centerLeft: "Center left",
    center: "Center",
    centerRight: "Center right",
    bottomLeft: "Bottom left",
    bottomCenter: "Bottom center",
    bottomRight: "Bottom right",
  },
  viewport: {
    x: "X",
    y: "Y",
    translate: "Translate",
    opacity: "Opacity",
    rotate: "Rotate",
    scale: "Scale",
    enter: "Enter",
    center: "Center",
    exit: "Exit",
    unitNone: "none",
  },
  easing: {
    linear: "Linear",
    ease: "Ease",
    easeIn: "Ease in",
    easeOut: "Ease out",
    easeInOut: "Ease in out",
  },
};
