import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from './supabase';
import { Search, TrendingUp, Users, MessageCircle, Bookmark, Share2, ChevronRight, ArrowLeft, Sparkles, Heart, Briefcase, Vote, Tv, ShoppingBag, Activity, X, Check, Mail, Shield, CreditCard, AlertCircle, LogOut, Plus, Bell, TrendingDown, Zap, Globe, Copy, Award, Trophy, Star, Flame, Settings, Database, FileText, Terminal, Play, Pause, RefreshCw, FlaskConical, BookOpen, Layers, ArrowRight, DollarSign, Edit3, Gift, UserCircle, BarChart2, Eye, EyeOff, AtSign, Lock, Unlock, ChevronUp, ChevronDown, Medal } from 'lucide-react';

const Beaker = FlaskConical;
const HandHeart = Heart;
const BadgeCheck = Award;

// ========== DATA ==========
const categories = [
  { id: 'all', name: 'All', icon: Sparkles },
  { id: 'spotlight', name: 'Spotlight', icon: Flame },
  { id: 'dating', name: 'Dating & Love', icon: Heart },
  { id: 'competition', name: 'Competition', icon: Trophy },
  { id: 'housewives', name: 'Housewives & Bravo', icon: Star },
  { id: 'lifestyle', name: 'Family & Lifestyle', icon: Tv },
];

const causesByCategory = {
  spotlight: { name: "Mental health initiatives", org: "Policy Center for Maternal Mental Health, NAMI" },
  dating: { name: "Mental health initiatives", org: "Policy Center for Maternal Mental Health, NAMI" },
  competition: { name: "Economic empowerment", org: "Ellevate Foundation, Kiva" },
  housewives: { name: "Women's health research", org: "Society for Women's Health Research" },
  lifestyle: { name: "Reproductive rights & healthcare access", org: "Center for Reproductive Rights" },
};

const causeOptions = [
  { id: 'womens_health', name: "Women's health research", org: "Society for Women's Health Research" },
  { id: 'mental_health', name: "Mental health initiatives", org: "Policy Center for Maternal Mental Health, NAMI" },
  { id: 'economic', name: "Economic empowerment", org: "Ellevate Foundation, Kiva" },
  { id: 'reproductive', name: "Reproductive rights & healthcare access", org: "Center for Reproductive Rights" },
];

const initialMarkets = [
  // ===== SPOTLIGHT (hot right now) =====
  { id: 1, category: 'spotlight', show: 'Love Island USA', question: "Will Love Island USA have a dramatic recoupling in its premiere week?", context: "Love Island USA returns June 2 on Peacock. Season 7 cast has been announced and fans are already debating alliances.", yes: 78, no: 22, volume: '$12.4k', traders: 487, comments: 134, trending: true, ends: 'Jun 8, 2026', status: 'open' },
  { id: 2, category: 'spotlight', show: 'The Traitors US', question: "Will The Traitors US have a double elimination this week?", context: "Six players remain. The roundtable has been getting more chaotic each episode as alliances fracture.", yes: 54, no: 46, volume: '$9.7k', traders: 381, comments: 112, trending: true, ends: 'Jun 1, 2026', status: 'open' },
  { id: 3, category: 'spotlight', show: 'Calabasas Confidential', question: "Will Calabasas Confidential beat its premiere night viewership expectations?", context: "Premieres May 29. Early buzz has been strong and the Kardashian adjacent cast is drawing attention.", yes: 61, no: 39, volume: '$6.2k', traders: 244, comments: 78, trending: true, ends: 'Jun 1, 2026', status: 'open' },

  // ===== DATING & LOVE =====
  { id: 4, category: 'dating', show: 'The Bachelor', question: "Will the Bachelor finale end with an engagement?", context: "Season 31 finale airs June 10. Two contestants remain — odds are heavily debated in Bachelor Nation.", yes: 74, no: 26, volume: '$14.1k', traders: 509, comments: 203, trending: true, ends: 'Jun 10, 2026', status: 'open' },
  { id: 5, category: 'dating', show: 'The Bachelor', question: "Will there be a two-on-one date in the next Bachelor episode?", context: "Previews show a dramatic beach confrontation. Classic two-on-one setup.", yes: 82, no: 18, volume: '$3.4k', traders: 178, comments: 44, ends: 'May 27, 2026', status: 'open' },
  { id: 6, category: 'dating', show: 'Love Is Blind', question: "Will Love Is Blind Season 8 produce at least two marriages that last a year?", context: "Seasons 1 and 4 each produced one lasting marriage. Season 8 couples seem stronger on paper.", yes: 34, no: 66, volume: '$8.9k', traders: 334, comments: 97, ends: 'Dec 31, 2027', status: 'open' },
  { id: 7, category: 'dating', show: 'Love Island USA', question: "Will a Love Island USA couple from Season 7 still be together six months after the finale?", context: "Season 7 premieres June 2. Historically only about 30% of couples survive past the show.", yes: 41, no: 59, volume: '$7.3k', traders: 289, comments: 88, ends: 'Dec 31, 2026', status: 'open' },
  { id: 8, category: 'dating', show: 'Too Hot to Handle', question: "Will Too Hot To Handle Season 6 be renewed before the finale airs?", context: "Netflix has pre-announced renewals for this franchise before. Viewership is tracking strong.", yes: 47, no: 53, volume: '$5.6k', traders: 221, comments: 63, ends: 'Jun 20, 2026', status: 'open' },
  { id: 9, category: 'dating', show: '90 Day Fiancé', question: "Will 90 Day Fiancé feature a same-sex couple in its next season?", context: "The franchise has expanded significantly. Fans have been calling for more diverse casting.", yes: 38, no: 62, volume: '$4.8k', traders: 192, comments: 54, ends: 'Dec 31, 2026', status: 'open' },
  { id: 10, category: 'dating', show: 'Perfect Match', question: "Will Perfect Match Season 3 be announced before the end of summer?", context: "Season 2 performed well for Netflix. Alumni from multiple shows are already being speculated.", yes: 63, no: 37, volume: '$5.1k', traders: 203, comments: 61, ends: 'Sep 1, 2026', status: 'open' },

  // ===== COMPETITION =====
  { id: 11, category: 'competition', show: 'Survivor', question: "Will this season's Survivor winner be a woman?", context: "Women have won 21 of 46 seasons. The current winner's edit strongly favors two female contenders.", yes: 63, no: 37, volume: '$12.4k', traders: 476, comments: 134, ends: 'Jun 18, 2026', status: 'open' },
  { id: 12, category: 'competition', show: 'Survivor', question: "Will there be a hidden immunity idol played at the next Survivor tribal council?", context: "Two idols are unaccounted for. The vote tonight is expected to be chaotic.", yes: 67, no: 33, volume: '$4.2k', traders: 198, comments: 51, ends: 'Jun 4, 2026', status: 'open' },
  { id: 13, category: 'competition', show: 'The Traitors US', question: "Will a woman win The Traitors US this season?", context: "Four of the six remaining players are women. The traitor reveal has fans theorizing constantly.", yes: 71, no: 29, volume: '$8.8k', traders: 342, comments: 97, trending: true, ends: 'Jun 15, 2026', status: 'open' },
  { id: 14, category: 'competition', show: 'Big Brother', question: "Will Big Brother 27 cast include a returning player?", context: "Big Brother has mixed returning players in three of the last five seasons. Casting hints have been vague.", yes: 44, no: 56, volume: '$6.1k', traders: 241, comments: 72, ends: 'Jul 15, 2026', status: 'open' },
  { id: 15, category: 'competition', show: "RuPaul's Drag Race", question: "Will RuPaul's Drag Race crown a queen of color this season?", context: "Queens of color have won 9 of the last 12 seasons. The top 4 remaining all have strong track records.", yes: 76, no: 24, volume: '$7.4k', traders: 293, comments: 88, ends: 'Jun 28, 2026', status: 'open' },
  { id: 16, category: 'competition', show: 'Beast Games', question: "Will Beast Games Season 2 be confirmed before Season 1 finale airs?", context: "MrBeast has hinted at a second season. Amazon hasn't confirmed but viewership numbers were massive.", yes: 58, no: 42, volume: '$9.2k', traders: 364, comments: 103, ends: 'Jul 1, 2026', status: 'open' },
  { id: 17, category: 'competition', show: 'The Amazing Race', question: "Will The Amazing Race return for another season in 2026?", context: "The Amazing Race has been renewed consistently. CBS has been quiet on a Season 36 announcement.", yes: 69, no: 31, volume: '$4.7k', traders: 187, comments: 49, ends: 'Dec 31, 2026', status: 'open' },

  // ===== HOUSEWIVES & BRAVO =====
  { id: 18, category: 'housewives', show: 'RHONY', question: "Will Bethenny Frankel appear on the Real Housewives of New York reunion?", context: "Bethenny has been vocal about a potential return. Producers have not confirmed either way.", yes: 38, no: 62, volume: '$11.7k', traders: 421, comments: 156, trending: true, ends: 'Jun 15, 2026', status: 'open' },
  { id: 19, category: 'housewives', show: 'Vanderpump Rules', question: "Will Vanderpump Rules be renewed for another season?", context: "Viewership rebounded post-Scandoval but Bravo has stayed quiet. Cast contracts are reportedly up.", yes: 55, no: 45, volume: '$9.3k', traders: 388, comments: 112, ends: 'Jul 1, 2026', status: 'open' },
  { id: 20, category: 'housewives', show: 'RHONJ', question: "Will there be a physical altercation on this season of RHONJ?", context: "Tensions between two main cast members have been building for three episodes straight.", yes: 79, no: 21, volume: '$6.8k', traders: 267, comments: 93, ends: 'Jun 3, 2026', status: 'open' },
  { id: 21, category: 'housewives', show: 'Below Deck Med', question: "Will Below Deck Med have a crew member fired mid-season?", context: "Captain Sandy has fired crew members in 3 of the last 5 seasons. Early episodes show serious tension.", yes: 62, no: 38, volume: '$5.4k', traders: 214, comments: 67, ends: 'Jul 20, 2026', status: 'open' },
  { id: 22, category: 'housewives', show: 'Southern Charm', question: "Will Southern Charm be renewed for Season 10?", context: "Season 9 has performed steadily. Bravo has been expanding its lifestyle lineup.", yes: 66, no: 34, volume: '$4.1k', traders: 163, comments: 44, ends: 'Sep 1, 2026', status: 'open' },
  { id: 23, category: 'housewives', show: 'RHOSLC', question: "Will RHOSLC have a cast member exit before the reunion?", context: "At least one cast member has reportedly filmed limited confessionals this season — a classic exit signal.", yes: 57, no: 43, volume: '$7.2k', traders: 286, comments: 81, ends: 'Jun 30, 2026', status: 'open' },

  // ===== FAMILY & LIFESTYLE =====
  { id: 24, category: 'lifestyle', show: 'The Kardashians', question: "Will The Kardashians Season 6 feature a major relationship announcement?", context: "Hulu has been promoting the season heavily. At least two cast members have had relationship news offscreen.", yes: 72, no: 28, volume: '$10.3k', traders: 407, comments: 128, trending: true, ends: 'Jul 1, 2026', status: 'open' },
  { id: 25, category: 'lifestyle', show: 'Mormon Wives', question: "Will Secret Lives of Mormon Wives be renewed for Season 3?", context: "Season 2 was a massive breakout hit for Hulu. The cast has stayed active and drama has continued offscreen.", yes: 81, no: 19, volume: '$8.6k', traders: 341, comments: 104, ends: 'Sep 1, 2026', status: 'open' },
  { id: 26, category: 'lifestyle', show: 'Selling Sunset', question: "Will Selling Sunset introduce a new cast member in the back half of Season 8?", context: "The show has consistently added cast mid-season. Jason Oppenheim has hinted at new agents joining.", yes: 68, no: 32, volume: '$5.8k', traders: 229, comments: 69, ends: 'Jul 15, 2026', status: 'open' },
  { id: 27, category: 'lifestyle', show: 'Queer Eye', question: "Will Queer Eye's final season receive an Emmy nomination?", context: "The final season was announced recently. The show has received 7 Emmy wins across its run.", yes: 59, no: 41, volume: '$4.4k', traders: 174, comments: 52, ends: 'Jul 31, 2026', status: 'open' },
  { id: 28, category: 'lifestyle', show: 'Jersey Shore', question: "Will Jersey Shore Family Vacation film another international trip this season?", context: "The cast has filmed in Italy and the Bahamas before. Producers have been teasing a new location.", yes: 53, no: 47, volume: '$3.9k', traders: 155, comments: 41, ends: 'Aug 1, 2026', status: 'open' },
];

