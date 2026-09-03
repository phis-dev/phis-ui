import { PHI_GROUPS_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/groups/ids";
import type {
  PhiFormDescriptor,
  PhiFormHandlerProviderDescriptor,
} from "../../../types";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { flattenPhiFormLabels } from "../../../components/forms/form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PhiGroupMembershipFlags } from "../../../constants/site-groups";

export const PHI_GROUPS_FORM_IDS = {
  create: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "groups/create"),
  membership: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "groups/membership"),
  myMembership: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "groups/my-membership"),
} as const;

export const PHI_GROUPS_FORM_HANDLER_KEYS = {
  create: "site.groups.create",
  membership: "site.groups.membership",
  myMembership: "site.groups.my-membership",
} as const;

const LABEL_SET_KEY = "@phis/ui/modules/groups/labels/forms" as const;
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);
const required = (key: string, fallback: string) => ([{
  providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
  message: label(key, fallback),
}] as const);

/**
 * Creating a group is Site administration, not group membership: a group is an authorization unit that
 * Pages, Navigation, and Assets refer to. The Core route this relays to enforces that -- the form only
 * carries the two values a group starts with.
 */
const PHI_GROUPS_CREATE_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_GROUPS_FORM_IDS.create,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    {
      key: "key",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("key", "Key"),
      description: label("keyHint", "The stable identifier a Module or a Page refers to."),
      validation: required("keyRequired", "A key is required."),
    },
    {
      key: "name",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("name", "Name"),
      description: label("nameHint", "The name members see."),
      validation: required("nameRequired", "A name is required."),
    },
  ],
  layout: {
    columns: { compact: 1, medium: 1, wide: 1 },
    gap: { compact: "sm", medium: "base" },
    labelPlacement: "side",
    labelAlign: "start",
  },
};

/**
 * Writing one membership.
 *
 * Every value is named explicitly, including the group: a Form relays to a fixed path, so it cannot
 * inherit the row a table happens to have selected.
 *
 * This adds a member. Someone already in the group is listed but not selectable here, because the level
 * they already hold is changed in the cell it is read in -- the route accepts either, but a control
 * that means one thing is better than one that quietly means two.
 */
const PHI_GROUPS_MEMBERSHIP_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_GROUPS_FORM_IDS.membership,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    {
      key: "groupId",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("membershipGroup", "Group"),
      optionsProvider: { providerKey: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.groupOptions },
      validation: required("membershipGroupRequired", "Choose a group."),
    },
    {
      key: "userId",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("membershipPerson", "Person"),
      optionsProvider: {
        providerKey: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.memberCandidates,
        // The route answers the search, so the control must not narrow the answer a second time.
        loadMode: "server",
        search: { enabled: true, minChars: 2 },
        /*
         * The people offered here depend on the group chosen above, so the answer can say who is
         * already in it. Required: without a group the list cannot mean anything, and it is why
         * choosing a different group clears this field rather than carrying a person over.
         */
        dependencies: [{ param: "groupId", source: "form", valuePath: "groupId", required: true }],
      },
      validation: required("membershipPersonRequired", "Choose a person."),
    },
    {
      key: "membershipFlags",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("membershipLevel", "Level"),
      options: [
        { value: String(PhiGroupMembershipFlags.Member), label: label("levelMember", "Member") },
        { value: String(PhiGroupMembershipFlags.Author), label: label("levelAuthor", "Author") },
        { value: String(PhiGroupMembershipFlags.Editor), label: label("levelEditor", "Editor") },
        { value: String(PhiGroupMembershipFlags.Manager), label: label("levelManager", "Manager") },
      ],
      initialValue: String(PhiGroupMembershipFlags.Member),
      validation: required("membershipLevelRequired", "Choose a level."),
    },
  ],
  layout: {
    columns: { compact: 1, medium: 1, wide: 1 },
    gap: { compact: "sm", medium: "base" },
    labelPlacement: "side",
    labelAlign: "start",
  },
};

/**
 * The same three values, written from inside the App.
 *
 * The group field offers only what this actor manages, and the people come from the group-manager
 * route rather than the Site's user list -- a Manager finds a colleague without being an administrator.
 */
