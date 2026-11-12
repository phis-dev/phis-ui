import { PhiGroupMembershipFlags } from "../../../../constants/site-groups";
import type {
  PhiTableActionDefinition,
  PhiTableColumnDefinition,
  PhiTableFooterConfig,
  PhiTableToolsConfig,
  PhiTableWidgetFeatures,
  PhiTableWidgetPresentation,
} from "../../../../types/table-widget";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import type { getPhiGroupFormLabels } from "../labels";

/*
 * What the two Groups Pages have in common, written once.
 *
 * Administration lists every group of the Site and the App lists the reader's own, so the Pages are two
 * and stay two -- but both show a group's members from the same resource, both offer the same switches
 * on a group and both count their rows. Those parts lived in each Page Tree and drifted: the App's
 * tables had no footer because only the other copy was given one.
 */

type PhiGroupLabels = Awaited<ReturnType<typeof getPhiGroupFormLabels>>;

type PhiGroupRowCondition = { valuePath: string; operator: "truthy" | "falsy" };

/** A membership level as the word the reader knows it by, for a badge and for the level editor. */
export function buildPhiGroupLevelValueMap(labels: PhiGroupLabels): Record<string, string> {
  return {
    [String(PhiGroupMembershipFlags.Member)]: labels.levels.member,
    [String(PhiGroupMembershipFlags.Author)]: labels.levels.author,
    [String(PhiGroupMembershipFlags.Editor)]: labels.levels.editor,
    [String(PhiGroupMembershipFlags.Manager)]: labels.levels.manager,
  };
}

/** The switches someone who manages a group sets on it, each with its hint behind the heading. */
export function buildPhiGroupSettingColumns(labels: PhiGroupLabels): PhiTableColumnDefinition[] {
  const setting = (key: string, title: string, description: string): PhiTableColumnDefinition => ({
    key,
    fieldKey: key,
    title,
    description,
    renderer: "switch",
    editor: { control: "switch" },
    sizing: { mode: "content" },
  });
  return [
    setting("showMemberCompany", labels.columns.showCompany, labels.columns.showCompanyHint),
    setting("threads", labels.columns.threads, labels.columns.threadsHint),
    setting("crossGroupThreads", labels.columns.crossGroupThreads, labels.columns.crossGroupThreadsHint),
  ];
}

/** How many groups the list holds, under it. */
export function buildPhiGroupsFooter(labels: PhiGroupLabels): PhiTableFooterConfig {
  return {
    template: labels.groups.footer,
    values: [{ key: "groups", value: { source: "core", fieldKey: "totalRows" } }],
    align: "start",
  };
}

/**
 * Ending a group, from its row. `blockedWhen` names what makes a row one this reader cannot end -- the
 * two Pages differ in that and in nothing else about the action.
 */
export function buildPhiGroupRetireAction(
  labels: PhiGroupLabels,
  blockedWhen: readonly PhiGroupRowCondition[],
): PhiTableActionDefinition {
  return {
    key: "retire",
    label: labels.actions.retire,
    icon: "antd:stop",
    display: "icon",
    mode: "danger",
    execution: "provider",
    disabledWhen: {
      match: "any",
      conditions: blockedWhen.map((condition) => ({
        source: "row" as const,
        ...condition,
        reason: labels.actions.retire,
      })),
    },
    confirm: {
      title: labels.actions.retireConfirmTitle,
      description: labels.actions.retireConfirmText,
      okText: labels.actions.retireConfirmOk,
      cancelText: labels.actions.removeConfirmCancel,
    },
  };
}

/**
 * The members of the selected group: source, presentation and features of the Table. The Page adds
 * its own signal routes, because whom the Table speaks to is the Page's arrangement.
 *
 * `audience` is the one real difference. `colleagues` is what a member sees of the others -- a name, a
 * level, the company where the group shows it; no address and no source, because a colleague is
 * recognized by name and where a membership comes from is an administration question. There a row may
 * be removed where the control plane says this reader administers the group (`manageable`).
 * `administration` adds address, source and date, and removes any membership the Site itself holds
 * (`local`); one a Directory contributes is read here and changed at its source.
 *
 * The level is edited in the cell it is read in on both: the provider states per row, through the
 * field's `mutableWhen`, whether this reader may -- a member sees the same table without an editor.
 */
export function buildPhiGroupMembersTable({
  labels,
  audience,
  tools,
  toolbar,
}: {
  labels: PhiGroupLabels;
  audience: "colleagues" | "administration";
  tools?: PhiTableToolsConfig;
  toolbar?: PhiTableActionDefinition[];
}): {
  source: { providerKey: string; resourceKey: string };
  presentation: PhiTableWidgetPresentation;
  features: PhiTableWidgetFeatures;
} {
  const administration = audience === "administration";
  const columns: PhiTableColumnDefinition[] = [
    { key: "displayName", fieldKey: "displayName", title: labels.columns.name, sizing: { mode: "fill", minWidth: 200 } },
    administration
      ? { key: "email", fieldKey: "email", title: labels.columns.email, sizing: { mode: "content" } }
      : { key: "companyName", fieldKey: "companyName", title: labels.columns.company, sizing: { mode: "content" } },
    {
      key: "membershipFlags",
      fieldKey: "membershipFlags",
      title: labels.columns.level,
      renderer: "badge",
      valueMap: buildPhiGroupLevelValueMap(labels),
      editor: { control: "select" },
      sizing: { mode: "content" },
    },
    ...(administration ? [
      { key: "sourceProviderId", fieldKey: "sourceProviderId", title: labels.columns.source, renderer: "badge", sizing: { mode: "content" } },
      { key: "createdAt", fieldKey: "createdAt", title: labels.columns.since, renderer: "datetime", sizing: { mode: "content" } },
    ] satisfies PhiTableColumnDefinition[] : []),
  ];
  return {
    source: {
      providerKey: PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table,
      resourceKey: "groupMembers",
    },
    presentation: {
      title: labels.members.title,
      description: labels.members.description,
      layout: { mode: "auto", overflowX: "auto" },
      controlSize: "small",
      columns,
      emptyState: { title: labels.members.empty, description: "" },
      footer: {
        template: labels.members.footer,
        values: [{ key: "members", value: { source: "core", fieldKey: "totalRows" } }],
        align: "start",
      },
    },
    features: {
      pagination: { enabled: true, pageSize: 25, pageSizes: [25, 50, 100] },
      sorting: { mode: "none" },
      search: { enabled: false },
      ...(tools ? { tools } : {}),
      editing: { mode: "cell" },
      actions: {
        rowLayout: "compact",
        ...(toolbar ? { toolbar } : {}),
        row: [{
          key: "delete",
          label: labels.actions.remove,
          icon: "antd:delete",
          display: "icon",
          mode: "danger",
          execution: "provider",
          disabledWhen: { match: "any", conditions: [{
            source: "row",
            valuePath: administration ? "local" : "manageable",
            operator: "falsy",
            reason: labels.actions.remove,
          }] },
          confirm: {
            title: labels.actions.removeConfirmTitle,
            description: labels.actions.removeConfirmText,
            okText: labels.actions.removeConfirmOk,
            cancelText: labels.actions.removeConfirmCancel,
          },
        }],
      },
    },
  };
}
