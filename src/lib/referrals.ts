import { supabase } from "./supabase";

export type ReferralSummary = {
  referralCode: string;
  referralLink: string;
  invited: number;
  rewarded: number;
  totalEarned: number;
  pending: number;
};

export async function getReferralSummary(): Promise<ReferralSummary> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error("You must be logged in.");

  const { data: profile, error: profileError } = await supabase
    .from("cdh_user_profiles")
    .select("referral_code")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);

  const { data: referrals, error: referralError } = await supabase
    .from("cdh_referrals")
    .select("id,status")
    .eq("referrer_id", user.id);
  if (referralError) throw new Error(referralError.message);

  const referralIds = (referrals ?? []).map(r => r.id);
  let totalEarned = 0;
  if (referralIds.length) {
    const { data: rewards, error: rewardsError } = await supabase
      .from("cdh_referral_rewards")
      .select("referrer_reward")
      .in("referral_id", referralIds);
    if (rewardsError) throw new Error(rewardsError.message);
    totalEarned = (rewards ?? []).reduce((sum, row) => sum + Number(row.referrer_reward ?? 0), 0);
  }

  const referralCode = String(profile?.referral_code ?? "").trim();
  return {
    referralCode,
    referralLink: `${window.location.origin}/?ref=${encodeURIComponent(referralCode)}`,
    invited: referrals?.length ?? 0,
    rewarded: (referrals ?? []).filter(r => r.status === "rewarded").length,
    pending: (referrals ?? []).filter(r => r.status === "pending").length,
    totalEarned,
  };
}

export async function getMyReferralHistory() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");
  const { data, error } = await supabase
    .from("cdh_referrals")
    .select("id,status,created_at,rewarded_at,referral_code")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
