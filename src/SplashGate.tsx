import React, { useState } from "react";
import { Lock } from "lucide-react";
import cajugaLogo from "./cajuga-logo.svg";

// TEMPORARY pre-launch splash gate (added Aug 2026, intended to be removed).
// To remove: delete this file and unwrap <SplashGate> in src/index.tsx.
//
// The password is a soft gate for the teaser period, not a security control —
// it ships in the JS bundle, so treat it like a velvet rope, not a lock.
const SPLASH_PASSWORD = "cajuga2026";
const UNLOCK_KEY = "cajuga_splash_unlocked";

const SplashGate = ({ children }: { children: React.ReactNode }) => {
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(UNLOCK_KEY) === "yes",
  );
  const [showEntry, setShowEntry] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const tryUnlock = () => {
    if (password === SPLASH_PASSWORD) {
      localStorage.setItem(UNLOCK_KEY, "yes");
      setUnlocked(true);
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="absolute inset-0 bg-amber-50/40 flex flex-col items-center justify-center p-6">
        <div className="absolute top-4 left-4">
          <button
            onClick={() => {
              setShowEntry(!showEntry);
              setError(false);
            }}
            aria-label="Team entry"
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-300 hover:text-stone-500 hover:bg-stone-100"
          >
            <Lock className="w-4 h-4" />
          </button>
          {showEntry && (
            <div className="mt-2 p-3 rounded-2xl bg-white border border-stone-200 shadow-lg w-56">
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") tryUnlock();
                }}
                placeholder="Password"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
              />
              {error && (
                <p className="text-xs text-rose-600 mt-1.5">
                  That's not it — try again.
                </p>
              )}
              <button
                onClick={tryUnlock}
                className="w-full mt-2 py-2 rounded-xl bg-stone-900 text-white text-xs font-medium"
              >
                Enter
              </button>
            </div>
          )}
        </div>
        <img src={cajugaLogo} alt="Cajuga" width={96} height={96} />
        <h1 className="mt-6 text-3xl md:text-4xl brand-font text-stone-900 text-center">
          Cajuga is coming soon!
        </h1>
      </div>
    </div>
  );
};

export default SplashGate;
