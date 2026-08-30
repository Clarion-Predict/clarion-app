# Demo setup — invite-only signup, granted credits, trading fees

What shipped in this branch, and the steps only you can do (dashboard + secrets).

## What changed

| Area | Before | Now |
|---|---|---|
| Signup | Open to anyone | Invite code required, verified server-side |
| Starting balance | $50 | $200, recorded as **practice credits** |
| Trade fees | 1% pledge written to the ledger but **never deducted** | 3% charged on top: 2% platform + 1% charity, deducted and ledgered |
| Position size | Unlimited | 100,000 max per user, per market |
| Weekly refill | Tops up to $100 | Tops up to $200 |

### Fees are "on top"

A $10 trade now debits **$10.30** — $10 to the position, $0.20 to Cajuga, $0.10 to charity. The trade modal shows the breakdown, and the confirm button is priced (`Confirm — $10.30`). Client and server round each fee to the cent independently and identically, so "balance after" always matches what happens.

### Practice credits

Granted money lands in `balances.practice_credits` as well as `balances.balance`. Nothing enforces it yet because withdrawals don't exist — the point is that when they do, you can tell granted money from purchased money instead of trying to reconstruct it from months of history.

**The rule to implement when you build withdrawals:** an account with `practice_credits > 0` cannot withdraw. That's deliberately conservative — winnings on practice stakes aren't separately tracked, so anything looser risks paying out fake money as real.

## Setup steps

**1. Apply the migration**

```sh
npx supabase db push
```

**2. Deploy the signup function** (no JWT — the caller has no session yet)

```sh
npx supabase functions deploy signup-with-invite --no-verify-jwt
```

**3. Turn off public signup — this is the step that actually closes the door**

Supabase dashboard → Authentication → Sign In / Providers → disable **"Allow new users to sign up."**

Without this, anyone can still call `auth.signUp` from the browser console and skip the invite gate entirely. The edge function is only a real gate once this is off.

**4. Create invite codes**

SQL editor. Codes are stored and compared **uppercase**:

```sql
insert into invite_codes (code, label, max_uses, grant_amount) values
  ('CAJUGA-MOM',   'Mom',            1, 200),
  ('CAJUGA-DAD',   'Dad',            1, 200),
  ('CAJUGA-FF',    'Friends batch',  25, 200);
```

Check usage any time:

```sql
select code, label, used_count, max_uses, active from invite_codes order by created_at;
```

Revoke one: `update invite_codes set active = false where code = 'CAJUGA-FF';`

**5. Test the whole path** — open the site, get past the splash (`Cardinal-236`), sign up with a code, confirm you land with **$200**, place a trade, and check the ledger has three rows (trade / fee / pledge) that sum to the balance change.

## Known gaps

- **Splash gate is still up.** Two secrets in one welcome email is clunky; drop it once invites are proven. It's a two-line change in `src/index.tsx` (documented in `SplashGate.tsx`).
- **Charity pledge is hidden** behind `SHOW_PLEDGE = false` in `App.tsx`. Flip it if you want the 1% visible during the demo.
- **The 8% withdrawal fee isn't built** — not needed for a fake-money demo. Note Stripe's ~2.9% is charged at *deposit*, not withdrawal, so it doesn't net against the 8%.
- **Admin console still shows mock users and a mock ledger.** That's the next task, and it's what the demo actually shows off.
