import React from "react";

// Plain-language reference for the founding team. Written to be read aloud to
// someone who has never used Cajuga -- no jargon, no code, no table names.
// Every number here is taken from the live rules (place_trade, resolve_market,
// claim_weekly_refill); if those change, change this too.

const APP_VERSION = process.env.REACT_APP_VERSION || "0.2.0";

type Entry = {
  version: string;
  date: string;
  summary: string;
  needsMigration?: boolean;
  changes: {
    kind: "Added" | "Changed" | "Fixed" | "Removed";
    items: string[];
  }[];
};

const CHANGELOG: Entry[] = [
  {
    version: "0.2.0",
    date: "September 9, 2026",
    summary:
      "A big pass on the admin console: we can now see who suggested a market, who bet on it, and manage feedback properly.",
    needsMigration: true,
    changes: [
      {
        kind: "Added",
        items: [
          "Market suggestions now record which account sent them. Their name is a link — click it to jump to that person's profile in the console.",
          "Clicking a market opens a full view: how much is riding on each side, when it was submitted and resolved, and a list of every bet placed on it.",
          "Admins can suggest a market from inside the console, without switching over to the main site.",
          "Feedback can be given a Low, Medium or High priority, filtered by type and priority, archived out of the way, or deleted for good.",
          "Resolved markets now live in their own section, reachable from a button on the Markets tab.",
          "A market with no clear answer can be closed as unresolved — everyone who wagered gets their full stake back.",
          "This documentation page.",
        ],
      },
      {
        kind: "Changed",
        items: [
          "Resolving a market no longer asks for a date. It records the moment you resolve it. The option to void late bets is still there, tucked under Advanced options.",
        ],
      },
      {
        kind: "Fixed",
        items: [
          "Market suggestions were not appearing in the admin console. Nothing was lost — every suggestion had been saved the whole time, it just was not being displayed.",
        ],
      },
      {
        kind: "Removed",
        items: [
          "The pre-launch splash screen and its password. The site is now reachable without it.",
        ],
      },
    ],
  },
  {
    version: "0.1.0",
    date: "Before September 2026",
    summary:
      "Everything up to the founding-cohort demo: markets, trading, invite-only signup, practice credits, and the first admin console.",
    changes: [
      {
        kind: "Added",
        items: [
          "Prediction markets with buying, prices that move, and payouts.",
          "Invite-only signup with a code, and $200 of practice credits on joining.",
          "Admin console covering users, markets, submissions, the ledger and feedback.",
          "Market drafting from real news sources.",
          "Feedback form.",
        ],
      },
    ],
  },
];

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="mb-8">
    <h2 className="text-base font-medium text-stone-100 mb-2">{title}</h2>
    <div className="text-sm text-stone-300 leading-relaxed space-y-3">
      {children}
    </div>
  </section>
);

const Callout = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-md bg-stone-900 border border-stone-600 px-4 py-3 text-sm text-stone-300">
    {children}
  </div>
);

