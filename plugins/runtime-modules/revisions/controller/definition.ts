import {
  PHI_SIGNAL_VALUE_SCHEMAS,
} from "../../../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import { PHI_REVISIONS_CONTROLLER_KEY,
  PHI_REVISIONS_CONTROLLER_PLUGIN_KEY } from "../controller/address";

export type PhiRevisionsControllerConfig = Record<string, never>;

export const PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_REVISIONS_CONTROLLER_PLUGIN_KEY,
  key: PHI_REVISIONS_CONTROLLER_KEY,
  title: "Revisions Controller",
  description: "Module owner for revision scope, history, restore, deletion, and status coordination.",
  iconFamily: "revisions",
  allowedMountScopes: ["area"],
  runtimeSignals: {
    emits: [
      {
        id: "bindingParamsChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams,
      },
      {
        id: "draftStatus",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
      },
    ],
    listens: [{
      id: "tableMutation",
      channel: "mutation",
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableMutation,
    }, {
      id: "bindingParamsChange",
      channel: "bindingParams",
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams,
    }, {
      id: "areaSelection",
      channel: "areaSelection",
      action: "change",
      valueType: "string",
    }, {
      /*
       * The Builder's toolbar used to carry `restorePreset` beside its everyday commands, where the one
       * irreversible act in the workspace sat one button away from "undo". It lives here instead,
       * because this is where a Site's stored history is looked at and thrown away.
       */
      id: "command",
      channel: "command",
      action: "activate",
      valueType: "string",
    }, {
      /* The typed Area key, handed over by the delete Form in signal mode rather than a gateway. */
      id: "formValues",
      channel: "formValues",
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
    }],
  },
  defaultConfig: {},
  parseConfig: (): PhiRevisionsControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<PhiRevisionsControllerConfig>;
