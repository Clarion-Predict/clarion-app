import React, { useState } from "react";
import { supabase } from "./supabase";
import { X, CreditCard, Zap } from "lucide-react";

// Display copy only — real prices live server-side in the
// create-checkout-session edge function and are matched by id.
const PACKAGES = [
  { id: "starter", credits: 5, price: "$5" },
  { id: "standard", credits: 10, price: "$10" },
  { id: "plus", credits: 25, price: "$25", popular: true },
  { id: "max", credits: 50, price: "$50" },
];

// Mirrors MIN_CUSTOM_USD / MAX_CUSTOM_USD in create-checkout-session. These are
// for the message and the input's bounds only — the server re-checks and is
// the one that decides.
const MIN_CUSTOM = 5;
const MAX_CUSTOM = 500;

const BuyCreditsModal = ({ onClose }) => {
  const [selected, setSelected] = useState("plus");
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isCustom = selected === "custom";
  const customValue = Number(customAmount);
  const customValid =
    customAmount !== "" &&
    Number.isFinite(customValue) &&
    customValue >= MIN_CUSTOM &&
    customValue <= MAX_CUSTOM;

  const handleCheckout = async () => {
    if (isCustom && !customValid) {
      setError(`Enter an amount between $${MIN_CUSTOM} and $${MAX_CUSTOM}.`);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: invokeError } = await supabase.functions.invoke(
      "create-checkout-session",
      { body: isCustom ? { amount: customValue } : { packageId: selected } },
    );
    if (invokeError || !data?.url) {
      setLoading(false);
      // Prefer the server's message — it knows the real limits.
      setError(data?.error || "Couldn't start checkout. Please try again.");
      return;
    }
    window.location.href = data.url; // off to Stripe's hosted payment page
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center mb-5">
          <Zap className="w-7 h-7 text-stone-800" />
        </div>
        <h2 className="text-2xl font-serif text-stone-900 mb-2">Add credits</h2>
        <p className="text-sm text-stone-500 mb-5">
          Pick a package and pay securely with Stripe. Credits land in your
          balance as soon as the payment clears.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {PACKAGES.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`relative p-4 rounded-2xl border text-left ${
                selected === p.id
                  ? "border-amber-400 bg-amber-50"
                  : "border-stone-200 bg-stone-50"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-stone-900 text-white text-[10px] font-medium">
                  Popular
                </span>
              )}
              <div className="text-lg font-serif text-stone-900">
                {p.credits} credits
              </div>
              <div className="text-xs text-stone-500 mt-0.5">{p.price}</div>
            </button>
          ))}
        </div>
        {/* Wrapper is a div, not a button: an <input> nested inside a
            <button> is invalid HTML and focus behaves inconsistently. */}
        <div
          className={`w-full p-4 rounded-2xl border mb-5 ${
            isCustom
              ? "border-amber-400 bg-amber-50"
              : "border-stone-200 bg-stone-50"
          }`}
        >
          <button
            onClick={() => setSelected("custom")}
            className="w-full text-left"
          >
            <div className="text-lg font-serif text-stone-900">
              Custom amount
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              ${MIN_CUSTOM}–${MAX_CUSTOM}, $1 = 1 credit
            </div>
          </button>
          {isCustom && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-white border border-stone-200 focus-within:border-stone-400">
              <span className="text-lg font-serif text-stone-900">$</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                min={MIN_CUSTOM}
                max={MAX_CUSTOM}
                step="1"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCheckout()}
                placeholder="25"
                className="flex-1 bg-transparent text-lg font-serif text-stone-900 focus:outline-none w-full"
              />
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          {loading
            ? "Opening checkout…"
            : isCustom && customValid
              ? `Continue — $${customValue.toFixed(2)}`
              : "Continue to payment"}
        </button>
        <p className="text-xs text-stone-400 text-center mt-3">
          Payments are processed by Stripe. We never see your card details.
        </p>
      </div>
    </div>
  );
};

export default BuyCreditsModal;
