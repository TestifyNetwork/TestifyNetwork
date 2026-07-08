// ─── Brand ───────────────────────────────────────────────────────────────────

export const BRAND_NAME = "Testify Network";

// ─── API route prefix ─────────────────────────────────────────────────────────

export const SERVER_PREFIX = "make-server-78e2f486";

// ─── Database – Ministry Reports table ───────────────────────────────────────
// Mirrors src/app/constants.ts — keep in sync.

export const DB = {
  TABLE: "ministry_reports",
  COL: {
    ID: "ministry_id",
    NAME: "ministry_name",
    LOGO: "logo_url",
    LOCATION: "hq_location",
    MISSION: "mission",
    STATUS: "status",
    REPORT: "generated_report",
    CREATED_AT: "created_at",
    CITATIONS: "generated_citations",
    NRM_VERSION: "NRM_version",
    IRS_REPORTS: "irs_reports",
    ANNUAL_REPORTS: "annual_reports",
    MINISTRY_LEADER_NAME: "ministry_leader_name",
    MINISTRY_LEADER_EMAIL: "ministry_leader_email",
  },
} as const;