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

const BuyCreditsModal = ({ onClose }) => {
  const [selected, setSelected] = useState("plus");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    const { data, error: invokeError } = await supabase.functions.invoke(
      "create-checkout-session",
      { body: { packageId: selected } },
    );
    if (invokeError || !data?.url) {
      setLoading(false);
      setError("Couldn't start checkout. Please try again.");
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
        {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          {loading ? "Opening checkout…" : "Continue to payment"}
        </button>
        <p className="text-xs text-stone-400 text-center mt-3">
          Payments are processed by Stripe. We never see your card details.
        </p>
      </div>
    </div>
  );
};

export default BuyCreditsModal;
