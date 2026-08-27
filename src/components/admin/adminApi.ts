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
    throw new Error(
      "Administrator access required."
    );
  }

  return user;
}
