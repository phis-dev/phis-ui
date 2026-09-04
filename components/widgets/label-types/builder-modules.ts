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
    active: string;
    baseModule: string;
    yes: string;
    no: string;
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
    active: "Active in this Area",
    baseModule: "Area Base module",
    yes: "Yes",
    no: "No",
  },
};
