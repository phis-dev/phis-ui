/*
 * The bit values and the close policies are the contract phis validates against, so they live in
 * `@phis/contracts/support` and are only carried through here, where the rest of the vocabulary a
 * surface needs at runtime already is. The declared-row types are in `types/seed.ts`.
 */
export {
  PHIS_SUPPORT_REQUESTER_WINDOW_DEFAULT_DAYS,
  PhisSupportClosePolicy,
  PhisSupportQueueFlag,
  PhisSupportTicketChannel,
  PhisSupportTicketPriority,
  PhisSupportTicketSeverity,
  PhisSupportTicketStatus,
  PhisSupportTicketTypeFlag,
} from "@phis/contracts/support";
export type {
  PhisSupportTicketChannelValue,
  PhisSupportTicketPriorityValue,
  PhisSupportTicketSeverityValue,
  PhisSupportTicketStatusValue,
} from "@phis/contracts/support";
