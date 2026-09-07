import type { PhiRuntimeModuleCategory } from "../../../constants/runtime-module-categories";

export type PhiBuilderModulesPageLabels = {
  columns: {
    active: string;
    title: string;
    description: string;
    category: string;
    eligibleAreas: string;
  };
  actions: {
    details: string;
  };
  footer: {
    modules: string;
  };
  categories: Record<PhiRuntimeModuleCategory, string>;
  areas: {
    public: string;
    app: string;
    admin: string;
    builder: string;
    editor: string;
    accounting: string;
  };
  detail: {
    title: string;
    field: string;
    value: string;
    moduleId: string;
    activeAreas: string;
    baseModule: string;
    yes: string;
    no: string;
  };
  filter: {
    area: string;
    allAreas: string;
    showFoundation: string;
  };
  /** The one question enabling a Module can ask: a Public address it wants is taken. */
  publicRoutes: {
    title: string;
    intro: string;
    page: string;
    wanted: string;
    heldBy: string;
    address: string;
    assign: string;
    cancel: string;
  };
};

export const PHI_BUILDER_MODULES_PAGE_DEFAULT_LABELS: PhiBuilderModulesPageLabels = {
  columns: {
    active: "Active",
    title: "Module",
    description: "Description",
    category: "Category",
    eligibleAreas: "Eligible areas",
  },
  actions: {
    details: "Details",
  },
  footer: {
    modules: "modules",
  },
  categories: {
    foundation: "Foundation",
    workspace: "Workspace",
    content: "Content",
    media: "Media",
    commerce: "Commerce",
    identity: "Identity",
    communication: "Communication",
    events: "Events",
    analytics: "Analytics",
    integration: "Integration",
    operations: "Operations",
    other: "Other",
  },
  areas: {
    public: "Public",
    app: "App",
    admin: "Admin",
    builder: "Builder",
    editor: "Editor",
    accounting: "Accounting",
  },
  detail: {
    title: "Module details",
    field: "Field",
    value: "Value",
    moduleId: "Module id",
    activeAreas: "Active areas",
    baseModule: "Area Base module",
    yes: "Yes",
    no: "No",
  },
  filter: {
    area: "Area",
    allAreas: "All areas",
    showFoundation: "Foundations",
  },
  publicRoutes: {
    title: "Public addresses are taken",
    intro:
      "This Module wants Public addresses that already answer. Give each one another address, or cancel and leave the Module switched off.",
    page: "Page",
    wanted: "Wanted",
    heldBy: "Taken by",
    address: "Address",
    assign: "Enable with these addresses",
    cancel: "Cancel",
  },
};