const AdminDocs = () => (
  <div className="max-w-3xl">
    <h1 className="text-xl font-medium text-stone-100 mb-1">Cajuga Docs</h1>
    <p className="text-xs text-stone-400 mb-6">v{APP_VERSION}</p>

    <Section title="The short version">
      <p>
        Cajuga is a prediction market for reality TV. People are asked a yes/no
        question about a show — will Jenny get a rose tonight? — and they back
        their answer. If they are right, they win. If they are wrong, they lose
        what they put in.
      </p>
      <p>
        Right now it is invite-only and everyone is playing with practice money.
        Nobody can deposit or withdraw real cash yet.
      </p>
    </Section>

    <Section title="The money is not real (yet)">
      <p>
        A new member signs up with an invite code and receives{" "}
        <strong className="text-stone-100">$200 in practice credits</strong>.
        Every Monday, anyone whose balance has dropped below $200 is topped back
        up to $200, so nobody is ever knocked out of the game.
      </p>
      <p>
        Practice credits cannot be cashed out. The rule we enforce is
        deliberately blunt: if an account holds any practice credits at all, it
        cannot withdraw anything. That keeps play money and real money from ever
        getting mixed up.
      </p>
      <p>
        The machinery for buying credits with a real card is built, but it is
        switched off.
      </p>
    </Section>

    <Section title="What a price means">
      <p>
        Every market has two prices that always add up to 100 — for example{" "}
        <strong className="text-stone-100">Yes 62¢ / No 38¢</strong>. Read that
        as the crowd thinking there is a 62% chance the answer is yes.
      </p>
      <p>
        The price is set by where the money is. If more money goes on Yes, Yes
        gets more expensive and No gets cheaper. There is no bookmaker setting
        odds — the members set them by betting.
      </p>
      <p>
        Each side starts with a $50 cushion built in, so the very first bet
        nudges the price rather than slamming it from 50¢ to 99¢. As real money
        builds up, that cushion matters less and the price moves more freely.
      </p>
    </Section>

    <Section title="What you actually buy: shares">
      <p>
        Money does not sit on a side — it buys{" "}
        <strong className="text-stone-100">shares</strong>. Every share is worth{" "}
        <strong className="text-stone-100">$1 if you are right</strong> and{" "}
        <strong className="text-stone-100">$0 if you are wrong</strong>. The
        price is what one share costs.
      </p>
      <Callout>
        Yes is trading at 62¢ and you put in $10.
        <br />
        You get 16 shares ($10 ÷ 62¢, rounded down).
        <br />
        If the answer is yes, those pay out $16.
        <br />
        If the answer is no, they are worth nothing.
      </Callout>
      <p>
        This is why the unpopular side pays better: at 20¢ the same $10 buys 50
        shares, worth $50 if it comes in. Cheaper price, more shares, bigger win
        — because more people thought you were wrong.
      </p>
    </Section>

    <Section title="Fees">
      <p>
        Cajuga charges a <strong className="text-stone-100">3% fee</strong>,
        added <em>on top</em> of a bet rather than taken out of it — so the
        amount someone chooses is the amount actually riding on the market. A
        $10 bet costs $10.30: $10 at stake, 30¢ to us.
      </p>
      <p>
        Separately, we pledge{" "}
        <strong className="text-stone-100">1% of our annual revenue</strong> to
        the causes members choose. That is a company-level commitment measured
        against what Cajuga earns over a year — not a slice taken out of any
        individual bet.
      </p>
    </Section>

    <Section title="Where markets come from">
      <p>There are two routes, and both end with a human approving them:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong className="text-stone-100">Members suggest them</strong> using
          "Suggest a market". These arrive in the console's Submissions tab.
        </li>
        <li>
          <strong className="text-stone-100">We draft them</strong> from real
          news and recaps, using the Generate button. Each one arrives with a
          link to the source so it can be checked.
        </li>
      </ul>
      <p>
        Nothing goes live automatically. Every suggestion is screened against
        our content rules — it must have a clear public answer, must not create
        a bad incentive, and must not be cruel — and then approved or rejected
        by hand.
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
        If there is no clear answer, we can close it as{" "}
        <strong className="text-stone-100">unresolved</strong> instead. Everyone
        gets their full stake back and nobody's accuracy is affected — it is as
        though the market never happened.
      </p>
      <p>
        There is also an option to void bets placed after a chosen time, for the
        case where someone wagered once the outcome was already public. Those
        people get refunded; everyone else is settled normally.
      </p>
    </Section>

    <Section title="The ledger">
      <p>
        Every single movement of money is written down as its own line. Nothing
        changes a balance quietly.
      </p>
      <p>
        One $10 bet produces two lines — the $10 stake and the 30¢ fee — and
        each line records the balance immediately after it. Add the lines up and
        you get the balance. That is what makes it possible to answer "why is my
        balance this number?" for any member, at any point in time.
      </p>
      <p>
        Trades placed before September 2026 show three lines instead of two: the
        stake, a 2% fee and a 1% charity pledge, from when the pledge came out
        of every trade. Members paid the same 3% then as now — only the
        labelling changed.
      </p>
    </Section>

    <Section title="Accuracy and the leaderboard">
      <p>
        A member's accuracy is the share of their settled bets they got right.
        Bets that were refunded — from an unresolved market or a voided late bet
        — are left out entirely, so being caught up in one cannot hurt
        somebody's record.
      </p>
    </Section>

    <Section title="Limits">
      <p>
        One person can have at most $100,000 riding on any single market at
        once. It exists so no single member can dominate a market's price.
      </p>
    </Section>

    <div className="border-t border-stone-600 pt-6 mt-10">
      <h1 className="text-xl font-medium text-stone-100 mb-1">Changelog</h1>
      <p className="text-xs text-stone-400 mb-6">
        What changed and when, newest first.
      </p>

      {CHANGELOG.map((rel) => (
        <div key={rel.version} className="mb-8">
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            <h2 className="text-base font-medium text-stone-100">
              v{rel.version}
            </h2>
            <span className="text-xs text-stone-400">{rel.date}</span>
            {rel.needsMigration && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs">
                needs a database update
              </span>
            )}
          </div>
          <p className="text-sm text-stone-300 mb-3">{rel.summary}</p>
          {rel.changes.map((group) => (
            <div key={group.kind} className="mb-3">
              <h3 className="text-xs uppercase tracking-wide text-stone-400 mb-1">
                {group.kind}
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-300">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default AdminDocs;
