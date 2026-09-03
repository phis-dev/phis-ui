import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "./ids";
import { PhiGroupMembershipFlags } from "../../../constants/site-groups";

/**
 * Groups and their members, as administration reads them.
 *
 * Two resources rather than one nested shape: a group row is what the Site administers, a membership
 * row is what a group's Manager administers, and the two carry different authority. The membership
 * level is the only mutable field -- everything else about a member belongs to their account.
 */
export const PHI_GROUPS_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.groupOptions,
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Site groups",
    description: "The Site's groups, for naming one in a form.",
  },
  {
    key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.myGroupOptions,
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "My groups",
    description: "The groups the actor manages, for a form that writes inside one of them.",
  },
  {
    key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.memberCandidates,
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Group member candidates",
    description: "The Site's users, for naming one when a membership is written.",
  },
  {
    key: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table,
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Groups",
    description: "Site groups, their members, and the Space each group shares.",
    resources: [
      {
        resourceKey: "groups",
        title: "Groups",
        rowIdentityPath: "id",
        fields: [
          { key: "id", title: "ID", type: "string", required: true },
          { key: "name", title: "Name", type: "string" },
          { key: "key", title: "Key", type: "string" },
          { key: "memberCount", title: "Members", type: "number" },
          { key: "manages", title: "Manages", type: "boolean" },
          {
            key: "showMemberCompany",
            title: "Show company",
            type: "boolean",
            mutable: true,
            mutableWhen: { match: "all", conditions: [
              { source: "row", valuePath: "manages", operator: "truthy" },
            ] },
          },
          { key: "providerId", title: "Source", type: "string" },
          // Whether the group is Core-owned. A group a Directory contributes has no state to write
          // here: it stops being asserted at its source.
          { key: "local", title: "Local", type: "boolean" },
          // Retirement is a command with consequences, not a value someone toggles in a cell, so it is
          // read here and written through an action that asks first.
          { key: "retired", title: "Retired", type: "boolean" },
          { key: "retiredAt", title: "Retired since", type: "datetime" },
          // The same state as a name, because a badge renders a name and not a flag. The page maps
          // these to the reader's language the way it maps the membership level.
          { key: "state", title: "State", type: "enum", options: [
            { value: "active", label: "In service" },
            { value: "retired", label: "Retired" },
          ] },
          { key: "spaceUsedBytes", title: "Space used", type: "number" },
          { key: "spaceQuotaBytes", title: "Space quota", type: "number" },
        ],
        query: { search: false, sorting: "none", pagination: "none" },
        actions: [
          { key: "refresh", title: "Refresh", scope: "resource" },
          { key: "create", title: "Create", scope: "resource", valueType: "json" },
          {
            key: "retire", title: "Retire", scope: "row",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "manages", operator: "falsy" },
              { source: "row", valuePath: "local", operator: "falsy" },
              { source: "row", valuePath: "retired", operator: "truthy" },
            ] },
            intent: "destructive",
            confirmation: "required",
          },
          /*
           * Only here, never on the App's own list: a retired group grants nothing, so it cannot appear
           * among the groups someone is in. The way back therefore sits where retired groups are
           * visible at all -- which is the Site-wide scope, and that scope is Developer or Admin.
           */
          {
            key: "reactivate", title: "Reactivate", scope: "row",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "local", operator: "falsy" },
              { source: "row", valuePath: "retired", operator: "falsy" },
            ] },
            confirmation: "required",
          },
        ],
      },
      {
        resourceKey: "myGroups",
        title: "My groups",
        rowIdentityPath: "id",
        fields: [
          { key: "id", title: "ID", type: "string", required: true },
          { key: "name", title: "Group", type: "string" },
          { key: "membershipFlags", title: "Level", type: "enum", options: [
            { value: String(PhiGroupMembershipFlags.Member), label: "Member" },
            { value: String(PhiGroupMembershipFlags.Author), label: "Author" },
            { value: String(PhiGroupMembershipFlags.Editor), label: "Editor" },
            { value: String(PhiGroupMembershipFlags.Manager), label: "Manager" },
          ] },
          { key: "canContribute", title: "May contribute", type: "boolean" },
          { key: "manages", title: "Manages", type: "boolean" },
          {
            key: "showMemberCompany",
            title: "Show company",
            type: "boolean",
            mutable: true,
            // A display decision the group's own Manager owns, and only for a group they manage.
            mutableWhen: { match: "all", conditions: [
              { source: "row", valuePath: "manages", operator: "truthy" },
            ] },
          },
          { key: "local", title: "Local", type: "boolean" },
          { key: "spaceUsedBytes", title: "Space used", type: "number" },
          { key: "spaceQuotaBytes", title: "Space quota", type: "number" },
        ],
        query: { search: false, sorting: "none", pagination: "none" },
        actions: [
          { key: "refresh", title: "Refresh", scope: "resource" },
          // A Manager runs the team and may end it. Putting one back is not offered here, because a
          // retired group is not in this list any more -- the level that would have allowed it is gone.
          {
            key: "retire", title: "Retire", scope: "row",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "manages", operator: "falsy" },
              { source: "row", valuePath: "local", operator: "falsy" },
            ] },
            intent: "destructive",
            confirmation: "required",
          },
        ],
      },
      {
        resourceKey: "groupMembers",
        title: "Members",
        // A membership is a pair, and the identity has to say both halves: a field edit carries no
        // query and an action carries no row, so nothing else would name the group.
        rowIdentityPath: "membershipKey",
        fields: [
          { key: "membershipKey", title: "Membership", type: "string", required: true },
          { key: "userId", title: "ID", type: "string" },
          { key: "displayName", title: "Name", type: "string" },
          { key: "email", title: "Email", type: "string" },
          // Absent from the answer unless the group shows it; declared so the App column can bind it.
          { key: "companyName", title: "Company", type: "string" },
          { key: "manageable", title: "Manageable", type: "boolean" },
          {
            key: "membershipFlags",
            title: "Level",
            // Enum rather than number: the level is a name a person picks, and only the three
            // cumulative values exist. The control plane normalizes anything else away.
            type: "enum",
            options: [
              { value: String(PhiGroupMembershipFlags.Member), label: "Member" },
              { value: String(PhiGroupMembershipFlags.Author), label: "Author" },
              { value: String(PhiGroupMembershipFlags.Editor), label: "Editor" },
              { value: String(PhiGroupMembershipFlags.Manager), label: "Manager" },
            ],
            mutable: true,
            /*
             * `manageable` is the control plane's answer, not a guess: it is true only where this actor
             * administers this group and the row is Core-owned. A row a Directory contributes is read
             * here and changed at its source.
             */
            mutableWhen: { match: "all", conditions: [
              { source: "row", valuePath: "manageable", operator: "truthy" },
            ] },
          },
          { key: "sourceProviderId", title: "Source", type: "string" },
          { key: "createdAt", title: "Since", type: "datetime" },
        ],
        query: { filterFields: ["groupId"], sorting: "none", pagination: "none" },
        actions: [
          {
            key: "delete", title: "Remove", scope: "row",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "manageable", operator: "falsy" },
            ] },
            intent: "destructive",
            confirmation: "required",
          },
        ],
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
