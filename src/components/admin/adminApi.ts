async function requireAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      `Unable to verify login: ${userError.message}`
    );
  }

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data, error } = await supabase
    .from("cdh_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to verify administrator access: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Administrator access required.");
  }

  return user;
}

export type AdminUser = {
  user_id: string;
  is_active?: boolean;
};

export async function getAdminUsers(): Promise<AdminUser[]> {
  await requireAdmin();

  const { data, error } = await supabase
    .from("cdh_admins")
    .select("user_id, is_active")
    .order("user_id", { ascending: true });

  if (error) {
    throw new Error(
      `Unable to load administrator users: ${error.message}`
    );
  }

  return data ?? [];
}
