import React from "react";

// The plain-language explanation of how Cajuga works, shared by the public
// About tab and the admin console's Docs tab. One copy, because every number
// here is taken from the live rules (place_trade, resolve_market,
// claim_weekly_refill) -- keeping two copies in step would mean remembering
// both every time a rate changes.
//
// Written to be read by a member, so it avoids naming admin-only screens.
// Operator detail (the ledger, limits, the changelog) stays in AdminDocs.

type Tone = "light" | "dark";

const TONE = {
  light: {
    heading: "text-stone-900",
    body: "text-stone-700",
    strong: "text-stone-900",
    callout: "bg-white border-stone-200 text-stone-700",
  },
  dark: {
    heading: "text-stone-100",
    body: "text-stone-300",
    strong: "text-stone-100",
    callout: "bg-stone-900 border-stone-600 text-stone-300",
  },
} as const;

const HowItWorks = ({ tone = "light" }: { tone?: Tone }) => {
  const t = TONE[tone];

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="mb-8">
      <h2 className={`text-base font-medium mb-2 ${t.heading}`}>{title}</h2>
      <div className={`text-sm leading-relaxed space-y-3 ${t.body}`}>
        {children}
      </div>
    </section>
  );

  const B = ({ children }: { children: React.ReactNode }) => (
    <strong className={t.strong}>{children}</strong>
  );

  return (
    <div>
      <Section title="The short version">
        <p>
          Cajuga is a prediction market for reality TV. People are asked a
          yes/no question about a show — will Jenny get a rose tonight? — and
          they back their answer. If they are right, they win. If they are
          wrong, they lose what they put in.
        </p>
        <p>
          Right now it is invite-only and everyone is playing with practice
          money. Nobody can deposit or withdraw real cash yet.
        </p>
      </Section>

      <Section title="The money is not real (yet)">
        <p>
          A new member signs up with an invite code and receives{" "}
          <B>$200 in practice credits</B>. Every Monday, anyone whose balance
          has dropped below $200 is topped back up to $200, so nobody is ever
          knocked out of the game.
        </p>
        <p>
          Practice credits cannot be cashed out. The rule we enforce is
          deliberately blunt: if an account holds any practice credits at all,
          it cannot withdraw anything. That keeps play money and real money from
          ever getting mixed up.
        </p>
        <p>
          The machinery for buying credits with a real card is built, but it is
          switched off.
        </p>
      </Section>

      <Section title="What a price means">
        <p>
          Every market has two prices that always add up to 100 — for example{" "}
          <B>Yes 62¢ / No 38¢</B>. Read that as the crowd thinking there is a
          62% chance the answer is yes.
        </p>
        <p>
          The price is set by where the money is. If more money goes on Yes, Yes
          gets more expensive and No gets cheaper. There is no bookmaker setting
          odds — the members set them by betting.
        </p>
        <p>
          Each side starts with a $50 cushion built in, so the very first bet
          nudges the price rather than slamming it from 50¢ to 99¢. As real
          money builds up, that cushion matters less and the price moves more
          freely.
        </p>
      </Section>

      <Section title="What you actually buy: shares">
        <p>
          Money does not sit on a side — it buys <B>shares</B>. Every share is
          worth <B>$1 if you are right</B> and <B>$0 if you are wrong</B>. The
          price is what one share costs.
        </p>
        <div className={`rounded-md border px-4 py-3 text-sm ${t.callout}`}>
          Yes is trading at 62¢ and you put in $10.
          <br />
          You get 16 shares ($10 ÷ 62¢, rounded down).
          <br />
          If the answer is yes, those pay out $16.
          <br />
          If the answer is no, they are worth nothing.
        </div>
        <p>
          This is why the unpopular side pays better: at 20¢ the same $10 buys
          50 shares, worth $50 if it comes in. Cheaper price, more shares,
          bigger win — because more people thought you were wrong.
        </p>
      </Section>

      <Section title="Fees">
        <p>
          Cajuga charges a <B>3% fee</B>, added <em>on top</em> of a bet rather
          than taken out of it — so the amount someone chooses is the amount
          actually riding on the market. A $10 bet costs $10.30: $10 at stake,
          30¢ to us.
        </p>
        <p>
          Separately, we pledge <B>1% of our annual revenue</B> to the causes
          members choose. That is a company-level commitment measured against
          what Cajuga earns over a year — not a slice taken out of any
          individual bet.
        </p>
      </Section>

      <Section title="Where markets come from">
        <p>There are two routes, and both end with a human approving them:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <B>Members suggest them</B> using "Suggest a market".
          </li>
          <li>
            <B>We draft them</B> from real news and recaps. Each one carries a
            link to its source, so the claim behind it can be checked.
          </li>
        </ul>
        <p>
          Nothing goes live automatically. Every suggestion is screened against
          our content rules — it must have a clear public answer, must not
          create a bad incentive, and must not be cruel — and then approved or
          rejected by hand.
        </p>
      </Section>

      <Section title="How a market ends">
        <p>
          When the answer is known, we resolve the market. Everyone holding
          winning shares is paid $1 per share straight into their balance;
          everyone else gets nothing. The time of resolution is recorded
          automatically.
        </p>
        <p>
          If there is no clear answer, we can close it as <B>unresolved</B>{" "}
          instead. Everyone gets their full stake back and nobody's accuracy is
          affected — it is as though the market never happened.
        </p>
        <p>
          There is also an option to void bets placed after a chosen time, for
          the case where someone wagered once the outcome was already public.
          Those people get refunded; everyone else is settled normally.
        </p>
      </Section>
    </div>
  );
};

export default HowItWorks;
