import React from "react";
import { X } from "lucide-react";

// Cajuga Terms of Use and User Agreement.
//
// The text below is the legal document verbatim — edit it here when Legal
// sends a revision, and bump TERMS_EFFECTIVE_DATE at the same time.
//
// NOTE: two placeholders from the source document are reproduced as-is rather
// than guessed at — the minimum age in Section 2, and all of Section 30
// (dispute resolution). Both need real values before this is shown to anyone
// outside the team.

export const TERMS_EFFECTIVE_DATE = "July 30, 2026";

type Block = string | string[];
type Section = { n: number; title: string; body: Block[] };

const SECTIONS: Section[] = [
  {
    n: 1,
    title: "DEFINITIONS",
    body: [
      "For purposes of this Agreement:",
      "“Account” means the account you establish with Clarion to access and use the Platform.",
      "“Contract” means a contract or position offered through the Platform that has an outcome determined in accordance with the applicable Market Rules.",
      "“Market” means a market made available through the Platform concerning a specified future event or outcome.",
      "“Market Rules” means the rules applicable to a particular Market, including its question, eligible outcomes, closing time, resolution source, resolution methodology, and applicable contingencies.",
      "“Order” means an instruction submitted by a User to purchase or sell a Contract.",
      "“Platform” means the Cajuga website, mobile applications, software, exchange, interfaces, and related services operated by Clarion Predict LLC.",
      "“User,” “you,” or “your” means the individual or entity accessing or using the Platform.",
    ],
  },
  {
    n: 2,
    title: "ELIGIBILITY",
    body: [
      "You may use the Platform only if you satisfy all eligibility requirements established by Clarion and applicable law.",
      "You represent and warrant that:",
      [
        "you are at least [18/21] years old;",
        "you have legal capacity to enter into this Agreement;",
        "all information provided to Clarion is accurate and complete;",
        "you are legally permitted to use the Platform in your location;",
        "you are not subject to any restriction that would prohibit your participation; and",
        "you will comply with all applicable laws and regulations.",
      ],
      "Clarion may require you to complete identity, age, location, financial, or other verification procedures before permitting you to access certain features.",
    ],
  },
  {
    n: 3,
    title: "ACCOUNT",
    body: [
      "You may maintain only one Account unless Clarion expressly authorizes otherwise.",
      "You are responsible for maintaining the confidentiality of your login credentials and for all activity occurring through your Account.",
      "You may not:",
      [
        "create an Account using false or misleading information;",
        "use another person's Account;",
        "permit another person to access or use your Account;",
        "create multiple Accounts to circumvent Platform rules;",
        "sell, transfer, or otherwise provide access to your Account; or",
        "attempt to circumvent any restriction imposed on your Account.",
      ],
      "You must promptly notify Clarion of any unauthorized access or suspected compromise of your Account.",
    ],
  },
  {
    n: 4,
    title: "THE PLATFORM",
    body: [
      "Cajuga is a platform through which eligible Users may submit Orders to buy and sell Contracts associated with Markets.",
      "Clarion provides the technology, infrastructure, rules, and services necessary to facilitate transactions between Users.",
      "Except as expressly disclosed and permitted under the applicable Market and Platform rules, Clarion does not act as the counterparty to a User's Contract and does not take a proprietary position against a User for the purpose of profiting from the User's loss.",
      "Clarion may receive fees for operating and providing the Platform as disclosed to Users.",
    ],
  },
  {
    n: 5,
    title: "MARKETS",
    body: [
      "Each Market is governed by its applicable Market Rules.",
      "Before participating in a Market, you are responsible for reviewing the applicable Market Rules.",
      "Market Rules may specify:",
      [
        "the Market question;",
        "eligible outcomes;",
        "opening and closing times;",
        "applicable Contract terms;",
        "resolution criteria;",
        "resolution sources;",
        "treatment of cancellations or postponements;",
        "contingency procedures; and",
        "other information necessary to determine the outcome of the Market.",
      ],
      "Market Rules are incorporated into this Agreement by reference.",
      "If there is a conflict between this Agreement and Market Rules concerning a specific Market, the Market Rules will control with respect to that Market.",
    ],
  },
  {
    n: 6,
    title: "ORDERS AND TRANSACTIONS",
    body: [
      "You may submit Orders through the Platform in accordance with applicable Platform rules.",
      "Submission of an Order does not guarantee execution.",
      "An Order may be accepted, partially executed, fully executed, rejected, canceled, or expired in accordance with the applicable matching and trading rules.",
      "A transaction is considered executed only when the Platform records the applicable execution.",
      "Once executed, a transaction generally may not be canceled except as expressly permitted by the applicable Market Rules or this Agreement.",
      "You are solely responsible for reviewing your Orders before submitting them.",
    ],
  },
  {
    n: 7,
    title: "USER-TO-USER TRANSACTIONS",
    body: [
      "Transactions occurring through the Platform may involve Users acting as counterparties to one another.",
      "You acknowledge that Clarion does not guarantee that another User will submit an Order matching yours.",
      "Clarion does not guarantee that any Contract will have sufficient liquidity to permit you to enter into or exit a position at a particular price.",
      "The availability, price, liquidity, and execution of Contracts may change at any time.",
    ],
  },
  {
    n: 8,
    title: "PRICES AND MARKET INFORMATION",
    body: [
      "Prices displayed on the Platform reflect available market information and Orders submitted by Users.",
      "Prices may change rapidly and may not accurately predict the eventual outcome of a Market.",
      "Historical prices, probabilities, rankings, statistics, or other information displayed through the Platform are provided for informational purposes and do not constitute a guarantee of future performance or outcomes.",
      "You are responsible for independently evaluating whether a particular transaction is appropriate for you.",
    ],
  },
  {
    n: 9,
    title: "MARKET RESOLUTION",
    body: [
      "Markets will be resolved in accordance with their applicable Market Rules.",
      "Clarion will use the designated resolution source or methodology identified in the applicable Market Rules.",
      "Upon resolution, applicable Contracts will be settled according to the applicable Market Rules.",
      "Clarion may correct or modify a Market resolution when reasonably necessary to address a manifest error, technical failure, fraud, manipulation, inaccurate resolution information, or other circumstance affecting the integrity of the Market.",
    ],
  },
  {
    n: 10,
    title: "ACCOUNT FUNDS",
    body: [
      "Funds associated with your Account may be subject to different statuses, including deposited funds, funds associated with open positions, unsettled funds, settled funds, and funds eligible for withdrawal.",
      "You may use funds only in accordance with applicable Platform rules and restrictions.",
      "Clarion may place temporary restrictions on funds when reasonably necessary to investigate suspected fraud, unauthorized activity, chargebacks, identity issues, security incidents, Market manipulation, or legal or regulatory requirements.",
    ],
  },
  {
    n: 11,
    title: "DEPOSITS",
    body: [
      "Deposits must be made using payment methods authorized by Clarion.",
      "You represent that you are authorized to use any payment method associated with your Account.",
      "Clarion may reject, delay, reverse, or restrict deposits when reasonably necessary to address fraud, security concerns, payment disputes, regulatory requirements, or other legitimate concerns.",
    ],
  },
  {
    n: 12,
    title: "WITHDRAWALS",
    body: [
      "Withdrawals are subject to applicable verification, security, compliance, and Platform requirements.",
      "Clarion may delay or restrict a withdrawal when reasonably necessary to investigate:",
      [
        "fraud;",
        "unauthorized transactions;",
        "chargebacks;",
        "identity concerns;",
        "Market manipulation;",
        "violations of this Agreement;",
        "security incidents; or",
        "legal or regulatory requirements.",
      ],
      "Applicable withdrawal fees, minimums, limits, and processing times will be disclosed through the Platform.",
    ],
  },
  {
    n: 13,
    title: "FEES",
    body: [
      "Clarion may charge fees for transactions and other services provided through the Platform.",
      "Applicable fees will be disclosed through the Platform or applicable Market materials.",
      "You authorize Clarion to deduct applicable fees from your Account.",
      "Clarion may modify its fees upon reasonable notice, subject to applicable law.",
    ],
  },
  {
    n: 14,
    title: "MARKET INTEGRITY",
    body: [
      "You agree to participate honestly and in accordance with the Market Rules.",
      "You may not engage in conduct intended to manipulate a Market or create a false or misleading appearance of market activity.",
      "Prohibited conduct includes, without limitation:",
      [
        "wash trading;",
        "spoofing;",
        "layering;",
        "coordinated manipulation;",
        "collusion;",
        "trading through multiple Accounts;",
        "submitting Orders for the purpose of artificially moving a Market;",
        "disseminating knowingly false information for the purpose of influencing a Market;",
        "exploiting another User's Account;",
        "exploiting technical errors;",
        "interfering with the orderly operation of a Market; or",
        "any other conduct prohibited by applicable law or Platform rules.",
      ],
      "Clarion may investigate suspected violations and take appropriate action.",
    ],
  },
  {
    n: 15,
    title: "INSIDER AND NONPUBLIC INFORMATION",
    body: [
      "You may not use confidential, material, nonpublic information obtained through employment, professional relationships, production access, contractual relationships, or other privileged circumstances to obtain an improper advantage on the Platform.",
      "You are responsible for determining whether information available to you may lawfully be used in connection with a transaction.",
    ],
  },
  {
    n: 16,
    title: "BOTS AND AUTOMATED ACCESS",
    body: [
      "You may not access or interact with the Platform through bots, crawlers, scripts, automated trading systems, artificial intelligence systems, scraping tools, or other automated means except as expressly authorized by Clarion.",
      "Clarion may use technical and behavioral measures to identify automated, coordinated, fraudulent, or otherwise suspicious activity.",
      "Clarion may restrict, suspend, or terminate Accounts associated with unauthorized automated activity.",
    ],
  },
  {
    n: 17,
    title: "PROHIBITED USES",
    body: [
      "You may not use the Platform to:",
      [
        "violate applicable law;",
        "commit fraud or deception;",
        "impersonate another person;",
        "circumvent geographic or eligibility restrictions;",
        "interfere with Platform security;",
        "introduce malicious code;",
        "reverse engineer the Platform except where expressly permitted by law;",
        "scrape or systematically collect Platform data;",
        "exploit technical vulnerabilities;",
        "manipulate Markets;",
        "maintain multiple Accounts for an improper purpose;",
        "facilitate another person's prohibited activity; or",
        "otherwise interfere with the integrity, security, or operation of the Platform.",
      ],
    ],
  },
  {
    n: 18,
    title: "CLARION'S RIGHTS REGARDING MARKET INTEGRITY",
    body: [
      "To protect Users and the integrity of the Platform, Clarion may, in accordance with applicable law:",
      [
        "suspend or cancel Orders;",
        "restrict trading;",
        "suspend Markets;",
        "cancel affected transactions;",
        "correct erroneous transactions;",
        "restrict Account functionality;",
        "freeze or restrict funds;",
        "require additional verification;",
        "suspend or terminate Accounts; and",
        "take other reasonable measures necessary to address suspected fraud, manipulation, security incidents, technical failures, or violations of this Agreement.",
      ],
      "Where practicable, Clarion will provide notice explaining material actions taken against an Account.",
    ],
  },
  {
    n: 19,
    title: "TECHNICAL ERRORS AND SYSTEM EVENTS",
    body: [
      "The Platform may occasionally experience technical failures, latency, outages, pricing errors, connectivity problems, or other errors.",
      "Clarion may take reasonable corrective action when a technical issue materially affects the integrity of a Market or transaction.",
      "This may include canceling or correcting affected Orders or transactions.",
      "You acknowledge that electronic systems are not infallible and that Clarion cannot guarantee uninterrupted access to the Platform.",
    ],
  },
  {
    n: 20,
    title: "USER CONTENT",
    body: [
      "The Platform may permit Users to submit comments, predictions, usernames, profile information, images, or other materials (“User Content”).",
      "You retain ownership of your User Content.",
      "By submitting User Content, you grant Clarion a worldwide, non-exclusive, royalty-free, transferable, sublicensable license to use, reproduce, modify, display, distribute, publish, and otherwise use that User Content in connection with operating, developing, marketing, and promoting the Platform.",
      "You represent that you have the necessary rights to grant this license.",
    ],
  },
  {
    n: 21,
    title: "PUBLIC INFORMATION",
    body: [
      "Certain information associated with your Account may be publicly displayed, including your username, predictions, trading history, rankings, statistics, badges, and other information designated by the Platform as public.",
      "You should not submit information through the Platform that you do not want made publicly available.",
    ],
  },
  {
    n: 22,
    title: "INTELLECTUAL PROPERTY",
    body: [
      "The Platform and all associated software, technology, designs, interfaces, graphics, text, trademarks, logos, and other materials are owned by or licensed to Clarion.",
      "Except as expressly permitted by this Agreement, you may not reproduce, modify, distribute, sell, license, reverse engineer, or create derivative works from any portion of the Platform.",
    ],
  },
  {
    n: 23,
    title: "THIRD-PARTY SERVICES",
    body: [
      "The Platform may use third-party services, including payment processors, identity-verification providers, data providers, hosting providers, and other service providers.",
      "Your use of third-party services may be subject to additional terms.",
      "Clarion is not responsible for the acts or omissions of third-party service providers except as required by applicable law.",
    ],
  },
  {
    n: 24,
    title: "TAXES",
    body: [
      "You are solely responsible for determining and satisfying any tax obligations arising from your use of the Platform, including obligations relating to transactions, proceeds, gains, losses, or withdrawals.",
      "Clarion may provide tax forms or reports and make tax withholdings or disclosures when required by law.",
    ],
  },
  {
    n: 25,
    title: "DISCLAIMERS",
    body: [
      "THE PLATFORM IS PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS TO THE MAXIMUM EXTENT PERMITTED BY LAW.",
      "CLARION DOES NOT GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR AVAILABLE AT ANY PARTICULAR TIME.",
      "CLARION DOES NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR TIMELINESS OF INFORMATION DISPLAYED THROUGH THE PLATFORM.",
      "CLARION DOES NOT GUARANTEE THAT ANY USER WILL BE ABLE TO EXECUTE AN ORDER, EXIT A POSITION, OR WITHDRAW FUNDS AT A PARTICULAR TIME OR PRICE, EXCEPT AS OTHERWISE REQUIRED BY APPLICABLE LAW OR EXPRESSLY PROVIDED BY THE APPLICABLE MARKET RULES.",
    ],
  },
  {
    n: 26,
    title: "RISK DISCLOSURE",
    body: [
      "YOU ACKNOWLEDGE THAT PARTICIPATION IN MARKETS INVOLVES RISK.",
      "YOU MAY LOSE MONEY.",
      "PAST PERFORMANCE, MARKET PRICES, HISTORICAL PROBABILITIES, USER RANKINGS, AND OTHER INFORMATION DO NOT GUARANTEE FUTURE RESULTS.",
      "YOU ARE SOLELY RESPONSIBLE FOR YOUR DECISION TO PARTICIPATE IN ANY MARKET.",
      "YOU SHOULD NOT PARTICIPATE WITH FUNDS YOU CANNOT AFFORD TO LOSE.",
    ],
  },
  {
    n: 27,
    title: "SUSPENSION AND TERMINATION",
    body: [
      "You may stop using the Platform at any time.",
      "Clarion may suspend or terminate your Account or restrict access to the Platform when permitted by applicable law, including where Clarion reasonably believes that you:",
      [
        "violated this Agreement;",
        "violated applicable law;",
        "engaged in fraud or manipulation;",
        "attempted to circumvent Platform controls;",
        "engaged in unauthorized automated activity;",
        "created a security risk;",
        "provided inaccurate information; or",
        "otherwise threatened the integrity of the Platform.",
      ],
      "Termination does not eliminate obligations accrued before termination.",
    ],
  },
  {
    n: 28,
    title: "INDEMNIFICATION",
    body: [
      "To the maximum extent permitted by law, you agree to indemnify and hold harmless Clarion and its officers, directors, employees, affiliates, contractors, licensors, and service providers from claims, liabilities, damages, losses, costs, and expenses, including reasonable attorneys' fees, arising from or relating to:",
      [
        "your use of the Platform;",
        "your violation of this Agreement;",
        "your User Content;",
        "your violation of another person's rights; or",
        "your violation of applicable law.",
      ],
    ],
  },
  {
    n: 29,
    title: "LIMITATION OF LIABILITY",
    body: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLARION AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AFFILIATES, CONTRACTORS, LICENSORS, AND SERVICE PROVIDERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES ARISING FROM OR RELATING TO YOUR USE OF THE PLATFORM.",
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLARION'S AGGREGATE LIABILITY ARISING FROM OR RELATING TO THIS AGREEMENT OR THE PLATFORM WILL NOT EXCEED THE GREATER OF:",
      [
        "(a) THE FEES ACTUALLY PAID BY YOU TO CLARION DURING THE TWELVE MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR",
        "(b) $100.",
      ],
      "Nothing in this Agreement excludes or limits liability that cannot lawfully be excluded or limited.",
    ],
  },
  {
    n: 30,
    title: "DISPUTE RESOLUTION",
    body: [
      "[INSERT APPLICABLE ARBITRATION, CLASS-ACTION WAIVER, INFORMAL DISPUTE PROCEDURE, GOVERNING LAW, VENUE, AND OTHER DISPUTE-RESOLUTION TERMS.]",
      "Nothing in this Section limits any rights or remedies that cannot lawfully be waived or restricted.",
    ],
  },
  {
    n: 31,
    title: "GOVERNING LAW",
    body: [
      "This Agreement will be governed by the laws of the State of New York, without regard to conflict-of-law principles, except to the extent superseded by applicable federal law or other mandatory law.",
    ],
  },
  {
    n: 32,
    title: "CHANGES TO THIS AGREEMENT",
    body: [
      "Clarion may modify this Agreement from time to time.",
      "If we make material changes, we will provide notice as required by applicable law.",
      "Your continued use of the Platform after the effective date of revised Terms constitutes acceptance of the revised Agreement.",
    ],
  },
  {
    n: 33,
    title: "PRIVACY",
    body: [
      "Your use of the Platform is also subject to the Clarion Privacy Policy, available through the Platform.",
      "The Privacy Policy is incorporated into this Agreement by reference.",
    ],
  },
  {
    n: 34,
    title: "ELECTRONIC COMMUNICATIONS",
    body: [
      "You consent to receive electronic communications from Clarion concerning your Account, transactions, Markets, security, legal notices, and other matters relating to the Platform.",
      "Electronic communications satisfy any legal requirement that such communications be provided in writing, to the extent permitted by applicable law.",
    ],
  },
  {
    n: 35,
    title: "SEVERABILITY",
    body: [
      "If any provision of this Agreement is determined to be invalid or unenforceable, that provision will be enforced to the maximum extent permitted by law, and the remaining provisions will remain in full force and effect.",
    ],
  },
  {
    n: 36,
    title: "NO WAIVER",
    body: [
      "Clarion's failure to enforce any provision of this Agreement does not constitute a waiver of that provision or Clarion's right to enforce it later.",
    ],
  },
  {
    n: 37,
    title: "ASSIGNMENT",
    body: [
      "You may not assign or transfer this Agreement or your Account without Clarion's prior written consent.",
      "Clarion may assign this Agreement in connection with a merger, acquisition, corporate reorganization, financing, sale of assets, or similar transaction.",
    ],
  },
  {
    n: 38,
    title: "ENTIRE AGREEMENT",
    body: [
      "This Agreement, together with the Privacy Policy, applicable Market Rules, Fee Schedule, and any other terms expressly incorporated by reference, constitutes the entire agreement between you and Clarion concerning your use of the Platform.",
    ],
  },
  {
    n: 39,
    title: "CONTACT",
    body: [
      "Clarion Predict LLC",
      "39 Troutman St, Brooklyn, NY 11206",
      "jack@cajuga.com",
    ],
  },
  {
    n: 40,
    title: "ACCEPTANCE",
    body: [
      "BY CREATING AN ACCOUNT, ACCESSING THE PLATFORM, SUBMITTING AN ORDER, ENTERING INTO A CONTRACT, DEPOSITING FUNDS, OR OTHERWISE USING THE PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THIS AGREEMENT.",
    ],
  },
];

