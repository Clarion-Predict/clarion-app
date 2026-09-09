import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Logo, autoCheckSubmission, insertSubmission } from "./shared";

// ========== SUGGEST MARKET MODAL ==========
const SuggestMarketModal = ({ onClose, authUser }) => {
  const [question, setQuestion] = useState("");
  const [show, setShow] = useState("");
  const [category, setCategory] = useState("");
  const [context, setContext] = useState("");
  const [endsHint, setEndsHint] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (!show.trim()) {
      setError("Please enter the show name.");
      return;
    }
    setLoading(true);
    const { checks, rejectReason } = autoCheckSubmission(question.trim());
    const { error: submitError } = await insertSubmission({
      user_id: authUser.id,
      username: authUser.username,
      question: question.trim(),
      show: show.trim(),
      category,
      context: context.trim(),
      ends_hint: endsHint.trim(),
      status: "pending",
      source: "community",
      submitter: authUser.username,
      auto_checks: checks,
      reject_reason: rejectReason,
    });
    setLoading(false);
    if (submitError) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400"
        >
          <X className="w-5 h-5" />
        </button>
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-serif text-stone-900 mb-2">
              Market submitted!
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              We'll review your suggestion and list it if it meets our content
              standards. Thanks for contributing!
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-stone-900 text-white text-sm"
            >
              Back to Cajuga
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Logo size={28} />
              <span className="font-serif text-stone-900">
                Suggest a market
              </span>
            </div>
            <p className="text-sm text-stone-500 mb-6">
              Got a question worth trading on? Submit it and we'll review it for
              listing.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  The question <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Will Jenny get a rose tonight?"
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
                />
                <p className="text-xs text-stone-400 mt-1">
                  Must be a yes/no question with a clear public resolution.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Show <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={show}
                  onChange={(e) => setShow(e.target.value)}
                  placeholder="The Bachelor"
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
                >
                  <option value="">Select a category</option>
                  <option value="spotlight">Spotlight</option>
                  <option value="dating">Dating & Love</option>
                  <option value="competition">Competition</option>
                  <option value="housewives">Housewives & Bravo</option>
                  <option value="lifestyle">Family & Lifestyle</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Context{" "}
                  <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="A sentence or two explaining why this is worth trading on..."
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 resize-none text-stone-900"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Resolution date{" "}
                  <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={endsHint}
                  onChange={(e) => setEndsHint(e.target.value)}
                  placeholder="e.g. Jun 10, 2026"
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
                />
              </div>
            </div>
            {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium mt-6 disabled:opacity-60"
            >
              {loading ? "Submitting…" : "Submit for review"}
            </button>
            <p className="text-xs text-stone-400 text-center mt-3">
              All submissions are manually reviewed before listing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== SEARCH MODAL ==========

export default SuggestMarketModal;