// ========== MOCK COMMUNITY USERS ==========
const initialCommunityUsers = [
  { id: 'usr_001', username: 'leilac', name: 'Leila Cho', accuracy: 74, totalTrades: 47, impactScore: 312, leaderboardRank: 1, following: true, cause: 'womens_health', causePrivate: false, positions: [
    { marketId: 4, market: "Will the Bachelor finale end with an engagement?", category: 'dating', side: 'yes', amount: 25, ts: '2h ago', resolved: false },
    { marketId: 13, market: "Will a woman win The Traitors US this season?", category: 'competition', side: 'yes', amount: 50, ts: '1d ago', resolved: false },
  ]},
  { id: 'usr_002', username: 'marcuschen', name: 'Marcus Chen', accuracy: 61, totalTrades: 31, impactScore: 187, leaderboardRank: 2, following: true, cause: 'economic', causePrivate: false, positions: [
    { marketId: 19, market: "Will Vanderpump Rules be renewed for another season?", category: 'housewives', side: 'no', amount: 30, ts: '3h ago', resolved: false },
    { marketId: 6, market: "Will Love Is Blind Season 8 produce at least two marriages that last a year?", category: 'dating', side: 'no', amount: 20, ts: '5h ago', resolved: false },
  ]},
  { id: 'usr_003', username: 'sarahkim', name: 'Sarah Kim', accuracy: 58, totalTrades: 19, impactScore: 94, leaderboardRank: 3, following: false, cause: 'mental_health', causePrivate: true, positions: [
    { marketId: 1, market: "Will Love Island USA have a dramatic recoupling in its premiere week?", category: 'spotlight', side: 'yes', amount: 15, ts: '6h ago', resolved: false },
  ]},
  { id: 'usr_004', username: 'janedoe_wx', name: 'Jane Doe', accuracy: 55, totalTrades: 12, impactScore: 61, leaderboardRank: 4, following: false, cause: 'reproductive', causePrivate: false, positions: [
    { marketId: 18, market: "Will Bethenny Frankel appear on the Real Housewives of New York reunion?", category: 'housewives', side: 'no', amount: 40, ts: '1d ago', resolved: false },
  ]},
  { id: 'usr_005', username: 'priyav', name: 'Priya V.', accuracy: 52, totalTrades: 8, impactScore: 44, leaderboardRank: 5, following: false, cause: 'womens_health', causePrivate: false, positions: [] },
];

const mockActivityComments = {
  'usr_001_4': [{ id: 'c1', author: 'marcuschen', text: 'Bold call — the edit has been too obvious. They never show the winner this much.', ts: '1h ago' }],
  'usr_002_19': [],
};

const mockUsers = [
  { id: 'usr_demo', name: 'Demo User', email: 'demo@clarion.app', balance: 50, kyc: true, state: 'NY', positions: 0 },
  { id: 'usr_001', name: 'Leila Cho', email: 'leila@example.com', balance: 1247.50, kyc: true, state: 'CA', positions: 12 },
  { id: 'usr_002', name: 'Marcus Chen', email: 'marcus@example.com', balance: 432.20, kyc: true, state: 'TX', positions: 8 },
  { id: 'usr_003', name: 'Sarah Kim', email: 'sarahk@example.com', balance: 89.75, kyc: false, state: 'FL', positions: 0, flag: 'kyc_pending' },
  { id: 'usr_004', name: 'Jane Doe', email: 'jane@example.com', balance: 5000, kyc: true, state: 'WA', positions: 3, flag: 'high_deposit' },
];

const initialLedger = [
  { id: 'le_001', userId: 'usr_001', type: 'deposit', amount: 500, ref: 'stripe_ch_3NxY2kL', ts: '2026-04-18 14:32:01', desc: 'Card deposit, Visa ending 4242' },
  { id: 'le_002', userId: 'usr_001', type: 'trade', amount: -50, ref: 'trd_8821', ts: '2026-04-18 14:45:23', desc: 'YES at 62 cents, Wicked' },
  { id: 'le_003', userId: 'usr_001', type: 'fee', amount: -1, ref: 'trd_8821', ts: '2026-04-18 14:45:23', desc: 'Trading fee 2 percent' },
  { id: 'le_004', userId: 'usr_001', type: 'pledge', amount: -0.50, ref: 'trd_8821', ts: '2026-04-18 14:45:23', desc: '1 percent pledge to mental health initiatives' },
  { id: 'le_005', userId: 'usr_002', type: 'deposit', amount: 200, ref: 'stripe_ch_3NxY9qR', ts: '2026-04-18 09:12:44', desc: 'ACH deposit via Plaid' },
  { id: 'le_006', userId: 'usr_002', type: 'trade', amount: -75, ref: 'trd_8804', ts: '2026-04-18 11:03:12', desc: 'NO at 77 cents, PFML Act' },
];

const initialWaitlist = [
  { position: 1, email: 'early1@example.com', joined: '3d ago' },
  { position: 2, email: 'early2@example.com', joined: '3d ago' },
];

const automationTemplates = [
  { source: 'event-feed', category: 'dating', question: "Will the next Bachelor rose ceremony end with a surprise walkout?", passes: { publicResolution: true, noPerverseIncentive: true, dignity: true, valuesAligned: true } },
  { source: 'event-feed', category: 'housewives', question: "Will this season of RHONY end with a cast shakeup announcement?", passes: { publicResolution: true, noPerverseIncentive: true, dignity: true, valuesAligned: true } },
  { source: 'llm-drafted', category: 'competition', question: "Will there be a hidden immunity idol played at the next Survivor tribal council?", passes: { publicResolution: true, noPerverseIncentive: true, dignity: true, valuesAligned: true } },
  { source: 'llm-drafted', category: 'dating', question: "Will Love Island USA drop a surprise recoupling before episode 3?", passes: { publicResolution: true, noPerverseIncentive: true, dignity: true, valuesAligned: true } },
  { source: 'scheduled-event', category: 'competition', question: "Will The Traitors US finale air without a bonus episode this season?", passes: { publicResolution: true, noPerverseIncentive: true, dignity: true, valuesAligned: true } },
  { source: 'community', category: 'housewives', question: "Will a new cast member be added to Vanderpump Rules mid-season?", passes: { publicResolution: true, noPerverseIncentive: true, dignity: true, valuesAligned: true } },
  { source: 'llm-drafted', category: 'lifestyle', question: "Will The Kardashians feature a surprise guest appearance this season?", passes: { publicResolution: true, noPerverseIncentive: true, dignity: true, valuesAligned: true } },
  { source: 'community', category: 'spotlight', question: "Will a specific Love Island contestant win based on early fan polls?", passes: { publicResolution: false, noPerverseIncentive: true, dignity: false, valuesAligned: false }, rejectReason: "Fan polls are not a reliable public resolution source." },
  { source: 'community', category: 'housewives', question: "Will a cast member announce a personal health issue this season?", passes: { publicResolution: false, noPerverseIncentive: false, dignity: false, valuesAligned: false }, rejectReason: "Privacy concern. Markets on personal health situations are not permitted." },
];

const initialSubmissions = [
  { id: 'sub_001', submitter: 'BachelorNation_fan', source: 'community', time: '2h ago', category: 'dating', question: "Will the Bachelor skip the fantasy suites this season?", context: "Lead has made comments in interviews suggesting he wants a different path.", endsHint: "Jun 3, 2026", autoChecks: { publicResolution: true, noPerverseIncentive: true, dignity: true, valuesAligned: true }, status: 'pending' },
  { id: 'sub_002', submitter: 'TraitorsFan22', source: 'community', time: '4h ago', category: 'competition', question: "Will the Traitors finale have a live audience this season?", context: "Peacock has been expanding production on the show. The UK version uses a live studio format.", endsHint: "Jun 15, 2026", autoChecks: { publicResolution: true, noPerverseIncentive: true, dignity: true, valuesAligned: true }, status: 'pending' },
  { id: 'sub_003', submitter: 'Anonymous', source: 'community', time: '6h ago', category: 'dating', question: "Will a specific Love Island contestant win based on early fan polls?", context: "Several fan accounts are reporting strong early numbers for one contestant.", endsHint: "Aug 1, 2026", autoChecks: { publicResolution: false, noPerverseIncentive: true, dignity: false, valuesAligned: false }, rejectReason: "Fan polls are not a reliable public resolution source.", status: 'pending' },
];

const generateSubmission = () => {
  const tmpl = automationTemplates[Math.floor(Math.random() * automationTemplates.length)];
  const sourceLabel = tmpl.source === 'community' ? 'Community member' : tmpl.source === 'llm-drafted' ? 'Clarion AI drafted' : tmpl.source === 'event-feed' ? 'Event feed auto' : 'Scheduled event auto';
  return {
    id: 'sub_auto_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    submitter: sourceLabel, source: tmpl.source, time: 'just now',
    category: tmpl.category, question: tmpl.question, context: 'Auto-generated for review.',
    endsHint: 'Dec 31, 2026', autoChecks: tmpl.passes, rejectReason: tmpl.rejectReason, status: 'pending',
  };
};

