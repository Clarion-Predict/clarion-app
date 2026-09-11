// Password policy, shared by the signup form and the change-password modal.
//
// Length is the rule that matters. NIST SP 800-63B advises against demanding a
// symbol and a digit: it reliably produces "Password1!" and pushes people to
// reuse passwords across sites. So the checks below are length plus a refusal
// of the passwords attackers try first.
//
// signup-with-invite/index.ts carries a copy of this logic, because Deno edge
// functions cannot import from src/. Change both together. That copy is the
// one that actually enforces anything at signup -- auth.admin.createUser does
// not apply the project's password settings, so a browser-only check would be
// no check at all.

export const MIN_PASSWORD_LENGTH = 10;

// The passwords guessed first. Not exhaustive by design -- it is here to stop
// the obvious, not to be a substitute for length.
const COMMON = new Set([
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

// A run of one character, or six-plus characters walked straight off the
// keyboard, is guessed about as fast as a dictionary word.
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

// Returns an error message, or null when the password is acceptable.
// `identifiers` are things that should not appear inside it -- username, email.
export const checkPassword = (
  password: string,
  identifiers: (string | undefined | null)[] = [],
): string | null => {
  if (!password) return "Choose a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  const lower = password.toLowerCase();

  if (COMMON.has(lower)) {
    return "That password is too common. Please choose another.";
  }
  if (hasRunOrSequence(lower)) {
    return "Avoid repeated characters or keyboard patterns like 123456.";
  }

  for (const raw of identifiers) {
    if (!raw) continue;
    // Compare against the part before the @, so a password containing the
    // email address is caught too.
    const id = String(raw).toLowerCase().split("@")[0];
    if (id.length >= 3 && lower.includes(id)) {
      return "Password must not contain your name or email.";
    }
  }

  return null;
};

// Rough guidance for the strength hint under the field. Deliberately coarse --
// it encourages a longer password without pretending to measure entropy.
export const passwordStrength = (
  password: string,
): { label: string; score: 0 | 1 | 2 | 3 } => {
  if (password.length < MIN_PASSWORD_LENGTH) return { label: "Too short", score: 0 };
  if (password.length >= 20) return { label: "Excellent", score: 3 };
  if (password.length >= 14) return { label: "Strong", score: 2 };
  return { label: "OK", score: 1 };
};
