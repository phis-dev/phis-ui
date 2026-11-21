import { describe, expect, it } from "vitest";

import {
  readPhiCmsNodeVisibleWhen,
  readPhiCmsServerPageConditionState,
  resolvePhiCmsNodeVisibility,
  settlePhiCmsNodeRecordConditions,
} from "./cms-node-visibility";
import {
  evaluatePhiRuntimeConditionExpression,
  type PhiRuntimeConditionExpression,
} from "../types/runtime-condition";
import { createPhiSignalAddress } from "../types/signals";
import { readPhiCmsInstanceId } from "../types/cms-instance-id";

const withoutToken = {
  source: "page",
  valuePath: "query.token",
  operator: "falsy",
} as const satisfies PhiRuntimeConditionExpression;

const withToken = {
  source: "page",
  valuePath: "query.token",
  operator: "truthy",
} as const satisfies PhiRuntimeConditionExpression;

const previewIsPending = {
  source: "widget",
  widgetAddress: createPhiSignalAddress("cms", readPhiCmsInstanceId("EQFllPq86opL1uN1")!),
  valuePath: "status",
  operator: "equals",
  value: "pending",
} as const satisfies PhiRuntimeConditionExpression;

/*
 * The distinction the whole two-stage decision rests on: a query nobody reported is not an empty query.
 *
 * Treating the two alike is what would let the server decide a stage wrongly -- a reset link arriving
 * with its token would be shown the form that asks for an email, because "no token was reported" had
 * been read as "there is no token".
 */
describe("readPhiCmsServerPageConditionState", () => {
  it("reports an empty query as an answer", () => {
    expect(readPhiCmsServerPageConditionState({
      page: { path: "/reset-password", pageType: 0 },
      request: { searchParams: {} },
    })).toEqual({ path: "/reset-password", query: {} });
  });

  it("reports an unknown query as no answer at all", () => {
    expect(readPhiCmsServerPageConditionState({
      page: { path: "/reset-password", pageType: 0 },
      request: undefined,
    })).toBeNull();
  });
});

describe("resolvePhiCmsNodeVisibility", () => {
  const page = { path: "/reset-password", query: { token: "abc" } };
  const pageWithoutQuery = { path: "/reset-password", query: {} };

  it("renders a node with no condition without a gate", () => {
    expect(resolvePhiCmsNodeVisibility(null, page)).toBe("render");
  });

  it("drops a node the request already rules out", () => {
    expect(resolvePhiCmsNodeVisibility(withoutToken, page)).toBe("omit");
    expect(resolvePhiCmsNodeVisibility(withToken, pageWithoutQuery)).toBe("omit");
  });

  it("renders a node the request already settles, with no gate around it", () => {
    expect(resolvePhiCmsNodeVisibility(withToken, page)).toBe("render");
    expect(resolvePhiCmsNodeVisibility(withoutToken, pageWithoutQuery)).toBe("render");
  });

  it("gates what only the browser can answer", () => {
    expect(resolvePhiCmsNodeVisibility(previewIsPending, page)).toBe("gate");
  });

  it("gates rather than guesses when the query was never reported", () => {
    expect(resolvePhiCmsNodeVisibility(withoutToken, null)).toBe("gate");
    expect(resolvePhiCmsNodeVisibility(withToken, null)).toBe("gate");
  });

  /*
   * A group is settled on the server as soon as the server's half of it decides the whole: `all` needs
   * only one refusal, and until then the browser's half still has to be waited for.
   */
  it("settles a group when the server's half of it is enough", () => {
    const both = {
      match: "all",
      conditions: [withToken, previewIsPending],
    } as const satisfies PhiRuntimeConditionExpression;

    expect(resolvePhiCmsNodeVisibility(both, pageWithoutQuery)).toBe("omit");
    expect(resolvePhiCmsNodeVisibility(both, page)).toBe("gate");
  });
});

