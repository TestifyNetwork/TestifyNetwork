// Step 3 (participation guidelines + ToS/Privacy) and Step 4 (statement of
// faith) — fetching the current version of each and recording affirmation.
import type { AgreementType, Client, MemberAgreementRow, Result } from "./types";
import { err, ok } from "./types";

export async function getCurrentAgreement(
  client: Client,
  kind: AgreementType,
): Promise<Result<MemberAgreementRow, "not_found">> {
  const { data, error } = await client
    .from("member_agreements")
    .select("*")
    .eq("agreement_type", kind)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getCurrentAgreement failed: ${error.message}`);
  if (!data) return err("not_found");
  return ok(data);
}

export async function acknowledgeAgreement(
  client: Client,
  params: { userId: string; agreementId: string; ipAddress?: string },
): Promise<Result<void, "already_acknowledged">> {
  const { data: existing, error: selectError } = await client
    .from("user_agreement_acknowledgments")
    .select("ack_id")
    .eq("user_id", params.userId)
    .eq("agreement_id", params.agreementId)
    .maybeSingle();
  if (selectError) throw new Error(`acknowledgeAgreement failed: ${selectError.message}`);
  if (existing) return err("already_acknowledged");

  const { error: insertError } = await client.from("user_agreement_acknowledgments").insert({
    user_id: params.userId,
    agreement_id: params.agreementId,
    ip_address: params.ipAddress ?? null,
  });
  if (insertError) throw new Error(`acknowledgeAgreement failed: ${insertError.message}`);

  return ok(undefined);
}