const PHI_GROUPS_MY_MEMBERSHIP_FORM_DESCRIPTOR: PhiFormDescriptor = {
  ...PHI_GROUPS_MEMBERSHIP_FORM_DESCRIPTOR,
  key: PHI_GROUPS_FORM_IDS.myMembership,
  fields: PHI_GROUPS_MEMBERSHIP_FORM_DESCRIPTOR.fields.map((field) =>
    field.key === "groupId"
      ? { ...field, optionsProvider: { providerKey: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.myGroupOptions } }
      : field),
};

async function loadLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiGroupFormLabels } = await import("./labels");
  const labels = await getPhiGroupFormLabels({
    apiBaseUrl: context.runtime.phis.apiBaseUrl,
    internalToken: context.runtime.phis.internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    key: labels.fields.key,
    keyHint: labels.fields.keyHint,
    keyRequired: labels.fields.keyRequired,
    name: labels.fields.name,
    nameHint: labels.fields.nameHint,
    nameRequired: labels.fields.nameRequired,
    membershipGroup: labels.membership.group,
    membershipGroupRequired: labels.membership.groupRequired,
    membershipPerson: labels.membership.person,
    membershipPersonRequired: labels.membership.personRequired,
    membershipLevel: labels.membership.level,
    membershipLevelRequired: labels.membership.levelRequired,
    levelMember: labels.levels.member,
    levelAuthor: labels.levels.author,
    levelEditor: labels.levels.editor,
    levelManager: labels.levels.manager,
  });
}

export const PHI_GROUPS_RUNTIME_MODULE_FORMS = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    formId: PHI_GROUPS_FORM_IDS.create,
    version: 1,
    flags: 0,
    title: "Create group",
    description: "Create a Site group that Pages, Navigation, and Assets can refer to.",
    category: "forms",
    tags: ["groups", "create"],
    descriptor: PHI_GROUPS_CREATE_FORM_DESCRIPTOR,
    submitHandlerKey: PHI_GROUPS_FORM_HANDLER_KEYS.create,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    formId: PHI_GROUPS_FORM_IDS.membership,
    version: 1,
    flags: 0,
    title: "Add a member",
    description: "Write one membership: which group, which person, and at which level.",
    category: "forms",
    tags: ["groups", "members"],
    descriptor: PHI_GROUPS_MEMBERSHIP_FORM_DESCRIPTOR,
    submitHandlerKey: PHI_GROUPS_FORM_HANDLER_KEYS.membership,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels,
  }),
] as const;

export const PHI_GROUPS_APP_RUNTIME_MODULE_FORMS = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    formId: PHI_GROUPS_FORM_IDS.myMembership,
    version: 1,
    flags: 0,
    title: "Add a member",
    description: "Write one membership inside a group this actor manages.",
    category: "forms",
    tags: ["groups", "members"],
    descriptor: PHI_GROUPS_MY_MEMBERSHIP_FORM_DESCRIPTOR,
    submitHandlerKey: PHI_GROUPS_FORM_HANDLER_KEYS.myMembership,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels,
  }),
] as const;

export const PHI_GROUPS_FORM_HANDLER_PROVIDER_DESCRIPTORS = [
  {
    key: createPhiSharedFormProviderKey("handler", "groups-my-membership"),
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    title: "Write a membership in a group you manage",
    phase: "submit",
    handlerKey: PHI_GROUPS_FORM_HANDLER_KEYS.myMembership,
    category: "site",
    transport: "relay",
    method: "PUT",
    endpointKey: null,
    upstreamPath: "/api/site/groups",
    csrfPath: null,
    requiresCsrf: false,
    credentialPolicy: "site-session",
  },
  {
    key: createPhiSharedFormProviderKey("handler", "groups-membership"),
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    title: "Write a group membership",
    phase: "submit",
    handlerKey: PHI_GROUPS_FORM_HANDLER_KEYS.membership,
    category: "site",
    transport: "relay",
    method: "PUT",
    endpointKey: null,
    upstreamPath: "/api/site/groups",
    csrfPath: null,
    requiresCsrf: false,
    credentialPolicy: "site-session",
  },
  {
    key: createPhiSharedFormProviderKey("handler", "groups-create"),
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    title: "Create group",
    phase: "submit",
    handlerKey: PHI_GROUPS_FORM_HANDLER_KEYS.create,
    category: "site",
    transport: "relay",
    method: "POST",
    endpointKey: null,
    // The Site-session address for groups; who may create one is settled there.
    upstreamPath: "/api/site/groups",
    csrfPath: null,
    requiresCsrf: false,
    credentialPolicy: "site-session",
  },
] satisfies readonly PhiFormHandlerProviderDescriptor[];
