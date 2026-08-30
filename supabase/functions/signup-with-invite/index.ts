// Invite-only signup. Creates the account, profile, and granted balance in one
// server-side step so the invite gate cannot be skipped from the browser.
//
// Deploy with JWT verification DISABLED -- the caller has no session yet:
//   supabase functions deploy signup-with-invite --no-verify-jwt
//
// Turn OFF public signup in the Supabase dashboard (Authentication -> Sign In /
// Providers -> disable "Allow new users to sign up"). Without that, anyone can
// still call auth.signUp directly and bypass this entirely.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let claimedCode: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const username = String(body.username ?? "").trim().toLowerCase();
    // Codes are stored uppercase so they're case-insensitive to type.
    const code = String(body.code ?? "").trim().toUpperCase();

    if (!email.includes("@")) return json({ error: "Enter a valid email." }, 400);
    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters." }, 400);
    }
    if (!username) return json({ error: "Pick a username." }, 400);
    if (!code) return json({ error: "An invite code is required." }, 400);

    // Read, then claim with a guarded update. The `.eq("used_count", ...)`
    // is the lock: if someone else claimed the last use in between, our update
    // matches zero rows and we fail rather than over-issuing the code.
    const { data: row } = await admin
      .from("invite_codes")
      .select("code, grant_amount, max_uses, used_count, active")
      .eq("code", code)
      .maybeSingle();

    if (!row || !row.active) {
      return json({ error: "That invite code isn't valid." }, 400);
    }
    if (row.used_count >= row.max_uses) {
      return json({ error: "That invite code has already been used." }, 400);
    }

    const { data: bumped, error: bumpError } = await admin
      .from("invite_codes")
      .update({ used_count: row.used_count + 1 })
      .eq("code", code)
      .eq("used_count", row.used_count)
      .select("code, grant_amount")
      .single();

    if (bumpError || !bumped) {
      return json({ error: "That code was just used. Please try again." }, 409);
    }
    claimedCode = bumped.code;
    const grantAmount = Number(bumped.grant_amount ?? 200);

    // Create the account. email_confirm skips the verification email, which is
    // what you want for a hand-invited friends-and-family cohort.
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
      });

    if (createError || !created?.user) {
      const msg = createError?.message || "";
      const friendly = /already|exists|registered/i.test(msg)
        ? "An account with that email already exists."
        : "Could not create the account.";
      throw new Error(friendly);
    }

    const userId = created.user.id;

    // Profile + granted balance. The grant is recorded as practice_credits so
    // it can never be withdrawn as real money later.
    await admin.from("profiles").insert({
      user_id: userId,
      username,
      bio: "",
      cause: "",
    });
    await admin.from("balances").insert({
      user_id: userId,
      balance: grantAmount,
      practice_credits: grantAmount,
    });
    await admin.from("ledger").insert({
      user_id: userId,
      type: "deposit",
      amount: grantAmount,
      ref: "invite_" + claimedCode,
      description: `Welcome credits (invite ${claimedCode})`,
    });

    return json({ ok: true, granted: grantAmount });
  } catch (err) {
    // Release the code so a failed signup doesn't burn an invite.
    if (claimedCode) {
      const { data: row } = await admin
        .from("invite_codes")
        .select("used_count")
        .eq("code", claimedCode)
        .maybeSingle();
      if (row && row.used_count > 0) {
        await admin
          .from("invite_codes")
          .update({ used_count: row.used_count - 1 })
          .eq("code", claimedCode);
      }
    }
    const message =
      err instanceof Error ? err.message : "Signup failed. Please try again.";
    console.error("signup-with-invite error:", err);
    return json({ error: message }, 400);
  }
});
