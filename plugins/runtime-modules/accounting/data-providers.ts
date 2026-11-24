import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import type { PhiTableProviderFieldDefinition } from "../../../types/table-widget";
import {
  PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY,
  PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY,
  PHI_ACCOUNTING_RUNTIME_MODULE_ID,
} from "./ids";

const SALE_OPTIONS = [
  { value: "own", label: "Own" },
  { value: "referral", label: "Referral" },
  { value: "payout", label: "Payout" },
];

/**
 * The terms the operator releases (`PhisProductReleasedTerms`), once as they are in force and once as
 * they wait for the release, so a record can set the two side by side. A publisher's product never
 * released has nothing in force yet; the Site's own has nothing waiting.
 */
function termFields(prefix: "inForce" | "pending", title: string): PhiTableProviderFieldDefinition[] {
  return [
    { key: `${prefix}Sale`, title: `Sale (${title})`, type: "enum", options: SALE_OPTIONS },
    { key: `${prefix}ReferralUrl`, title: `Referral address (${title})`, type: "string" },
    { key: `${prefix}Free`, title: `Free (${title})`, type: "boolean" },
    { key: `${prefix}AccountRequired`, title: `Account required (${title})`, type: "boolean" },
    { key: `${prefix}Parts`, title: `Bundle parts (${title})`, type: "json" },
  ];
}

/**
 * The Site's product directory (phis-server SERVER_ADDONS.md, `products:v1`), as the operator
 * administers it: every product of every supplier Add-on, in every state.
 *
 * `live` and `authoringMode: "none"`: the Builder has no business reading a Site's products while somebody
 * composes a Page. The rows come from `GET /api/site/products` and the three acts go to
 * `POST /api/site/products/{id}/release|lock|unlock`, behind Core's Accounting guard; Core refuses them to
 * anybody else whatever a Table offers. Nothing a supplier says of its product -- title, summary, picture
 * -- is edited here: that stays the supplier's.
 */
export const PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY,
    ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Product directory",
    description: "The Site's product directory: every supplier's products, their terms and their state.",
    resources: [
      {
        resourceKey: PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY,
        title: "Products",
        rowIdentityPath: "id",
        fields: [
          { key: "id", title: "ID", type: "string", required: true },
          { key: "title", title: "Title", type: "string" },
          { key: "summary", title: "Summary", type: "string" },
          { key: "supplier", title: "Supplier", type: "string" },
          { key: "publisher", title: "Publisher", type: "string" },
          { key: "type", title: "Kind", type: "string" },
          {
            key: "state",
            title: "State",
            type: "enum",
            options: [
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "withdrawn", label: "Withdrawn" },
              { value: "locked", label: "Locked" },
            ],
          },
          // The state as a mark, for the two acts that each apply to one side of it.
          { key: "locked", title: "Locked", type: "boolean" },
          { key: "sale", title: "Sale", type: "enum", options: SALE_OPTIONS },
          { key: "referralUrl", title: "Referral address", type: "string" },
          { key: "free", title: "Free", type: "boolean" },
          { key: "accountRequired", title: "Account required", type: "boolean" },
          { key: "counted", title: "Counted", type: "boolean" },
          { key: "parts", title: "Bundle parts", type: "json" },
          { key: "partCount", title: "Bundle parts", type: "number" },
          { key: "released", title: "Released", type: "boolean" },
          // Never released, or released with terms pending: what the release acts on.
          { key: "awaitingRelease", title: "Terms waiting for release", type: "boolean" },
          ...termFields("inForce", "in force"),
          ...termFields("pending", "waiting for release"),
          { key: "imagePath", title: "Picture", type: "string" },
          { key: "iconPath", title: "Icon", type: "string" },
          // The same two as the server's small `icon` variant, ready for a line of the list.
          { key: "imageListPath", title: "Picture (list)", type: "string" },
          { key: "iconListPath", title: "Icon (list)", type: "string" },
          { key: "version", title: "Version", type: "number" },
        ],
        query: {
          search: true,
          filterFields: ["supplier", "state", "pendingTerms"],
          sorting: "none",
          pagination: "offset",
          total: true,
        },
        recordRead: true,
        actions: [
          {
            key: "release",
            title: "Release terms",
            scope: "row",
            intent: "write",
            confirmation: "required",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "awaitingRelease", operator: "falsy" },
            ] },
          },
          {
            key: "lock",
            title: "Lock",
            scope: "row",
            intent: "destructive",
            confirmation: "required",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "locked", operator: "truthy" },
            ] },
          },
          {
            key: "unlock",
            title: "Unlock",
            scope: "row",
            intent: "write",
            confirmation: "required",
            disabledWhen: { match: "any", conditions: [
              { source: "row", valuePath: "locked", operator: "falsy" },
            ] },
          },
        ],
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
