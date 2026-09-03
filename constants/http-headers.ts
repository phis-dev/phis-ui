/**
 * The request header names, re-exported from the one place that defines them.
 *
 * The names live in `@phis/contracts/http`, because this package writes the headers phis reads and a
 * disagreement between the two is a runtime 403 rather than a build failure. They are re-exported here
 * so site repositories can reach them through `@phis/ui/constants` like every other shared constant.
 */

export {
  PHIS_AREA_HEADER,
  PHIS_REQUEST_PATH_HEADER,
  PHIS_REQUEST_SEARCH_HEADER,
  PHIS_SITE_KEY_HEADER,
  PHIS_TOKEN_HEADER,
} from "@phis/contracts/http";
