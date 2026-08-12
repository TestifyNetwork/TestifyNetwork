// add_ministry fetches the Nonprofit Research Model instructions doc from a
// hardcoded public storage URL before generating a report.
import { http, HttpResponse } from "msw";

export const NRM_URL =
  "https://fyngtvccgxbbyjvckdcf.supabase.co/storage/v1/object/public/nonprofit_research_models/NRM_v1_4_spec.md";

export function createNrmHandler(body = "# Nonprofit Research Model\nTest instructions.") {
  return http.get(NRM_URL, () => new HttpResponse(body, { status: 200 }));
}
