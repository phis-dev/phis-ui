import { describe, expect, it } from "vitest";

import { PhisThreadFlag, PhisThreadStatus } from "../../../../constants/threads";
import { readPhiThreadInboxActionBody, readPhiThreadInboxRow } from "./thread-inbox-table";

function row(input: { status?: number; flags?: number; unread?: boolean }) {
  return { id: 7, kind: 1, status: PhisThreadStatus.Open, flags: 0, unread: false, ...input };
}

describe("a conversation's row in the inbox", () => {
  it("says it is locked, as a yes for a row action and as the badge's name", () => {
    const locked = readPhiThreadInboxRow(row({ flags: PhisThreadFlag.Locked }));
    expect(locked.locked).toBe(true);
    expect(locked.state).toBe("locked");
    expect(readPhiThreadInboxRow(row({})).locked).toBe(false);
    expect(readPhiThreadInboxRow(row({})).state).toBe("open");
  });

  it("lets archived and unread win the one badge over the lock", () => {
    expect(readPhiThreadInboxRow(row({ flags: PhisThreadFlag.Locked, status: PhisThreadStatus.Archived })).state)
      .toBe("archived");
    expect(readPhiThreadInboxRow(row({ flags: PhisThreadFlag.Locked, unread: true })).state).toBe("unread");
  });
});

describe("a row action on a conversation", () => {
  it("writes what PATCH /api/site/threads/{id} takes", () => {
    expect(readPhiThreadInboxActionBody("archive")).toEqual({ status: PhisThreadStatus.Archived });
    expect(readPhiThreadInboxActionBody("reopen")).toEqual({ status: PhisThreadStatus.Open });
    expect(readPhiThreadInboxActionBody("lock")).toEqual({ locked: true });
    expect(readPhiThreadInboxActionBody("unlock")).toEqual({ locked: false });
    expect(readPhiThreadInboxActionBody("delete")).toBeNull();
  });
});
