import { PhisThreadFlag, PhisThreadStatus } from "../constants/threads";

/**
 * What a cell shows and what a condition reads, neither of which is a flag.
 *
 * `state` is the name a badge draws and `archived` and `locked` the answers a row action asks for; the
 * enum values are strings because that is what an enum column and a condition compare against. The
 * status itself stays on the row, because the filter above is written against what the route takes.
 *
 * One badge, so one state wins: archived over everything, then unread -- a message waiting to be read is
 * what the reader acts on, and a lock is read in the conversation once it is open -- then locked.
 *
 * Foundation, because two listings read Core's inbox rows: Core's thread inbox and the threads Module's
 * customer file.
 */
export function readPhiThreadInboxRow(row: Record<string, unknown>) {
  const archived = row.status === PhisThreadStatus.Archived;
  const locked = typeof row.flags === "number" && (row.flags & PhisThreadFlag.Locked) !== 0;
  return {
    ...row,
    kind: String(row.kind),
    status: String(row.status),
    archived,
    locked,
    state: archived ? "archived" : row.unread === true ? "unread" : locked ? "locked" : "open",
  };
}