describe("readPhiCmsNodeVisibleWhen", () => {
  it("reads a condition off the node's own config", () => {
    expect(readPhiCmsNodeVisibleWhen({ visibleWhen: withToken })).toEqual(withToken);
  });

  it("treats an unreadable condition as none, so the node stays visible", () => {
    expect(readPhiCmsNodeVisibleWhen({ visibleWhen: { source: "page" } })).toBeNull();
    expect(readPhiCmsNodeVisibleWhen({})).toBeNull();
  });
});

const passwordEnabled = {
  source: "feature",
  valuePath: "auth.password",
  operator: "truthy",
} as const satisfies PhiRuntimeConditionExpression;

/*
 * A fact the Site was configured with, settled before anything renders.
 *
 * The case that matters most is the one where nobody could answer: a sign-in method whose configuration
 * could not be read is not a method to offer, so an unreported namespace has to hide what it guards
 * rather than reveal it.
 */
describe("resolvePhiCmsNodeVisibility with features", () => {
  const page = { path: "/login", query: {} };

  it("renders what the Site is configured for", () => {
    expect(resolvePhiCmsNodeVisibility(passwordEnabled, page, { auth: { password: true } }))
      .toBe("render");
  });

  it("drops what the Site is configured against", () => {
    expect(resolvePhiCmsNodeVisibility(passwordEnabled, page, { auth: { password: false } }))
      .toBe("omit");
  });

  /*
   * A namespace missing from the answer means the Module could not be asked -- its resolver threw and
   * was left out. The node then goes, rather than waiting for a browser that has no way to find out
   * either: offering a sign-in method whose configuration could not be read is the worse of the two.
   */
  it("drops the node when the Module could not answer at all", () => {
    expect(resolvePhiCmsNodeVisibility(passwordEnabled, page, {})).toBe("omit");
  });

  it("gates when no namespace was resolved for this render", () => {
    expect(resolvePhiCmsNodeVisibility(passwordEnabled, page, null)).toBe("gate");
  });
});

/*
 * A Widget that has not spoken yet is the ordinary state of a page that just opened, and a condition may
 * say how to read it. That instruction belongs to the browser: on the server nobody has spoken about
 * anything, so honouring it there would settle a node without the gate that was going to hear the answer.
 */
describe("resolvePhiCmsNodeVisibility with a fallback for silent senders", () => {
  const page = { path: "/login", query: {} };
  const noWorkflowRunning = {
    source: "widget",
    widgetAddress: createPhiSignalAddress("cms", readPhiCmsInstanceId("EQFllPq86opL1uN1")!),
    valuePath: "active",
    operator: "falsy",
    whenUnavailable: "matched",
  } as const satisfies PhiRuntimeConditionExpression;

  it("still gates, rather than settling what the browser was going to answer", () => {
    expect(resolvePhiCmsNodeVisibility(noWorkflowRunning, page)).toBe("gate");
  });

  it("reads the fallback where it applies, which is in the browser", () => {
    expect(evaluatePhiRuntimeConditionExpression(noWorkflowRunning, { widgets: {} }))
      .toBe("matched");
    expect(evaluatePhiRuntimeConditionExpression(noWorkflowRunning, {
      widgets: { [noWorkflowRunning.widgetAddress]: { active: true } },
    })).toBe("not-matched");
  });
});

const hasIcon = {
  source: "record",
  valuePath: "icon",
  operator: "truthy",
} as const satisfies PhiRuntimeConditionExpression;

/*
 * The record the Page is about, which the server reads before anything renders and the browser never sees.
 *
 * A Widget bound to a field the record lacks draws nothing, but its frame stays in the slot and the gap
 * stands around it. Asked on the node instead, the question is answered before the node is drawn, and a
 * node that is not to be there is left out with its frame -- so the answer may never wait for a browser
 * that cannot give it.
 */
