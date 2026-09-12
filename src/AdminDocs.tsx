import React from "react";
import HowItWorks from "./HowItWorks";

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

const AdminDocs = () => (
  <div className="max-w-3xl">
    <h1 className="text-xl font-medium text-stone-100 mb-1">Cajuga Docs</h1>
    <p className="text-xs text-stone-400 mb-6">v{APP_VERSION}</p>

    <HowItWorks tone="dark" />

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
