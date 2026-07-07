// ─── Brand ───────────────────────────────────────────────────────────────────

export const BRAND_NAME = "Testify Network";
export const BRAND_TAGLINE = "Transparency • Community • Faith";
export const BRAND_DESCRIPTION =
  "Connecting donors and volunteers with trusted ministries making a difference in communities worldwide.";
export const BRAND_FOOTER = "A nonprofit transparency initiative.";
export const BRAND_YEAR = 2026;

// ─── App routes ──────────────────────────────────────────────────────────────

export const PATHS = {
  HOME: "/",
  SEARCH: "/search",
  MINISTRY: (id: string) => `/ministry/${id}`,
  MINISTRY_PATTERN: "/ministry/:id",
} as const;

// ─── API ─────────────────────────────────────────────────────────────────────

export const SERVER_PREFIX = "make-server-78e2f486";

export const API_ROUTES = {
  HEALTH: `/${SERVER_PREFIX}/health`,
  MINISTRIES: `/${SERVER_PREFIX}/ministries`,
  MINISTRY: (id: string) => `/${SERVER_PREFIX}/ministry/${encodeURIComponent(id)}`,
  MINISTRY_LEADER: (id: string) => `/${SERVER_PREFIX}/ministry/${encodeURIComponent(id)}/leader`,
} as const;

// ─── Database – Ministry Reports table ───────────────────────────────────────
// SOURCE OF TRUTH: supabase/functions/server/constants.ts
// The Vite (frontend) and Deno (server) runtimes cannot share modules, so these
// values are duplicated here for reference. If you change a value, change it in
// BOTH files to keep them in sync.

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
    IRS_REPORTS: "990s",
    ANNUAL_REPORTS: "annual_reports",
    MINISTRY_LEADER_NAME: "ministry_leader_name",
    MINISTRY_LEADER_EMAIL: "ministry_leader_email"
  },
} as const;

// ─── Ministry sidebar – connection checkboxes ─────────────────────────────────

export const CONNECTION_OPTIONS = [
  "Ministry Leader",
  "Ministry Representative",
  "Volunteer",
  "Donor",
  "Beneficiary",
] as const;

// ─── Ministry sidebar – testify status checkboxes ────────────────────────────

export const TESTIFY_OPTIONS = [
  "Follow",
  "Witness",
  "Advocate",
  "Moderator",
] as const;