describe("settlePhiCmsNodeRecordConditions", () => {
  const icon = { src: "https://cdn.example/icon.svg", alt: "" };
  const live = (fields: Record<string, unknown> | null) => ({ fields, live: true });
  const canvas = (fields: Record<string, unknown> | null) => ({ fields, live: false });

  it("keeps a node whose record has the field, with no condition left to ask", () => {
    expect(settlePhiCmsNodeRecordConditions(hasIcon, live({ icon }))).toBeNull();
  });

  it("leaves a node out whose record lacks the field", () => {
    expect(settlePhiCmsNodeRecordConditions(hasIcon, live({ title: "Chair" }))).toBe(false);
    expect(settlePhiCmsNodeRecordConditions(hasIcon, live({}))).toBe(false);
  });

  it("reads a field as the value a recordField reads, a part of it by its path", () => {
    expect(settlePhiCmsNodeRecordConditions(
      { source: "record", valuePath: "icon.src", operator: "contains", value: ".svg" },
      live({ icon }),
    )).toBeNull();
    expect(settlePhiCmsNodeRecordConditions(
      { source: "record", valuePath: "icon", operator: "falsy" },
      live({}),
    )).toBeNull();
  });

  it("leaves the node out of a live Page that is about no record, whatever the operator", () => {
    expect(settlePhiCmsNodeRecordConditions(hasIcon, live(null))).toBe(false);
    expect(settlePhiCmsNodeRecordConditions({ ...hasIcon, operator: "falsy" }, live(null))).toBe(false);
  });

  // A template open in the Builder without a record is still to be edited; its Widgets show their own content.
  it("draws the node where no record is at hand outside the live Site", () => {
    expect(settlePhiCmsNodeRecordConditions(hasIcon, canvas(null))).toBeNull();
  });

  it("judges a Preview by the sample record it has", () => {
    expect(settlePhiCmsNodeRecordConditions(hasIcon, canvas({ icon }))).toBeNull();
    expect(settlePhiCmsNodeRecordConditions(hasIcon, canvas({}))).toBe(false);
  });

  it("hands a condition that does not read the record on as it is", () => {
    expect(settlePhiCmsNodeRecordConditions(withToken, live(null))).toBe(withToken);
    expect(settlePhiCmsNodeRecordConditions(null, live(null))).toBeNull();
  });

  /*
   * The gate gets what is left once the record has answered. Handed the record part, it would wait for a
   * source it has no way to read, and the node would never appear.
   */
  it("takes the record out of a group, leaving the browser's half for the gate", () => {
    const iconAndPending = { match: "all", conditions: [hasIcon, previewIsPending] } as const;
    expect(settlePhiCmsNodeRecordConditions(iconAndPending, live({ icon }))).toEqual(previewIsPending);
    expect(settlePhiCmsNodeRecordConditions(iconAndPending, live({}))).toBe(false);

    const iconOrPending = { match: "any", conditions: [hasIcon, previewIsPending] } as const;
    expect(settlePhiCmsNodeRecordConditions(iconOrPending, live({ icon }))).toBeNull();
    expect(settlePhiCmsNodeRecordConditions(iconOrPending, live({}))).toEqual(previewIsPending);

    const remaining = settlePhiCmsNodeRecordConditions(
      { match: "all", conditions: [hasIcon, previewIsPending, withToken] },
      live({ icon }),
    );
    expect(remaining).toEqual({ match: "all", conditions: [previewIsPending, withToken] });
    expect(resolvePhiCmsNodeVisibility(remaining || null, { path: "/p/chair", query: {} })).toBe("omit");
  });

  it("settles a group the record answers alone", () => {
    expect(settlePhiCmsNodeRecordConditions(
      { match: "any", conditions: [hasIcon, { source: "record", valuePath: "pictures", operator: "truthy" }] },
      live({ title: "Chair" }),
    )).toBe(false);
    expect(settlePhiCmsNodeRecordConditions(
      { match: "all", conditions: [hasIcon, { source: "record", valuePath: "title", operator: "truthy" }] },
      live({ icon, title: "Chair" }),
    )).toBeNull();
  });

  it("reads a record condition off the node's config like any other", () => {
    expect(readPhiCmsNodeVisibleWhen({ visibleWhen: hasIcon })).toEqual(hasIcon);
  });
});