const TermsModal = ({ onClose }: { onClose: () => void }) => (
  <div
    className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col relative"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between p-6 pb-4 border-b border-stone-100">
        <div>
          <h2 className="text-xl font-serif text-stone-900">
            Terms of Use and User Agreement
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Clarion Predict LLC · Effective {TERMS_EFFECTIVE_DATE}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-stone-400 hover:text-stone-600 flex-shrink-0 ml-4"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto px-6 py-5 text-sm text-stone-700 leading-relaxed">
        <p className="mb-4">
          These Terms of Use and User Agreement (“Agreement”) govern your access
          to and use of the Cajuga website, mobile application, exchange, and
          related services (collectively, the “Platform”) operated by Clarion
          Predict LLC (“Clarion,” “Company,” “we,” “us,” or “our”).
        </p>
        <p className="mb-4">
          By creating an account, accessing the Platform, submitting an order,
          entering into a Contract, depositing funds, or otherwise using the
          Platform, you acknowledge that you have read, understood, and agree to
          be legally bound by this Agreement.
        </p>
        <p className="mb-6">
          If you do not agree to this Agreement, you may not access or use the
          Platform.
        </p>

        {SECTIONS.map((s) => (
          <section key={s.n} className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-900 mb-2">
              {s.n}. {s.title}
            </h3>
            {s.body.map((block, i) =>
              Array.isArray(block) ? (
                <ul key={i} className="list-disc pl-5 mb-3 space-y-1">
                  {block.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={i} className="mb-3">
                  {block}
                </p>
              ),
            )}
          </section>
        ))}
      </div>

      <div className="p-4 border-t border-stone-100 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-full bg-stone-900 text-white text-sm font-medium"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

export default TermsModal;
