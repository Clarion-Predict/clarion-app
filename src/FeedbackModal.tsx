import React, { useState } from "react";
import { supabase } from "./supabase";
import { X, MessageCircle, Check } from "lucide-react";

// Kept in sync with the labels used in the admin console's Feedback tab.
export const FEEDBACK_CATEGORIES = [
  { id: "bug", label: "Something's broken" },
  { id: "idea", label: "Feature idea" },
  { id: "market", label: "Market suggestion" },
  { id: "other", label: "Something else" },
];

const FeedbackModal = ({ onClose, authUser }) => {
  const [category, setCategory] = useState("bug");
  // Prefilled from the account as a convenience, and editable — both fields
  // are optional, so a blank submission is still valid.
  const [name, setName] = useState(authUser?.username || "");
  const [email, setEmail] = useState(authUser?.email || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!message.trim()) {
      setError("Tell us a bit about it first.");
      return;
    }
    setSending(true);
    setError("");
    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: authUser?.id ?? null,
      name: name.trim() || null,
      email: email.trim() || null,
      category,
      message: message.trim(),
    });
    setSending(false);
    if (insertError) {
      console.error("feedback insert:", insertError);
      setError("Couldn't send that. Please try again.");
      return;
    }
    setSent(true);
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

        {sent ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-serif text-stone-900 mb-2">
              Thank you!
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              We read every piece of feedback.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-stone-900 text-white text-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-200 to-emerald-100 flex items-center justify-center mb-5">
              <MessageCircle className="w-7 h-7 text-emerald-800" />
            </div>
            <h2 className="text-2xl font-serif text-stone-900 mb-2">
              Send feedback
            </h2>
            <p className="text-sm text-stone-500 mb-5">
              Found a bug, or thought of something we should build? Tell us.
            </p>

            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              What's this about?
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900 mb-4"
            >
              {FEEDBACK_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Your feedback
            </label>
            <textarea
              autoFocus
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError("");
              }}
              rows={5}
              maxLength={4000}
              placeholder="What happened, or what would you like to see?"
              className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 resize-none text-stone-900 mb-4"
            />

            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Name{" "}
                  <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Email{" "}
                  <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
                />
              </div>
            </div>
            <p className="text-xs text-stone-400 mb-4">
              Only if you'd like us to be able to follow up.
            </p>

            {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}

            <button
              onClick={submit}
              disabled={sending}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send feedback"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
