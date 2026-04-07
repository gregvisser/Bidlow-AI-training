export type StaleSeatNudgeOutcome = "sent" | "not_sent" | "bounced";

export type StaleSeatNudgeAuditStatusFilter = "all" | "pending" | StaleSeatNudgeOutcome;
