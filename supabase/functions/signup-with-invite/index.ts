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

// ---------------------------------------------------------------------------
// Password rules
// ---------------------------------------------------------------------------
// This is the only real enforcement at signup: auth.admin.createUser does NOT
// apply the project's password settings (it differs from auth.updateUser,
// which does). A browser-side check alone would gate nothing.
//
// Mirrors src/passwordRules.ts -- change both together.
const MIN_PASSWORD_LENGTH = 10;

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd", "123456", "1234567",
  "12345678", "123456789", "1234567890", "qwerty", "qwerty123", "qwertyuiop",
  "letmein", "welcome", "welcome1", "admin", "admin123", "iloveyou",
  "sunshine", "princess", "football", "baseball", "dragon", "monkey",
  "shadow", "master", "superman", "trustno1", "abc123", "abcd1234",
  "changeme", "secret", "starwars", "whatever", "zaq12wsx", "asdfghjkl",
  "cajuga", "cajuga123", "prediction", "reality",
]);

const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
  "01234567890",
];

const hasRunOrSequence = (lower: string): boolean => {
  if (/(.)\1{4,}/.test(lower)) return true;
  for (const row of SEQUENCES) {
    const reversed = row.split("").reverse().join("");
    for (let i = 0; i + 6 <= row.length; i++) {
      if (lower.includes(row.slice(i, i + 6))) return true;
      if (lower.includes(reversed.slice(i, i + 6))) return true;
    }
  }
  return false;
};

const checkPassword = (
  password: string,
  identifiers: (string | undefined | null)[] = [],
): string | null => {
  if (!password) return "Choose a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return "That password is too common. Please choose another.";
  }
  if (hasRunOrSequence(lower)) {
    return "Avoid repeated characters or keyboard patterns like 123456.";
  }
  for (const raw of identifiers) {
    if (!raw) continue;
    const id = String(raw).toLowerCase().split("@")[0];
    if (id.length >= 3 && lower.includes(id)) {
      return "Password must not contain your name or email.";
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Username rules
// ---------------------------------------------------------------------------
// Shape is the important half. Restricting to [a-z0-9_] is what stops a
// lookalike name: a Cyrillic "a" is a different character from a Latin one and
// would otherwise pass a uniqueness check while rendering identically to
// another member's name. It also rules out zero-width and direction-override
// characters. The database enforces the same rule; this is here so the person
// signing up gets a sentence instead of a constraint violation.
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// Names that imply this account speaks for Cajuga. More important than
// profanity for us -- "cajuga_support" asking a member about their balance is
// a workable phishing setup.
const RESERVED = new Set([
  "admin", "administrator", "root", "support", "help", "helpdesk", "mod",
  "moderator", "staff", "team", "official", "cajuga", "cajugaapp",
  "cajugateam", "cajugasupport", "cajugahelp", "cajuga_official", "security",
  "billing", "payments", "noreply", "no_reply", "system", "moderation",
]);

// Deliberately short. It is a speed bump, not a solution: any blocklist is
// bypassable and over-blocks real words (the "Scunthorpe problem"). Swap in a
// moderation API before public signup.
const BLOCKED = [
  "fuck", "shit", "cunt", "bitch", "nigger", "faggot", "retard", "rape",
  "nazi", "hitler",
];

// Innocent words that contain a blocked one. Stripped out before matching, so
// "scunthorpe" and "grapevine" survive -- the classic false positive that has
// locked real people out of real services.
const SAFE_WORDS = [
  "scunthorpe", "penistone", "cockburn", "lightwater", "clitheroe",
  "grape", "scrape", "drape", "therap", "assassin", "classic", "analy",
];

// Fold the common letter/digit swaps before matching, so "sh1t" and "f4ggot"
// are caught by the same short list.
const deLeet = (s: string) =>
  s
    .replace(/[4@]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]/g, "");

// Returns an error message, or null when the name is acceptable.
const checkUsername = (username: string): string | null => {
  if (!username) return "Pick a username.";
  if (!USERNAME_RE.test(username)) {
    return "Usernames can use lowercase letters, numbers and underscores, and must be 3-20 characters.";
  }
  if (RESERVED.has(username) || RESERVED.has(deLeet(username))) {
    return "That username is reserved. Please choose another.";
  }
  let folded = deLeet(username);
  for (const safe of SAFE_WORDS) folded = folded.split(safe).join("");
  if (BLOCKED.some((word) => folded.includes(word))) {
    return "Please choose a different username.";
  }
  return null;
};

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
    const passwordError = checkPassword(password, [body.username, email]);
    if (passwordError) return json({ error: passwordError }, 400);
    const usernameError = checkUsername(username);
    if (usernameError) return json({ error: usernameError }, 400);
    if (!code) return json({ error: "An invite code is required." }, 400);

    // Check availability before burning an invite use. The unique index is
    // still the authority -- two simultaneous signups can both pass this read
    // -- so the insert failure is handled further down as well.
    const { data: taken } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("username", username)
      .maybeSingle();
    if (taken) {
      return json({ error: "That username is taken. Try another." }, 400);
    }

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
    //
    // These errors used to be discarded. With a unique index on the username,
    // two people signing up at once can now genuinely collide here -- and a
    // silent failure would leave an auth account with no profile or no
    // balance, which the app cannot recover from. Undo the account instead so
    // the address is free to try again.
    const { error: profileError } = await admin.from("profiles").insert({
      user_id: userId,
      username,
      bio: "",
      cause: "",
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      throw new Error(
        profileError.code === "23505"
          ? "That username was just taken. Try another."
          : "Could not create the account.",
      );
    }

    const { error: balanceError } = await admin.from("balances").insert({
      user_id: userId,
      balance: grantAmount,
      practice_credits: grantAmount,
    });
    if (balanceError) {
      await admin.from("profiles").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
      throw new Error("Could not create the account.");
    }
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
