import {
  buildPhiTablePageParams,
  readPhiTableStringFilter,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
import type { PhiTableQuery } from "../../../../types/table-widget";

/**
 * The users route's query for one Table page: the page, the search, the filters and the sort. Apart from
 * the Provider so what the Table asks the Core can be read without a request.
 *
 * The Add-on role filter holds an Add-on id and is sent as the Core's `addonId` alone: whoever holds any role
 * of that Add-on. The Core's `addonRole` is not asked for.
 */
export function buildPhiUserManagementUsersQueryParams(query: PhiTableQuery) {
  const params = buildPhiTablePageParams(query, 20);
  const search = query.search?.trim() ?? "";
  const accountType = readPhiTableStringFilter(query, "accountType");
  const addonId = readPhiTableStringFilter(query, "addonRole");
  const enabled = readPhiTableStringFilter(query, "enabled");
  if (search) params.set("search", search);
  if (accountType) params.set("accountType", accountType);
  if (addonId) params.set("addonId", addonId);
  if (enabled) params.set("enabled", enabled);
  const primarySort = query.sorts?.[0];
  if (primarySort) {
    params.set("sortKey", primarySort.key);
    params.set("sortOrder", primarySort.direction === "descending" ? "descend" : "ascend");
  }
  return params;
}