const communityImpact = {
  totalGiven: 482193, contributors: 12847,
  byArea: [
    { cause: "Women's health research", amount: 120548, pct: 25 },
    { cause: "Mental health initiatives", amount: 120548, pct: 25 },
    { cause: "Economic empowerment", amount: 120548, pct: 25 },
    { cause: "Reproductive rights & healthcare access", amount: 120548, pct: 25 },
  ],
};

// ========== LOGO ==========
const Logo = ({ size = 32 }) => (
  <div className="relative" style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700" />
    <div className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="-14 -14 28 28" fill="none" width={size * 0.6} height={size * 0.6}>
        <path d="M0,-11 L11,0 L0,11 L-11,0 Z" fill="none" stroke="#fde68a" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M5,-5 L-1.5,0 L5,5" fill="none" stroke="#fde68a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  </div>
);

// ========== AVATAR ==========
const Avatar = ({ username, size = 36, className = '' }) => {
  const colors = ['bg-amber-200', 'bg-rose-200', 'bg-emerald-200', 'bg-sky-200', 'bg-violet-200', 'bg-orange-200'];
  const colorIdx = username ? username.charCodeAt(0) % colors.length : 0;
  return (
    <div className={`${colors[colorIdx]} rounded-full flex items-center justify-center font-medium text-stone-800 flex-shrink-0 ${className}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {username ? username[0].toUpperCase() : '?'}
    </div>
  );
};

// ========== WAITLIST MODAL ==========
const WaitlistModal = ({ onClose, waitlist, setWaitlist }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState(null);
  const handleSubmit = () => {
    if (!email.includes('@')) return;
    const newPosition = waitlist.length + 1;
    setWaitlist([...waitlist, { position: newPosition, email, joined: 'just now' }]);
    setPosition(newPosition);
    setSubmitted(true);
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-6 right-6 text-stone-400"><X className="w-5 h-5" /></button>
        {!submitted ? (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center mb-5"><Sparkles className="w-7 h-7 text-stone-800" /></div>
            <h2 className="text-2xl font-serif text-stone-900 mb-2">Real-money early access</h2>
            <p className="text-sm text-stone-600 leading-relaxed mb-5">Clarion is in practice mode while we complete CFTC registration. Join the waitlist.</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none mb-3" />
            <button onClick={handleSubmit} className="w-full py-3 rounded-2xl bg-stone-900 text-white text-sm font-medium">Join waitlist</button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-emerald-600" /></div>
            <h2 className="text-2xl font-serif text-stone-900 mb-2">You are on the list</h2>
            <div className="inline-block px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-sm mb-4">
              <span className="text-amber-900">Position </span><span className="font-serif text-amber-900">#{position}</span>
            </div>
            <button onClick={onClose} className="px-6 py-2.5 rounded-full bg-stone-900 text-white text-sm">Back to Clarion</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== USER PROFILE VIEW ==========
const UserProfileView = ({ profileUser, onClose, onFollowToggle, myPositions, markets, onViewMarket }) => {
  const [tab, setTab] = useState('bets');
  const causeInfo = causeOptions.find(c => c.id === profileUser.cause);
  return (
    <div className="min-h-screen bg-amber-50/40 pb-20">
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <button onClick={onClose} className="flex items-center gap-2 text-stone-600 mb-4 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden mb-4">
          <div className="h-16 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100" />
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-8 mb-4">
              <Avatar username={profileUser.username} size={56} className="border-2 border-white" />
              <button onClick={() => onFollowToggle(profileUser.id)} className={`px-4 py-1.5 rounded-full text-sm font-medium ${profileUser.following ? 'bg-stone-100 text-stone-700' : 'bg-stone-900 text-white'}`}>
                {profileUser.following ? 'Following' : 'Follow'}
              </button>
            </div>
            <div className="mb-1">
              <span className="text-lg font-serif text-stone-900">{profileUser.name}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-stone-500 mb-4">
              <AtSign className="w-3.5 h-3.5" />{profileUser.username}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Accuracy', value: profileUser.accuracy + '%', highlight: profileUser.accuracy >= 65 },
                { label: 'Total trades', value: profileUser.totalTrades },
                { label: 'Impact score', value: profileUser.impactScore },
              ].map((s, i) => (
                <div key={i} className={`p-3 rounded-2xl text-center ${s.highlight ? 'bg-emerald-50 border border-emerald-100' : 'bg-stone-50'}`}>
                  <div className={`text-xl font-serif ${s.highlight ? 'text-emerald-700' : 'text-stone-900'}`}>{s.value}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            {!profileUser.causePrivate && causeInfo && (
              <div className="mt-4 flex items-center gap-2 text-xs text-stone-500">
                <HandHeart className="w-3.5 h-3.5 text-amber-600" />
                <span>Supports <span className="text-stone-700 font-medium">{causeInfo.name}</span></span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {['bets', 'stats'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm capitalize ${tab === t ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200'}`}>{t}</button>
          ))}
        </div>

        {tab === 'bets' && (
          <div className="space-y-3">
            {profileUser.positions.length === 0 && <div className="text-center py-10 text-stone-400 text-sm">No bets yet.</div>}
            {profileUser.positions.map((p, i) => {
              const market = markets.find(m => m.id === p.marketId);
              return (
                <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs text-stone-500">
                    <span className="capitalize">{p.category}</span>
                    <span>·</span><span>{p.ts}</span>
                  </div>
                  <p className="text-sm font-serif text-stone-900 mb-2 leading-snug">{p.market}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.side === 'yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{p.side.toUpperCase()}</span>
                    <span className="text-xs text-stone-500">${p.amount} wagered</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'stats' && (
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h3 className="text-sm font-medium text-stone-900 mb-4">Performance breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Leaderboard rank', value: '#' + profileUser.leaderboardRank },
                { label: 'Accuracy rate', value: profileUser.accuracy + '%' },
                { label: 'Total trades placed', value: profileUser.totalTrades },
                { label: 'Impact score', value: profileUser.impactScore },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0">
                  <span className="text-sm text-stone-500">{row.label}</span>
                  <span className="text-sm font-medium text-stone-900">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== ACTIVITY FEED TAB ==========
const ActivityFeed = ({ communityUsers, setCommunityUsers, markets, onViewProfile, onViewMarket }) => {
  const [comments, setComments] = useState(mockActivityComments);
  const [commentText, setCommentText] = useState({});

  const followed = communityUsers.filter(u => u.following);
  const feedItems = followed.flatMap(u =>
    u.positions.map(p => ({ ...p, user: u, key: u.id + '_' + p.marketId }))
  ).sort((a, b) => (a.ts > b.ts ? -1 : 1));

  const submitComment = (key) => {
    const text = (commentText[key] || '').trim();
    if (!text) return;
    const newComment = { id: 'c' + Date.now(), author: 'demo', text, ts: 'just now' };
    setComments(prev => ({ ...prev, [key]: [...(prev[key] || []), newComment] }));
    setCommentText(prev => ({ ...prev, [key]: '' }));
  };

  if (followed.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="w-10 h-10 text-stone-200 mx-auto mb-3" />
        <h3 className="text-lg font-serif text-stone-900 mb-2">No one followed yet</h3>
        <p className="text-sm text-stone-500 mb-5">Follow other traders to see their activity here.</p>
        <button onClick={() => onViewProfile(communityUsers[0])} className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm">Find traders</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedItems.map(item => {
        const itemComments = comments[item.key] || [];
        const causeInfo = !item.user.causePrivate ? causeOptions.find(c => c.id === item.user.cause) : null;
        return (
          <div key={item.key} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => onViewProfile(item.user)}>
                  <Avatar username={item.user.username} size={36} />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => onViewProfile(item.user)} className="font-medium text-stone-900 text-sm hover:underline">@{item.user.username}</button>
                  <div className="text-xs text-stone-400">{item.ts}</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${item.side === 'yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {item.side.toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-serif text-stone-900 leading-snug mb-3">{item.market}</p>
              <div className="flex items-center gap-3 text-xs text-stone-400 flex-wrap">
                <span>${item.amount} wagered</span>
                {causeInfo && (
                  <span className="flex items-center gap-1">
                    <HandHeart className="w-3 h-3 text-amber-500" />
                    <span>1% → {causeInfo.name}</span>
                  </span>
                )}
              </div>
            </div>

            {itemComments.length > 0 && (
              <div className="border-t border-stone-50 px-4 py-3 space-y-3">
                {itemComments.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar username={c.author} size={24} />
                    <div className="flex-1 bg-stone-50 rounded-xl px-3 py-2">
                      <span className="text-xs font-medium text-stone-700">@{c.author} </span>
                      <span className="text-xs text-stone-600">{c.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-stone-50 px-4 py-3 flex gap-2">
              <Avatar username="demo" size={28} />
              <div className="flex-1 relative">
                <input
                  type="text"
                  maxLength={280}
                  value={commentText[item.key] || ''}
                  onChange={e => setCommentText(prev => ({ ...prev, [item.key]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submitComment(item.key)}
                  placeholder="Add a comment…"
                  className="w-full bg-stone-50 rounded-xl px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none pr-16"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {(commentText[item.key] || '').length > 0 && (
                    <span className="text-xs text-stone-400">{280 - (commentText[item.key] || '').length}</span>
                  )}
                  <button onClick={() => submitComment(item.key)} className="text-stone-400 hover:text-stone-700">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ========== LEADERBOARD TAB ==========
const LeaderboardTab = ({ communityUsers, setCommunityUsers, onViewProfile }) => {
  const [sortBy, setSortBy] = useState('rank');
  const sorted = [...communityUsers].sort((a, b) => {
    if (sortBy === 'rank') return a.leaderboardRank - b.leaderboardRank;
    if (sortBy === 'accuracy') return b.accuracy - a.accuracy;
    if (sortBy === 'impact') return b.impactScore - a.impactScore;
    return 0;
  });

  const rankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-amber-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-stone-400" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-700" />;
    return <span className="text-xs font-mono text-stone-400 w-4 text-center">#{rank}</span>;
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {[['rank', 'Overall rank'], ['accuracy', 'Accuracy'], ['impact', 'Impact score']].map(([key, label]) => (
          <button key={key} onClick={() => setSortBy(key)} className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${sortBy === key ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200'}`}>{label}</button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((u, i) => {
          const isTop3 = u.leaderboardRank <= 3;
          return (
            <div key={u.id} className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl ${isTop3 ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100' : 'bg-white border border-stone-100'}`}>
              <div className="w-6 flex items-center justify-center flex-shrink-0">{rankIcon(u.leaderboardRank)}</div>
              <button onClick={() => onViewProfile(u)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                <Avatar username={u.username} size={36} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-stone-900 truncate">@{u.username}</div>
                  <div className="text-xs text-stone-400">{u.totalTrades} trades</div>
                </div>
              </button>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-serif text-stone-900">{u.accuracy}%</div>
                <div className="text-xs text-stone-400">accuracy</div>
              </div>
              <div className="text-right flex-shrink-0 hidden md:block">
                <div className="text-sm font-serif text-amber-700">{u.impactScore}</div>
                <div className="text-xs text-stone-400">impact</div>
              </div>
              <button
                onClick={() => setCommunityUsers(prev => prev.map(cu => cu.id === u.id ? { ...cu, following: !cu.following } : cu))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 ${u.following ? 'bg-stone-100 text-stone-600' : 'bg-stone-900 text-white'}`}
              >
                {u.following ? 'Following' : 'Follow'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-stone-50 border border-stone-100 text-center">
        <p className="text-xs text-stone-500 leading-relaxed">Rankings update daily. Accuracy is calculated on resolved markets only. Impact score reflects total pledge contributions.</p>
      </div>
    </div>
  );
};

// ========== MY PROFILE TAB ==========
const MyProfileTab = ({ balance, positions, markets, demoUser, userProfile, setUserProfile, onLogout }) => {
  const [selectedCause, setSelectedCause] = useState(userProfile?.cause || '');
  const [causePrivate, setCausePrivate] = useState(false);
  const [amountsPrivate, setAmountsPrivate] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState(userProfile?.bio || '');
  const totalPledged = positions.reduce((s, p) => s + (p.invested * 0.01), 0);
  const username = demoUser.username || demoUser.email?.split('@')[0] || 'you';

  const saveBio = async () => {
  setUserProfile(prev => ({ ...prev, bio }));
  setEditingBio(false);
  if (demoUser?.id) {
    await supabase
      .from('profiles')
      .update({ bio })
      .eq('user_id', demoUser.id);
  }
};

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden mb-4">
        <div className="h-16 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100" />
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-8 mb-4">
            <Avatar username={username} size={56} className="border-2 border-white" />
            <span className="text-xs text-stone-400 flex items-center gap-1"><Beaker className="w-3 h-3" /> Practice account</span>
          </div>
          <div className="text-lg font-serif text-stone-900 mb-0.5">{demoUser.name || username}</div>
          <div className="flex items-center gap-1 text-sm text-stone-400 mb-3"><AtSign className="w-3.5 h-3.5" />{username}</div>
          {editingBio ? (
            <div className="mb-3">
              <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={160} className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:outline-none resize-none text-stone-900" rows={3} />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-stone-400">{160 - bio.length} chars left</span>
                <div className="flex gap-2">
                  <button onClick={() => setEditingBio(false)} className="text-xs text-stone-400">Cancel</button>
                  <button onClick={saveBio} className="text-xs font-medium text-stone-900">Save</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-3 flex items-start gap-2">
              <p className="text-sm text-stone-600 flex-1">{bio || <span className="text-stone-400 italic">No bio yet</span>}</p>
              <button onClick={() => setEditingBio(true)} className="text-xs text-stone-400 hover:text-stone-700 flex-shrink-0 flex items-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Practice balance', value: '$' + balance.toFixed(2) },
              { label: 'Open positions', value: positions.length },
              { label: 'Total pledged', value: '$' + totalPledged.toFixed(2) },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-2xl bg-stone-50 text-center">
                <div className="text-lg font-serif text-stone-900">{s.value}</div>
                <div className="text-xs text-stone-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-4">
        <h3 className="text-sm font-medium text-stone-900 mb-1">The Clarion Pledge</h3>
        <p className="text-xs text-stone-500 mb-4">1% of every trade you place goes to your chosen cause.</p>
        <div className="space-y-2 mb-4">
          {causeOptions.map(c => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedCause(c.id);
              setUserProfile(p => ({ ...p, cause: c.id }));
              if (demoUser?.id) {
                supabase
                  .from('profiles')
                  .update({ cause: c.id })
                  .eq('user_id', demoUser.id)
                  .then(() => {});

              }
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${selectedCause === c.id ? 'border-amber-300 bg-amber-50' : 'border-stone-100 bg-stone-50'}`}
          >            
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedCause === c.id ? 'border-amber-500 bg-amber-500' : 'border-stone-300'}`}>
                {selectedCause === c.id && <Check className="w-2.5 h-2.5 text-white" style={{marginTop:'1px'}} />}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-stone-900 font-medium">{c.name}</div>
                <div className="text-xs text-stone-400 truncate">{c.org}</div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => setCausePrivate(!causePrivate)} className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-700">
          {causePrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {causePrivate ? 'Cause is private — tap to make public' : 'Cause is public — tap to make private'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-4">
        <h3 className="text-sm font-medium text-stone-900 mb-4">Privacy settings</h3>
        <div className="space-y-3">
          {[
            { label: 'Hide bet amounts', sub: 'Others see your direction (YES/NO) but not how much you wagered', state: amountsPrivate, toggle: () => setAmountsPrivate(!amountsPrivate) },
            { label: 'Hide cause donation', sub: 'Your chosen cause will not appear on your profile or activity feed', state: causePrivate, toggle: () => setCausePrivate(!causePrivate) },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0">
              <div className="flex-1">
                <div className="text-sm text-stone-900">{s.label}</div>
                <div className="text-xs text-stone-400 mt-0.5">{s.sub}</div>
              </div>
              <button onClick={s.toggle} className={`w-10 rounded-full transition-colors relative flex-shrink-0 ${s.state ? 'bg-stone-900' : 'bg-stone-200'}`} style={{height:'22px', width:'40px'}}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${s.state ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-rose-100 text-rose-600 text-sm hover:bg-rose-50">
        <LogOut className="w-4 h-4" /> Sign out
      </button>
    </div>
  );
};

// ========== ADMIN PANEL (unchanged, abbreviated) ==========
const AdminPanel = ({ onClose, markets, setMarkets, ledger, setLedger, users, submissions, setSubmissions, waitlist }) => {
  const [adminTab, setAdminTab] = useState('overview');
  const [resolvingMarket, setResolvingMarket] = useState(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState(8);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    if (!autoRunning) return;
    const interval = setInterval(() => {
      const newSub = generateSubmission();
      setSubmissions(prev => [newSub, ...prev]);
      setLastGenerated(newSub.id);
      setTimeout(() => setLastGenerated(null), 1500);
    }, autoSpeed * 1000);
    return () => clearInterval(interval);
  }, [autoRunning, autoSpeed, setSubmissions]);

  const generateOnce = () => {
    const newSub = generateSubmission();
    setSubmissions(prev => [newSub, ...prev]);
    setLastGenerated(newSub.id);
    setTimeout(() => setLastGenerated(null), 1500);
  };

  const resolveMarket = (marketId, outcome) => {
    setMarkets(prev => prev.map(m => m.id === marketId ? { ...m, status: 'resolved', outcome } : m));
    setLedger(prev => [{ id: 'le_' + Date.now(), userId: 'system', type: 'resolution', amount: 0, ref: 'mkt_' + marketId, ts: new Date().toISOString().replace('T', ' ').slice(0, 19), desc: 'Market resolved by operator' }, ...prev]);
    setResolvingMarket(null);
  };

  const approveSubmission = (subId) => {
    const sub = submissions.find(s => s.id === subId);
    if (!sub) return;
    const newMarket = { id: Math.max.apply(null, markets.map(m => m.id)) + 1, category: sub.category, question: sub.question, context: sub.context, yes: 50, no: 50, volume: '$0', traders: 0, comments: 0, ends: sub.endsHint, status: 'open' };
    setMarkets(prev => [...prev, newMarket]);
    setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'approved' } : s));
  };

  const rejectSubmission = (subId) => setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'rejected' } : s));

  const totalDeposits = ledger.filter(e => e.type === 'deposit').reduce((s, e) => s + e.amount, 0);
  const totalFees = ledger.filter(e => e.type === 'fee').reduce((s, e) => s + Math.abs(e.amount), 0);
  const totalPledge = ledger.filter(e => e.type === 'pledge').reduce((s, e) => s + Math.abs(e.amount), 0);
  const pending = submissions.filter(s => s.status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col overflow-hidden">
      <div className="bg-stone-900 border-b border-stone-700 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 rounded bg-rose-600 text-white text-xs font-medium uppercase">Admin</div>
          <span className="text-sm font-medium">Clarion Operator Console</span>
        </div>
        <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-stone-800 text-xs flex items-center gap-1.5"><X className="w-3.5 h-3.5" /> Exit</button>
      </div>
      <div className="flex flex-1 min-h-0">
        <nav className="w-48 bg-stone-900 border-r border-stone-800 p-3 hidden md:block">
          {['overview', 'users', 'markets', 'submissions', 'ledger', 'pledge', 'compliance', 'investor'].map(t => (
            <button key={t} onClick={() => setAdminTab(t)} className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs ${adminTab === t ? 'bg-stone-800 text-white' : 'text-stone-400'}`}>
              <span className="capitalize">{t}</span>
              {t === 'submissions' && pending > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-stone-900 text-xs font-medium">{pending}</span>}
            </button>
          ))}
        </nav>
        <div className="flex-1 bg-stone-100 overflow-y-auto">
          <div className="md:hidden p-2 bg-stone-900 border-b border-stone-800 flex gap-1 overflow-x-auto">
            {['overview', 'users', 'markets', 'submissions', 'ledger', 'pledge', 'compliance', 'investor'].map(t => (
              <button key={t} onClick={() => setAdminTab(t)} className={`px-3 py-1.5 rounded text-xs whitespace-nowrap ${adminTab === t ? 'bg-stone-800 text-white' : 'text-stone-400'}`}>{t}</button>
            ))}
          </div>
          <div className="p-4 md:p-6">
            {adminTab === 'overview' && (
              <div>
                <h1 className="text-xl font-medium text-stone-900 mb-1">Platform overview</h1>
                <p className="text-xs text-stone-500 mb-5">Prototype data</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-lg bg-white border border-stone-200"><div className="text-xs text-stone-500 uppercase mb-1">Users</div><div className="text-2xl font-medium text-stone-900">{users.length}</div></div>
                  <div className="p-4 rounded-lg bg-white border border-stone-200"><div className="text-xs text-stone-500 uppercase mb-1">Deposits</div><div className="text-2xl font-medium text-stone-900">${totalDeposits.toFixed(0)}</div></div>
                  <div className="p-4 rounded-lg bg-white border border-stone-200"><div className="text-xs text-stone-500 uppercase mb-1">Fees</div><div className="text-2xl font-medium text-emerald-700">${totalFees.toFixed(2)}</div></div>
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200"><div className="text-xs text-amber-700 uppercase mb-1">Pledged</div><div className="text-2xl font-medium text-amber-900">${totalPledge.toFixed(2)}</div></div>
                </div>
              </div>
            )}
            {adminTab === 'submissions' && (
              <div>
                <h1 className="text-xl font-medium text-stone-900 mb-1">Market submissions</h1>
                <p className="text-xs text-stone-500 mb-4">{pending} pending</p>
                <div className="mb-4 p-4 rounded-lg bg-stone-900 text-stone-200">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-2 h-2 rounded-full ${autoRunning ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
                      <span className="text-xs font-mono">automation</span>
                      <span className="text-xs text-stone-500">{autoRunning ? 'running, every ' + autoSpeed + 's' : 'paused'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={autoSpeed} onChange={e => setAutoSpeed(Number(e.target.value))} disabled={autoRunning} className="text-xs bg-stone-800 border border-stone-700 rounded px-2 py-1">
                        <option value="4">4s</option><option value="8">8s</option><option value="15">15s</option><option value="30">30s</option>
                      </select>
                      <button onClick={generateOnce} className="px-3 py-1.5 rounded-md bg-stone-800 text-xs flex items-center gap-1.5"><Plus className="w-3 h-3" /> One</button>
                      <button onClick={() => setAutoRunning(!autoRunning)} className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 font-medium ${autoRunning ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}>
                        {autoRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}{autoRunning ? 'Pause' : 'Run'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {submissions.filter(s => s.status === 'pending').map(sub => {
                    const checks = sub.autoChecks;
                    const allPass = checks.publicResolution && checks.noPerverseIncentive && checks.dignity && checks.valuesAligned;
                    const isNew = lastGenerated === sub.id;
                    const sourceColor = sub.source === 'event-feed' || sub.source === 'scheduled-event' ? 'bg-blue-100 text-blue-700' : sub.source === 'llm-drafted' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700';
                    return (
                      <div key={sub.id} className={`bg-white rounded-lg border p-4 transition-all ${isNew ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-stone-200'}`}>
                        <div className="flex items-center gap-2 mb-2 text-xs flex-wrap">
                          <span className="capitalize px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{sub.category}</span>
                          {sub.source && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sourceColor}`}>{sub.source}</span>}
                          <span className="text-stone-500">by {sub.submitter}</span>
                          <span className="text-stone-500">{sub.time}</span>
                          {isNew && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">NEW</span>}
                        </div>
                        <h3 className="text-base font-medium text-stone-900 mb-2">{sub.question}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                          {[{ key: 'publicResolution', label: 'Public resolution' }, { key: 'noPerverseIncentive', label: 'No perverse incentive' }, { key: 'dignity', label: 'Dignity' }, { key: 'valuesAligned', label: 'Values aligned' }].map(check => (
                            <div key={check.key} className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs ${checks[check.key] ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {checks[check.key] ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}<span className="truncate">{check.label}</span>
                            </div>
                          ))}
                        </div>
                        {sub.rejectReason && <div className="p-3 rounded bg-rose-50 border border-rose-200 text-xs text-rose-900 mb-3"><span className="font-medium">Auto-flag:</span> {sub.rejectReason}</div>}
                        <div className="flex gap-2">
                          <button onClick={() => approveSubmission(sub.id)} disabled={!allPass} className={`flex-1 py-2 rounded-md text-sm font-medium ${allPass ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-400'}`}>{allPass ? 'Approve and list' : 'Cannot auto-approve'}</button>
                          <button onClick={() => rejectSubmission(sub.id)} className="flex-1 py-2 rounded-md bg-stone-900 text-white text-sm font-medium">Reject</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {adminTab === 'users' && (
              <div>
                <h1 className="text-xl font-medium text-stone-900 mb-4">Users</h1>
                <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 border-b border-stone-200"><tr className="text-xs uppercase text-stone-500"><th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">KYC</th><th className="text-right px-4 py-3">Balance</th></tr></thead>
                    <tbody className="divide-y divide-stone-100">
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="px-4 py-3"><div className="font-medium text-stone-900">{u.name}</div><div className="text-xs text-stone-500">{u.email}</div></td>
                          <td className="px-4 py-3">{u.kyc ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Verified</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>}</td>
                          <td className="px-4 py-3 text-right font-mono text-stone-900">${u.balance.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {adminTab === 'markets' && (
              <div>
                <h1 className="text-xl font-medium text-stone-900 mb-4">Markets</h1>
                <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
                  {markets.map(m => (
                    <div key={m.id} className="p-4 border-b border-stone-100 last:border-0 flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-stone-500 capitalize">{m.category}</span>
                          {m.status === 'resolved' ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Resolved {m.outcome}</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Open</span>}
                        </div>
                        <h3 className="text-sm font-medium text-stone-900">{m.question}</h3>
                      </div>
                      {m.status === 'open' && <button onClick={() => setResolvingMarket(m)} className="px-3 py-1.5 rounded-md bg-stone-900 text-white text-xs flex items-center gap-1"><Edit3 className="w-3 h-3" /> Resolve</button>}
                    </div>
                  ))}
                </div>
                {resolvingMarket && (
                  <div className="fixed inset-0 bg-black/50 z-10 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                      <h3 className="text-lg font-medium mb-2">Resolve market</h3>
                      <p className="text-sm text-stone-600 mb-4">{resolvingMarket.question}</p>
                      <div className="flex gap-2">
                        <button onClick={() => resolveMarket(resolvingMarket.id, 'yes')} className="flex-1 py-2.5 rounded-md bg-emerald-600 text-white text-sm font-medium">Resolve YES</button>
                        <button onClick={() => resolveMarket(resolvingMarket.id, 'no')} className="flex-1 py-2.5 rounded-md bg-rose-600 text-white text-sm font-medium">Resolve NO</button>
                      </div>
                      <button onClick={() => setResolvingMarket(null)} className="w-full mt-2 py-2 text-sm text-stone-500">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {adminTab === 'ledger' && (
              <div>
                <h1 className="text-xl font-medium text-stone-900 mb-1">Ledger</h1>
                <p className="text-xs text-stone-500 mb-4">{ledger.length} entries</p>
                <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
                  <table className="w-full text-sm font-mono">
                    <thead className="bg-stone-50 border-b border-stone-200"><tr className="text-xs uppercase text-stone-500 font-sans"><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">Type</th><th className="text-right px-3 py-2">Amount</th><th className="text-left px-3 py-2 hidden md:table-cell">Description</th></tr></thead>
                    <tbody className="divide-y divide-stone-100">
                      {ledger.map(e => (
                        <tr key={e.id} className="text-xs">
                          <td className="px-3 py-2 text-stone-700">{e.userId}</td>
                          <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-xs ${e.type === 'deposit' ? 'bg-emerald-100 text-emerald-700' : e.type === 'trade' ? 'bg-blue-100 text-blue-700' : e.type === 'pledge' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-700'}`}>{e.type}</span></td>
                          <td className={`px-3 py-2 text-right ${e.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{e.amount >= 0 ? '+' : ''}{e.amount.toFixed(2)}</td>
                          <td className="px-3 py-2 text-stone-600 hidden md:table-cell">{e.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {adminTab === 'pledge' && (
              <div>
                <h1 className="text-xl font-medium text-stone-900 mb-1">The Clarion Pledge</h1>
                <p className="text-xs text-stone-500 mb-5">Cause allocation, four-way split</p>
                <div className="grid md:grid-cols-2 gap-3 mb-6">
                  <div className="p-5 rounded-lg bg-white border border-stone-200"><div className="text-xs uppercase text-stone-500 mb-2">Platform commitment</div><div className="text-3xl font-serif text-stone-900 mb-1">1%</div><div className="text-xs text-stone-600">of gross revenue, in perpetuity</div></div>
                  <div className="p-5 rounded-lg bg-white border border-stone-200"><div className="text-xs uppercase text-stone-500 mb-2">Founder pledge</div><div className="text-3xl font-serif text-stone-900 mb-1">1%</div><div className="text-xs text-stone-600">of equity, vests on liquidity event</div></div>
                </div>
                <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-200"><h3 className="text-sm font-medium text-stone-900">Cause allocation</h3></div>
                  <div className="divide-y divide-stone-100">
                    {communityImpact.byArea.map((c, i) => (
                      <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-10 text-xs text-stone-500">{c.pct}%</div>
                        <div className="flex-1"><div className="text-sm text-stone-900">{c.cause}</div><div className="mt-1 h-1 rounded-full bg-stone-100 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: c.pct * 4 + '%' }} /></div></div>
                        <div className="text-sm font-mono text-stone-700">${c.amount.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {adminTab === 'compliance' && (
              <div>
                <h1 className="text-xl font-medium text-stone-900 mb-4">Compliance controls</h1>
                <div className="space-y-3">
                  {[{ label: 'CFTC registration as Designated Contract Market', status: 'in_progress' }, { label: 'KYC provider integration (Persona)', status: 'ok' }, { label: 'OFAC sanctions screening on deposits', status: 'ok' }, { label: 'FBO segregated account (Evolve Bank)', status: 'ok' }, { label: '1 percent revenue pledge, charter amendment filed', status: 'ok' }, { label: 'SOC 2 Type II audit', status: 'in_progress' }].map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-white border border-stone-200">
                      <div className={`w-2 h-2 rounded-full ${c.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div className="flex-1 text-sm text-stone-900">{c.label}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status === 'ok' ? 'OK' : 'In progress'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {adminTab === 'investor' && (
              <div>
                <h1 className="text-xl font-medium text-stone-900 mb-1">Investor materials</h1>
                <p className="text-xs text-stone-500 mb-5">Pitch deck outline and one-pager</p>
                <div className="p-6 rounded-lg bg-white border border-stone-200">
                  <h3 className="text-sm font-medium text-stone-900 mb-3">One-pager preview</h3>
                  <div className="border border-stone-200 rounded bg-stone-50 p-6 text-sm">
                    <div className="flex items-center gap-2 mb-4"><Logo size={24} /><span className="font-serif text-stone-900">Clarion</span><span className="ml-auto text-xs text-stone-500">Seed round</span></div>
                    <h4 className="text-base font-serif text-stone-900 mb-2">The prediction market for the conversations that matter.</h4>
                    <p className="text-xs text-stone-700 mb-3">Curated markets across health, policy, culture, career, and science.</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><div className="text-stone-500 uppercase mb-1">Opportunity</div><p className="text-stone-700">$3.7B raised in category in 2025. One demographic served.</p></div>
                      <div><div className="text-stone-500 uppercase mb-1">Moat</div><p className="text-stone-700">Curation plus the Clarion Pledge plus analyst network.</p></div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-stone-200 text-xs text-stone-700"><span className="text-stone-500">Raising:</span> <span className="font-medium">$4M seed</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== LANDING PAGE ==========
const LandingPage = ({ onLogin, onSignup, markets, categories }) => {
  const trending = markets.filter(m => m.trending && m.status === 'open').slice(0, 3);
  const preview = markets.filter(m => m.status === 'open').slice(0, 6);
  return (
    <div className="min-h-screen bg-amber-50/40">
      <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-900">
        <Beaker className="w-3.5 h-3.5" />
        <span className="font-medium">Practice mode</span>
        <span className="hidden md:inline">— no real money, founding cohort only</span>
      </div>
      <header className="bg-white/80 backdrop-blur border-b border-amber-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-xl font-serif text-stone-900">Clarion</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLogin} className="px-4 py-2 rounded-full text-sm text-stone-700 hover:bg-stone-100">Sign in</button>
            <button onClick={onSignup} className="px-4 py-2 rounded-full bg-stone-900 text-white text-sm font-medium">Join</button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-xs text-amber-800 font-medium mb-5">
            <Flame className="w-3 h-3" /> Founding cohort — practice mode open now
          </div>
          <h1 className="text-4xl md:text-6xl font-serif text-stone-900 leading-tight mb-5">
            Back your reality TV takes with something real.
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed mb-8">
            Clarion is a prediction market for reality TV fans. Trade on Bachelor rose ceremonies, Survivor tribal councils, Housewives reunions, and more. 1% of every trade goes to causes that matter.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={onSignup} className="px-6 py-3 rounded-full bg-stone-900 text-white font-medium flex items-center gap-2">
              Join the founding cohort <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={onLogin} className="px-6 py-3 rounded-full border border-stone-200 text-stone-700 text-sm">Already have an account</button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-stone-700 uppercase tracking-wide">Live markets — sign in to trade</span>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mb-10">
          {preview.map(m => {
            const Cat = categories.find(c => c.id === m.category);
            const CatIcon = Cat ? Cat.icon : null;
            return (
              <div key={m.id} className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 border border-amber-100 relative">
                <div className="flex items-center gap-2 mb-2 text-xs text-stone-500">
                  {CatIcon && <CatIcon className="w-3 h-3" />}
                  <span className="capitalize">{m.category}</span>
                  {m.show && <><span className="text-stone-300">·</span><span className="font-medium text-stone-600">{m.show}</span></>}
                </div>
                <h3 className="text-base font-serif text-stone-900 leading-snug mb-3">{m.question}</h3>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-sm font-medium text-emerald-700 px-2.5 py-0.5 rounded-full bg-emerald-100/80">Yes {m.yes} cents</span>
                  <span className="text-sm font-medium text-rose-700 px-2.5 py-0.5 rounded-full bg-rose-100/80">No {m.no} cents</span>
                </div>
                <button onClick={onSignup} className="text-xs text-stone-500 flex items-center gap-1 hover:text-stone-800">
                  <Lock className="w-3 h-3" /> Sign in to trade
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-16">
          {[
            { icon: Tv, title: 'Reality TV markets', desc: 'Bachelor, Survivor, Traitors, Housewives, Love Island and more — markets that resolve weekly.' },
            { icon: Trophy, title: 'Leaderboard & profiles', desc: 'Track your accuracy, follow other traders, see who called it right before anyone else.' },
            { icon: HandHeart, title: 'The Clarion Pledge', desc: '1% of every trade supports women\'s health, mental health, economic empowerment, and reproductive rights.' },
          ].map((f, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-stone-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="text-sm font-medium text-stone-900 mb-2">{f.title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-stone-400">Clarion is in practice mode — no real money. Founding cohort only.</p>
        </div>
      </div>
    </div>
  );
};

// ========== AUTH MODAL ==========
const AuthModal = ({ mode, onClose, onAuth }) => {
  const [view, setView] = useState(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
  setError('');
  if (!email.includes('@')) { setError('Please enter a valid email.'); return; }
  if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
  if (view === 'signup' && !username.trim()) { setError('Please choose a username.'); return; }
  setLoading(true);
  onAuth({ mode: view, email, password, username });
  setLoading(false);
};

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 text-stone-400"><X className="w-5 h-5" /></button>
        <div className="flex items-center gap-2 mb-6">
          <Logo size={28} />
          <span className="font-serif text-stone-900">Clarion</span>
        </div>
        <h2 className="text-2xl font-serif text-stone-900 mb-1">
          {view === 'login' ? 'Welcome back' : 'Join the founding cohort'}
        </h2>
        <p className="text-sm text-stone-500 mb-6">
          {view === 'login' ? 'Sign in to your account' : 'Practice mode · No real money'}
        </p>

        {view === 'signup' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Username</label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus-within:border-stone-400">
              <AtSign className="w-4 h-4 text-stone-400 flex-shrink-0" />
              <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="yourname" className="bg-transparent text-sm focus:outline-none flex-1 text-stone-900" />
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-stone-600 mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900" />
        </div>

        <div className="mb-2">
          <label className="block text-xs font-medium text-stone-600 mb-1.5">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="••••••••" className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900" />
        </div>

        {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}

        <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium mt-4 disabled:opacity-60">
          {loading ? 'Just a moment…' : view === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <p className="text-center text-xs text-stone-500 mt-4">
          {view === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setError(''); }} className="text-stone-900 font-medium underline">
            {view === 'login' ? 'Join' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

// ========== ONBOARDING ==========
const Onboarding = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState('');
  const [selectedCause, setSelectedCause] = useState('');

  return (
    <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={28} />
          <span className="font-serif text-stone-900">Clarion</span>
          <span className="ml-auto text-xs text-stone-400">Step {step} of 2</span>
        </div>

        <div className="flex gap-1 mb-8">
          {[1, 2].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-stone-900' : 'bg-stone-100'}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-serif text-stone-900 mb-1">Welcome, @{user.username} 👋</h2>
            <p className="text-sm text-stone-500 mb-6">Tell us a little about yourself.</p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Bio <span className="text-stone-400 font-normal">(optional)</span></label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={160} placeholder="Reality TV obsessive, Survivor superfan, bad at keeping spoilers to myself…" className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none resize-none text-stone-900" rows={3} />
              <div className="text-right text-xs text-stone-400 mt-1">{160 - bio.length}</div>
            </div>
            <button onClick={() => setStep(2)} className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium">Continue</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-serif text-stone-900 mb-1">The Clarion Pledge</h2>
            <p className="text-sm text-stone-500 mb-6">1% of every trade you place goes to a cause you choose. Pick yours.</p>
            <div className="space-y-2 mb-6">
              {causeOptions.map(c => (
                <button key={c.id} onClick={() => setSelectedCause(c.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${selectedCause === c.id ? 'border-amber-300 bg-amber-50' : 'border-stone-100 bg-stone-50 hover:border-stone-200'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedCause === c.id ? 'border-amber-500 bg-amber-500' : 'border-stone-300'}`}>
                    {selectedCause === c.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900">{c.name}</div>
                    <div className="text-xs text-stone-400 truncate">{c.org}</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => onComplete({ bio, cause: selectedCause })} disabled={!selectedCause} className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium disabled:opacity-40">
              Start trading
            </button>
            <button onClick={() => onComplete({ bio, cause: '' })} className="w-full py-2 text-xs text-stone-400 mt-2">Skip for now</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== MAIN APP ==========
export default function Clarion() {
  // Auth state
  const [authUser, setAuthUser] = useState(null); // null = logged out
  const [authScreen, setAuthScreen] = useState(null); // 'login' | 'signup' | null
  const [onboarding, setOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState({ bio: '', cause: '' });

  const [markets, setMarkets] = useState(initialMarkets);
  const [ledger, setLedger] = useState(initialLedger);
  const [users] = useState(mockUsers);
  const [waitlist, setWaitlist] = useState(initialWaitlist);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [communityUsers, setCommunityUsers] = useState(initialCommunityUsers);

  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [tradeSide, setTradeSide] = useState(null);
  const [tradeAmount, setTradeAmount] = useState(10);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [balance, setBalance] = useState(50);
  const [positions, setPositions] = useState([]);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      const { data: balanceRow } = await supabase
        .from('balances')
        .select('balance')
        .eq('user_id', session.user.id)
        .single();
      const { data: positionRows } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', session.user.id);
      setAuthUser({
        id: session.user.id,
        email: session.user.email,
        username: profile?.username || session.user.email.split('@')[0],
        returning: true,
      });
      if (profile) {
        setUserProfile({
          bio: profile.bio || '',
          cause: profile.cause || '',
        });
      }
      if (balanceRow) {
        setBalance(balanceRow.balance);
      }
      if (positionRows) {
          setPositions(positionRows.map(p => ({
            id: p.id,
            marketId: p.market_id,
            market: p.market,
            category: p.category,
            side: p.side,
            shares: p.shares,
            avgPrice: p.avg_price,
            invested: p.invested,
          })));
        }
        const { data: adminRow } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setIsAdmin(!!adminRow);
      }
      setAuthLoading(false);
    });
  }, []); 

  const handleAuth = async (userData) => {
  if (userData.mode === 'signup') {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });
    if (error) { alert(error.message); return; }
    if (data.user) {
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        username: userData.username,
        bio: '',
        cause: '',
      });
      await supabase.from('balances').insert({
        user_id: data.user.id,
        balance: 50,
      });
      setAuthUser({ id: data.user.id, email: userData.email, username: userData.username });
      setAuthScreen(null);
      setOnboarding(true);
    }
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: userData.password,
    });
    if (error) { alert(error.message); return; }
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();
      const { data: balanceRow } = await supabase
        .from('balances')
        .select('balance')
        .eq('user_id', data.user.id)
        .single();
      const { data: positionRows } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', data.user.id);
      setAuthUser({
        id: data.user.id,
        email: userData.email,
        username: profile?.username || userData.email.split('@')[0],
        returning: true,
      });
      if (profile) {
        setUserProfile({
          bio: profile.bio || '',
          cause: profile.cause || '',
        });
      }
      if (balanceRow) {
        setBalance(balanceRow.balance);
      }
      if (positionRows) {
        setPositions(positionRows.map(p => ({
          id: p.id,
          marketId: p.market_id,
          market: p.market,
          category: p.category,
          side: p.side,
          shares: p.shares,
          avgPrice: p.avg_price,
          invested: p.invested,
        })));
      }
      const { data: adminRow } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle();
      setIsAdmin(!!adminRow);
      setAuthScreen(null);
    }
  }
};

  const handleOnboardingComplete = async (profileData) => {
  setUserProfile(profileData);
  setOnboarding(false);
  if (authUser) {
    await supabase
      .from('profiles')
      .update({
        bio: profileData.bio,
        cause: profileData.cause,
      })
      .eq('user_id', authUser.id);
  }
};

  const handleLogout = async () => {
  await supabase.auth.signOut();
  setAuthUser(null);
  setActiveTab('home');
  setSelectedMarket(null);
  setTradeSide(null);
  setPositions([]);
  setBalance(50);
};

if (authLoading) {
  return (
    <div className="min-h-screen bg-amber-50/40 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <Logo size={32} />
        <span className="text-xl font-serif text-stone-900">Clarion</span>
      </div>
    </div>
  );
}

  // Show landing page if not logged in
  if (!authUser) {
    return (
      <>
        <LandingPage
          onLogin={() => setAuthScreen('login')}
          onSignup={() => setAuthScreen('signup')}
          markets={initialMarkets}
          categories={categories}
        />
        {authScreen && (
          <AuthModal
            mode={authScreen}
            onClose={() => setAuthScreen(null)}
            onAuth={handleAuth}
          />
        )}
      </>
    );
  }

  // Show onboarding for new users
  if (onboarding) {
    return <Onboarding user={authUser} onComplete={handleOnboardingComplete} />;
  }

  const user = authUser;

  const handleFollowToggle = (userId) => {
    setCommunityUsers(prev => prev.map(u => u.id === userId ? { ...u, following: !u.following } : u));
  };

  const handleTrade = async () => {
  setShowConfirm(true);
  const price = tradeSide === 'yes' ? selectedMarket.yes : selectedMarket.no;
  const cost = (tradeAmount * price) / 100;
  const pledgeAmount = cost * 0.01;
  const newBalance = Math.max(0, balance - cost);
  const shares = Math.floor((tradeAmount / price) * 100);

  setBalance(newBalance);

  const newPosition = {
    id: 'p' + Date.now(),
    marketId: selectedMarket.id,
    market: selectedMarket.question,
    category: selectedMarket.category,
    side: tradeSide,
    shares,
    avgPrice: price,
    invested: cost,
  };
  setPositions(p => [...p, newPosition]);

  if (authUser) {
    // Save balance
    await supabase
      .from('balances')
      .update({ balance: newBalance })
      .eq('user_id', authUser.id);

    // Save position
// Save position
    const { data: savedPosition, error: positionError } = await supabase
      .from('positions')
      .insert({
        user_id: authUser.id,
        market_id: selectedMarket.id,
        market: selectedMarket.question,
        category: selectedMarket.category,
        side: tradeSide,
        shares,
        avg_price: price,
        invested: cost,
      })
      .select()
      .single();


    // Save ledger entries
    await supabase.from('ledger').insert([
      {
        user_id: authUser.id,
        type: 'trade',
        amount: -cost,
        ref: 'trd_' + Date.now(),
        description: tradeSide.toUpperCase() + ' practice trade — ' + selectedMarket.question,
      },
      {
        user_id: authUser.id,
        type: 'pledge',
        amount: -pledgeAmount,
        ref: 'trd_' + Date.now(),
        description: '1% pledge',
      },
    ]);
  }

  setTimeout(() => {
    setShowConfirm(false);
    setTradeSide(null);
    setSelectedMarket(null);
  }, 1800);
};

  // Profile view
  if (viewingProfile) {
    return <UserProfileView profileUser={viewingProfile} onClose={() => setViewingProfile(null)} onFollowToggle={handleFollowToggle} myPositions={positions} markets={markets} onViewMarket={setSelectedMarket} />;
  }

  // Trade modal
  if (selectedMarket && tradeSide) {
    const price = tradeSide === 'yes' ? selectedMarket.yes : selectedMarket.no;
    const shares = Math.floor((tradeAmount / price) * 100);
    const cost = (tradeAmount * price) / 100;
    const pledgeAmount = cost * 0.01;
    const cause = causesByCategory[selectedMarket.category];
    return (
      <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-xs uppercase text-amber-900 font-medium flex items-center gap-1"><Beaker className="w-3 h-3" /> Practice mode</div>
          {showConfirm ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-emerald-600" /></div>
              <h3 className="text-xl font-serif text-stone-900 mb-2">Position opened</h3>
              <p className="text-stone-600 text-sm mb-3">{shares} shares of {tradeSide.toUpperCase()} at {price} cents</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-900"><HandHeart className="w-3 h-3" /><span>1 percent pledged to {cause.name}</span></div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6 mt-2">
                <button onClick={() => setTradeSide(null)}><ArrowLeft className="w-5 h-5 text-stone-400" /></button>
                <button onClick={() => { setTradeSide(null); setSelectedMarket(null); }}><X className="w-5 h-5 text-stone-400" /></button>
              </div>
              <p className="text-xs uppercase text-stone-500 mb-2">Placing trade</p>
              <h3 className="text-lg font-serif text-stone-900 mb-6 leading-snug">{selectedMarket.question}</h3>
              <div className={`rounded-2xl p-4 mb-4 ${tradeSide === 'yes' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                <div className="flex justify-between items-baseline">
                  <span className={`font-medium ${tradeSide === 'yes' ? 'text-emerald-700' : 'text-rose-700'}`}>{tradeSide.toUpperCase()}</span>
                  <span className={`text-2xl font-serif ${tradeSide === 'yes' ? 'text-emerald-700' : 'text-rose-700'}`}>{price} cents</span>
                </div>
              </div>
              <label className="block text-xs uppercase text-stone-500 mb-2">Amount</label>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-serif text-stone-900">$</span>
                <input type="number" value={tradeAmount} onChange={e => setTradeAmount(Math.max(1, parseInt(e.target.value) || 0))} className="text-3xl font-serif text-stone-900 bg-transparent border-b border-stone-200 w-full focus:outline-none pb-1" />
              </div>
              <div className="flex gap-2 mb-4">{[5, 10, 25, 50].map(amt => <button key={amt} onClick={() => setTradeAmount(amt)} className="px-3 py-1 text-xs rounded-full bg-stone-100 text-stone-700">${amt}</button>)}</div>
              <div className="bg-stone-50 rounded-2xl p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-stone-500">Shares</span><span className="text-stone-900 font-medium">{shares}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">If right</span><span className="text-emerald-600 font-medium">+${shares - tradeAmount}</span></div>
                <div className="flex justify-between pt-2 border-t border-stone-200"><span className="text-stone-500">Balance</span><span className="text-stone-900 font-medium">${balance.toFixed(2)}</span></div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-100 mb-5">
                <HandHeart className="w-4 h-4 text-amber-700" />
                <div className="flex-1 text-xs text-amber-900 leading-snug"><span className="font-medium">1 percent of this trade (${pledgeAmount.toFixed(2)})</span> supports {cause.name}</div>
              </div>
              <button onClick={handleTrade} disabled={tradeAmount > balance} className={`w-full py-4 rounded-2xl font-medium text-white ${tradeSide === 'yes' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                {tradeAmount > balance ? 'Insufficient balance' : 'Confirm practice trade'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Market detail
  if (selectedMarket) {
    const Cat = categories.find(c => c.id === selectedMarket.category);
    const CatIcon = Cat ? Cat.icon : null;
    return (
      <div className="min-h-screen bg-amber-50/40 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto p-4 md:p-6">
          <button onClick={() => setSelectedMarket(null)} className="flex items-center gap-2 text-stone-600 mb-4 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
          <div className="bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 rounded-3xl p-5 md:p-8 shadow-sm border border-amber-100 mb-4 relative">
            <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs uppercase text-amber-800 font-medium flex items-center gap-1"><Beaker className="w-3 h-3" /> Practice</div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-xs text-stone-700">{CatIcon && <CatIcon className="w-3 h-3" />}<span className="capitalize">{selectedMarket.category}</span></div>
              {selectedMarket.show && <div className="px-3 py-1 rounded-full bg-amber-100 text-xs font-medium text-amber-800">{selectedMarket.show}</div>}
              <span className="text-xs text-stone-400">Resolves {selectedMarket.ends}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif text-stone-900 leading-tight mb-4">{selectedMarket.question}</h1>
            <p className="text-stone-600 leading-relaxed mb-6 text-sm md:text-base">{selectedMarket.context}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => setTradeSide('yes')} className="p-4 md:p-5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left">
                <div className="text-xs uppercase text-emerald-700 mb-1">Yes</div>
                <div className="text-2xl md:text-3xl font-serif text-emerald-800">{selectedMarket.yes} cents</div>
              </button>
              <button onClick={() => setTradeSide('no')} className="p-4 md:p-5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-left">
                <div className="text-xs uppercase text-rose-700 mb-1">No</div>
                <div className="text-2xl md:text-3xl font-serif text-rose-800">{selectedMarket.no} cents</div>
              </button>
            </div>
            <div className="pt-4 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-500">
              <HandHeart className="w-3.5 h-3.5 text-amber-600" />
              <span>1 percent of every trade supports {causesByCategory[selectedMarket.category].name}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filtered = markets.filter(m => (activeCategory === 'all' || m.category === activeCategory) && m.status === 'open');
  const trending = markets.filter(m => m.trending && m.status === 'open').slice(0, 3);

  const tabs = ['home', 'markets', 'feed', 'leaderboard', 'positions', 'profile', 'impact', 'about'];

  return (
    <div className="min-h-screen bg-amber-50/40 pb-24 md:pb-6">
      <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-900">
        <Beaker className="w-3.5 h-3.5" />
        <span className="font-medium">Practice mode</span>
        <span className="hidden md:inline">— no real money</span>
        <button onClick={() => setShowWaitlist(true)} className="underline font-medium ml-1">Real-money waitlist ({waitlist.length})</button>
      </div>

      {showWaitlist && <WaitlistModal onClose={() => setShowWaitlist(false)} waitlist={waitlist} setWaitlist={setWaitlist} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} markets={markets} setMarkets={setMarkets} ledger={ledger} setLedger={setLedger} users={users} submissions={submissions} setSubmissions={setSubmissions} waitlist={waitlist} />}

      <header className="bg-white/80 backdrop-blur border-b border-amber-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2">
              <Logo size={32} />
              <span className="text-xl font-serif text-stone-900">Clarion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-sm">
                <span className="text-xs text-stone-500 hidden md:inline">Practice $</span>
                <span className="font-medium text-stone-900">${balance.toFixed(2)}</span>
              </div>
              <div className="relative">
                <button onClick={() => setShowDevMenu(!showDevMenu)} className="flex items-center gap-2">
                  <Avatar username={user.username || user.email} size={32} />
                </button>
                {showDevMenu && (
                  <div>
                    <div className="fixed inset-0 z-20" onClick={() => setShowDevMenu(false)} />
                    <div className="absolute right-0 top-10 w-60 bg-stone-900 text-white rounded-xl p-2 z-30 shadow-2xl">
                      <div className="px-3 py-2 text-xs text-stone-400 border-b border-stone-800 mb-1">
                        <div className="font-medium text-white">@{user.username || user.email.split('@')[0]}</div>
                        <div className="text-stone-500">{user.email}</div>
                      </div>
                      <button onClick={() => { setActiveTab('profile'); setShowDevMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-stone-800 text-sm text-left"><UserCircle className="w-4 h-4" /> My profile</button>
{isAdmin && (
  <button onClick={() => { setShowAdmin(true); setShowDevMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-stone-800 text-sm text-left"><Settings className="w-4 h-4" /> Admin console</button>
)}                      <div className="border-t border-stone-800 mt-1 pt-1">
                        <button onClick={() => { handleLogout(); setShowDevMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-stone-800 text-sm text-left text-rose-400"><LogOut className="w-4 h-4" /> Sign out</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 text-sm overflow-x-auto pb-0.5">
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-3 md:px-4 py-2 rounded-full whitespace-nowrap capitalize flex items-center gap-1.5 ${activeTab === t ? 'bg-stone-900 text-white' : 'text-stone-600'}`}>
                {t === 'feed' && <Users className="w-3 h-3" />}
                {t === 'leaderboard' && <Trophy className="w-3 h-3" />}
                {t === 'profile' && <UserCircle className="w-3 h-3" />}
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6">

        {activeTab === 'home' && (
          <div>
            <div className="mb-5 p-5 md:p-8 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-amber-300/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-rose-300/15 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3"><Flame className="w-4 h-4 text-amber-200" /><span className="text-xs uppercase text-amber-200">Trending today</span></div>
                <h2 className="text-xl md:text-2xl font-serif mb-4 leading-snug">{trending[0] ? trending[0].question : ''}</h2>
                <button onClick={() => setSelectedMarket(trending[0])} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-200 text-stone-900 text-sm font-medium">Make a prediction <ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="mb-6 p-5 rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 border border-amber-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center flex-shrink-0"><HandHeart className="w-6 h-6 text-stone-800" /></div>
                <div className="flex-1">
                  <h3 className="text-base font-serif text-stone-900 mb-1">The Clarion Pledge</h3>
                  <p className="text-sm text-stone-700 mb-3 leading-relaxed">1 percent of every trade supports women's health, mental health, economic empowerment, and reproductive rights. Community total: <span className="font-medium text-stone-900">${communityImpact.totalGiven.toLocaleString()}</span>.</p>
                  <button onClick={() => setActiveTab('impact')} className="text-xs font-medium text-stone-900 hover:underline">See the impact →</button>
                </div>
              </div>
            </div>
            <h2 className="text-sm font-medium text-stone-900 uppercase mb-3">All markets</h2>
            <div className="space-y-3">
              {markets.filter(m => m.status === 'open').map(m => {
                const Cat = categories.find(c => c.id === m.category);
                const CatIcon = Cat ? Cat.icon : null;
                return (
                  <button key={m.id} onClick={() => setSelectedMarket(m)} className="w-full text-left p-4 md:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 hover:from-amber-100 border border-amber-100">
                    <div className="flex items-center gap-2 mb-2 text-xs text-stone-600">{CatIcon && <CatIcon className="w-3 h-3" />}<span className="capitalize">{m.category}</span>{m.show && <><span className="text-stone-300">·</span><span className="font-medium text-stone-700">{m.show}</span></>}<span className="text-stone-300">·</span><span>{m.volume}</span></div>
                    <h3 className="text-base md:text-lg font-serif text-stone-900 leading-snug mb-3">{m.question}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-emerald-700 px-2.5 py-0.5 rounded-full bg-emerald-100/80">Yes {m.yes} cents</span>
                      <span className="text-sm font-medium text-rose-700 px-2.5 py-0.5 rounded-full bg-rose-100/80">No {m.no} cents</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'markets' && (
          <div>
            <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
              {categories.map(c => { const Icon = c.icon; return (
                <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap ${activeCategory === c.id ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-200'}`}>
                  <Icon className="w-3.5 h-3.5" />{c.name}
                </button>
              ); })}
            </div>
            <div className="space-y-3">
              {filtered.map(m => {
                const Cat = categories.find(c => c.id === m.category);
                const CatIcon = Cat ? Cat.icon : null;
                return (
                  <button key={m.id} onClick={() => setSelectedMarket(m)} className="w-full text-left p-4 md:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 border border-amber-100">
                    <div className="flex items-center gap-2 mb-2 text-xs text-stone-600">{CatIcon && <CatIcon className="w-3 h-3" />}<span className="capitalize">{m.category}</span>{m.show && <><span className="text-stone-300">·</span><span className="font-medium text-stone-700">{m.show}</span></>}</div>
                    <h3 className="text-base md:text-lg font-serif text-stone-900 leading-snug mb-3">{m.question}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-emerald-700 px-2.5 py-0.5 rounded-full bg-emerald-100/80">Yes {m.yes} cents</span>
                      <span className="text-sm font-medium text-rose-700 px-2.5 py-0.5 rounded-full bg-rose-100/80">No {m.no} cents</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'feed' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-xl md:text-2xl font-serif text-stone-900">Activity feed</h1>
                <p className="text-sm text-stone-500">People you follow · 280 char comments</p>
              </div>
              <button onClick={() => setActiveTab('leaderboard')} className="text-xs text-stone-500 underline">Find traders</button>
            </div>
            <ActivityFeed communityUsers={communityUsers} setCommunityUsers={setCommunityUsers} markets={markets} onViewProfile={setViewingProfile} onViewMarket={setSelectedMarket} />
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div>
            <div className="mb-5">
              <h1 className="text-xl md:text-2xl font-serif text-stone-900">Leaderboard</h1>
              <p className="text-sm text-stone-500">Ranked by accuracy on resolved markets</p>
            </div>
            <LeaderboardTab communityUsers={communityUsers} setCommunityUsers={setCommunityUsers} onViewProfile={setViewingProfile} />
          </div>
        )}

        {activeTab === 'positions' && (
          <div>
            <h1 className="text-xl md:text-2xl font-serif text-stone-900 mb-1">Your positions</h1>
            <p className="text-sm text-stone-500 mb-4">{positions.length} open</p>
            {positions.length > 0 ? (
              <div className="space-y-3">
                {positions.map(p => (
                  <div key={p.id} className="p-4 md:p-5 rounded-2xl bg-white border border-stone-100">
                    <h3 className="text-sm font-serif text-stone-900 mb-2">{p.market}</h3>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.side === 'yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{p.side.toUpperCase()}</span>
                      <span className="text-sm text-stone-500">{p.shares} shares at {p.avgPrice} cents</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-100 text-center">
                <h3 className="text-lg font-serif text-stone-900 mb-2">No positions yet</h3>
                <button onClick={() => setActiveTab('markets')} className="px-6 py-2 rounded-full bg-stone-900 text-white text-sm">Browse markets</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <h1 className="text-xl md:text-2xl font-serif text-stone-900 mb-5">My profile</h1>
            <MyProfileTab balance={balance} positions={positions} markets={markets} demoUser={user} userProfile={userProfile} setUserProfile={setUserProfile} onLogout={handleLogout} />
          </div>
        )}

        {activeTab === 'impact' && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center"><HandHeart className="w-6 h-6 text-stone-800" /></div>
              <div><h1 className="text-xl md:text-2xl font-serif text-stone-900">Your impact</h1><p className="text-sm text-stone-500">The Clarion Pledge</p></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5 mb-5">
              <div className="p-4 rounded-2xl bg-white border border-stone-100"><div className="text-xs uppercase text-stone-500 mb-1">You have given</div><div className="text-2xl font-serif text-stone-900">$0.00</div></div>
              <div className="p-4 rounded-2xl bg-white border border-stone-100"><div className="text-xs uppercase text-stone-500 mb-1">Clarion matched</div><div className="text-2xl font-serif text-emerald-700">+$0.00</div></div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-200 col-span-2 md:col-span-1"><div className="text-xs uppercase text-amber-800 mb-1">Community total</div><div className="text-2xl font-serif text-amber-900">${communityImpact.totalGiven.toLocaleString()}</div></div>
            </div>
            <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden">
              <div className="p-5 border-b border-stone-100"><h3 className="text-sm font-medium text-stone-900 uppercase">Cause allocation</h3></div>
              <div className="divide-y divide-stone-100">
                {communityImpact.byArea.map((c, i) => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <div className="w-10 text-right text-sm font-serif text-stone-900">{c.pct}%</div>
                    <div className="flex-1"><div className="text-sm text-stone-900 mb-1">{c.cause}</div><div className="h-1.5 rounded-full bg-stone-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-rose-400" style={{ width: c.pct * 4 + '%' }} /></div></div>
                    <div className="text-sm font-medium text-stone-900">${c.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-2xl">
            <div className="mb-6 p-8 rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 border border-amber-200">
              <h1 className="text-3xl md:text-4xl font-serif text-stone-900 leading-tight mb-3">The prediction market for reality TV.</h1>
              <p className="text-base text-stone-700 leading-relaxed">Curated markets across Bachelor Nation, Bravo, Survivor, Netflix, and more. You already know who's going home — now back it. 1 percent of every trade goes to causes that matter.</p>
            </div>
            <h2 className="text-lg font-serif text-stone-900 mb-3">How we decide what to list</h2>
            <p className="text-sm text-stone-700 leading-relaxed mb-5">Reality TV prediction markets work when the questions resolve cleanly and publicly. We only list markets where the outcome is unambiguous — broadcast results, confirmed cast decisions, and publicly verifiable events. No gossip, no speculation about private lives.</p>
            <div className="grid md:grid-cols-2 gap-3 mb-8">
              <div className="p-5 rounded-2xl bg-white border border-stone-100">
                <div className="flex items-center gap-2 mb-2"><div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-emerald-700" /></div><h3 className="text-sm font-medium text-stone-900">We list</h3></div>
                <ul className="space-y-2 text-sm text-stone-700">
                  <li>· Episode eliminations and rose ceremonies</li>
                  <li>· Finale outcomes and engagements</li>
                  <li>· Tribal council votes</li>
                  <li>· Reunion appearances</li>
                  <li>· Season renewals</li>
                  <li>· Cast-wide milestones</li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-stone-100">
                <div className="flex items-center gap-2 mb-2"><div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center"><X className="w-3.5 h-3.5 text-rose-700" /></div><h3 className="text-sm font-medium text-stone-900">We do not list</h3></div>
                <ul className="space-y-2 text-sm text-stone-700">
                  <li>· Markets based on unverified spoilers</li>
                  <li>· Private relationships off-camera</li>
                  <li>· Anything production crew could manipulate</li>
                  <li>· Personal health or legal situations</li>
                  <li>· Unconfirmed casting rumors</li>
                  <li>· Markets that reward insider knowledge</li>
                </ul>
              </div>
            </div>
            <h2 className="text-lg font-serif text-stone-900 mb-3">On insider trading</h2>
            <p className="text-sm text-stone-700 leading-relaxed mb-3">Production crews, network employees, and post-production staff are required to disclose their employment at signup. Matched users are blocked from trading on shows they have access to. Weekly markets close one hour before air. Finale markets close 48 hours before broadcast.</p>
            <p className="text-sm text-stone-700 leading-relaxed">We'd rather run fewer markets cleanly than more markets badly.</p>
          </div>
        )}
      </div>
    </div>
  );
}