import React, { useState } from 'react';
import { CheckCircle2, Star } from 'lucide-react';

function StarRatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm font-medium text-[#FFF8ED]">{label}</span>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${star} out of 5 stars`}
            className="p-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFC247] rounded"
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                star <= value ? 'fill-[#FFC247] text-[#FFC247]' : 'text-[#FFF8ED]/25'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedbackSection() {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [foodRating, setFoodRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [ambianceRating, setAmbianceRating] = useState(5);
  const [overallRating, setOverallRating] = useState(5);
  const [writtenFeedback, setWrittenFeedback] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          foodRating,
          serviceRating,
          ambianceRating,
          overallRating,
          writtenFeedback,
          suggestions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit feedback.');
      } else {
        setSubmittedRef(data.referenceNumber);
        setCustomerName('');
        setCustomerPhone('');
        setWrittenFeedback('');
        setSuggestions('');
      }
    } catch {
      setError('Network error submitting feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="feedback"
      className="py-16 lg:py-24 bg-[#0B0907] text-[#FFF8ED] border-b border-[#FFC247]/12"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-[#FFC247] mb-2">Your Voice Matters</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#FFF8ED] tracking-tight">
            Share Private Dining Feedback
          </h2>
          <p className="text-sm sm:text-base text-[#FFF8ED]/70 mt-2">
            Help our kitchen and hospitality team serve you better. Private feedback is reviewed
            directly by restaurant management.
          </p>
        </div>

        {submittedRef ? (
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950/40 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="font-display font-bold text-2xl text-[#FFF8ED] mb-2">
              Thank You for Your Feedback!
            </h3>
            <p className="text-sm text-[#FFF8ED]/80 mb-4">
              Your feedback has been recorded securely for our management team.
            </p>
            <p className="inline-block px-4 py-2 rounded-xl bg-[#0B0907] border border-emerald-500/30 font-mono text-sm font-semibold text-emerald-300">
              Reference Number: {submittedRef}
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setSubmittedRef(null)}
                className="text-sm font-semibold text-[#FFC247] hover:underline cursor-pointer"
              >
                Submit another response
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#FFC247]/20 bg-[#16110D] p-6 sm:p-8 space-y-6"
          >
            {error && (
              <div className="p-3.5 rounded-xl bg-[#B83B24]/25 border border-[#E87522]/40 text-sm text-[#FFD2C8]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="fb-name"
                  className="block text-xs font-semibold text-[#FFF8ED]/85 mb-1.5"
                >
                  Your Name (Optional)
                </label>
                <input
                  id="fb-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#FFC247]/20 bg-[#0B0907] text-sm text-[#FFF8ED] placeholder:text-[#FFF8ED]/40 focus:outline-none focus:ring-2 focus:ring-[#E87522]"
                />
              </div>
              <div>
                <label
                  htmlFor="fb-phone"
                  className="block text-xs font-semibold text-[#FFF8ED]/85 mb-1.5"
                >
                  Mobile Number (Optional)
                </label>
                <input
                  id="fb-phone"
                  type="tel"
                  inputMode="numeric"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#FFC247]/20 bg-[#0B0907] text-sm text-[#FFF8ED] placeholder:text-[#FFF8ED]/40 font-mono focus:outline-none focus:ring-2 focus:ring-[#E87522]"
                />
              </div>
            </div>

            <div className="divide-y divide-[#FFC247]/12 border-y border-[#FFC247]/12 py-2">
              <StarRatingInput
                label="Food Quality Rating"
                value={foodRating}
                onChange={setFoodRating}
              />
              <StarRatingInput
                label="Service Rating"
                value={serviceRating}
                onChange={setServiceRating}
              />
              <StarRatingInput
                label="Ambiance Rating"
                value={ambianceRating}
                onChange={setAmbianceRating}
              />
              <StarRatingInput
                label="Overall Experience Rating"
                value={overallRating}
                onChange={setOverallRating}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="fb-written"
                  className="block text-xs font-semibold text-[#FFF8ED]/85 mb-1.5"
                >
                  Written Feedback
                </label>
                <textarea
                  id="fb-written"
                  rows={3}
                  value={writtenFeedback}
                  onChange={(e) => setWrittenFeedback(e.target.value)}
                  placeholder="Tell us about your dishes and dining experience..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#FFC247]/20 bg-[#0B0907] text-sm text-[#FFF8ED] placeholder:text-[#FFF8ED]/40 focus:outline-none focus:ring-2 focus:ring-[#E87522]"
                />
              </div>
              <div>
                <label
                  htmlFor="fb-suggestions"
                  className="block text-xs font-semibold text-[#FFF8ED]/85 mb-1.5"
                >
                  Suggestions for Improvement
                </label>
                <textarea
                  id="fb-suggestions"
                  rows={3}
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  placeholder="Any dishes or service ideas you'd like to see?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#FFC247]/20 bg-[#0B0907] text-sm text-[#FFF8ED] placeholder:text-[#FFF8ED]/40 focus:outline-none focus:ring-2 focus:ring-[#E87522]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E87522] hover:bg-[#D96414] disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Private Feedback'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
