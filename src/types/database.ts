// Auto-derived from live Supabase schema — project: fyngtvccgxbbyjvckdcf
// Regenerate by querying: GET /rest/v1/ministry_reports?limit=1
// Last synced: 2026-06-23

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      ministry_reports: {
        Row: MinistryReport;
        Insert: MinistryReportInsert;
        Update: MinistryReportUpdate;
      };
    };
  };
}

/** Full row returned from ministry_reports */
export interface MinistryReport {
  ministry_id: string;           // uuid, primary key
  created_at: string;            // timestamptz
  ministry_name: string;         // text, unique, not null
  logo_url: string | null;       // text
  hq_location: string | null;    // text
  mission: string | null;        // text
  status: string | null;         // text
  generated_report: string | null;     // text (markdown)
  generated_citations: string[] | null; // text[]
}

/** Subset returned by the /ministries list endpoint */
export type MinistryListItem = Pick<
  MinistryReport,
  "ministry_id" | "ministry_name" | "logo_url" | "hq_location" | "mission"
>;

/** Subset returned by the /ministry/:id detail endpoint */
export type MinistryDetail = Pick<
  MinistryReport,
  | "ministry_id"
  | "ministry_name"
  | "logo_url"
  | "hq_location"
  | "mission"
  | "generated_report"
  | "generated_citations"
>;

export type MinistryReportInsert = Omit<MinistryReport, "ministry_id" | "created_at">;
export type MinistryReportUpdate = Partial<MinistryReportInsert>;
