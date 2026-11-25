import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, X } from 'lucide-react';

const DISMISS_KEY = 'sd_lead_popup_dismissed_v1';

export function LeadPopup({
  onOpenPrivacy,
}: {
  onOpenPrivacy: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') {
        return;
      }
    } catch {
      // ignore storage errors
    }

    const startTime = Date.now();
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 20000);

    const handleExitIntent = (e: MouseEvent) => {
      if (e.clientY <= 10 && Date.now() - startTime >= 5000) {
        setVisible(true);
      }
    };
    document.addEventListener('mouseleave', handleExitIntent);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mouseleave', handleExitIntent);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError('Please check the WhatsApp consent box to receive promotional messages.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          consentStatus: true,
          source: 'popup',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Please enter a valid 10-digit Indian mobile number.');
      } else {
        setSuccess(data.message);
        try {
          localStorage.setItem(DISMISS_KEY, '1');
        } catch {
          // ignore
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs no-print">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-popup-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md rounded-2xl bg-[#FFF8ED] border border-[#38251B]/15 shadow-2xl p-6 sm:p-7"
          >
            <button
              type="button"
              aria-label="Close offers popup"
              onClick={dismiss}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-[#38251B]/60 hover:text-[#38251B] hover:bg-[#38251B]/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {success ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
                <h3 className="font-display font-bold text-xl text-[#38251B]">
                  You&apos;re In!
                </h3>
                <p className="text-sm text-[#38251B]/80">{success}</p>
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-[#E87522] text-white text-sm font-semibold cursor-pointer"
                >
                  Back to Menu
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-[#E87522] mb-1">
                  Signature Dine · సిగ్నేచర్ డైన్
                </p>
                <h3
                  id="lead-popup-title"
                  className="font-display font-bold text-2xl text-[#38251B] leading-snug mb-2"
                >
                  Get Special Offers from Signature Dine!
                </h3>
                <p className="text-sm text-[#38251B]/80 mb-5">
                  Join our food lovers community and receive exclusive offers, festival greetings,
                  and special discounts.
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-[#B83B24]/10 border border-[#B83B24]/25 text-xs text-[#B83B24]">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#38251B] mb-1">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Karthik"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#38251B]/15 bg-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#38251B] mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit Indian mobile number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#38251B]/15 bg-white text-sm font-mono"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 text-xs text-[#38251B]/80 leading-relaxed cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 rounded border-[#38251B]/30 text-[#E87522] focus:ring-[#E87522]"
                    />
                    <span>
                      I agree to receive promotional offers and festival greetings from Signature
                      Dine via WhatsApp. We collect your number solely for restaurant offers and
                      you can unsubscribe anytime. See our{' '}
                      <button
                        type="button"
                        onClick={() => {
                          dismiss();
                          onOpenPrivacy();
                        }}
                        className="underline font-semibold text-[#E87522] cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                      .
                    </span>
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#E87522] hover:bg-[#D36312] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      {submitting ? 'Joining...' : 'Join Now'}
                    </button>
                    <button
                      type="button"
                      onClick={dismiss}
                      className="py-2.5 px-4 rounded-xl border border-[#38251B]/15 bg-white text-sm font-semibold text-[#38251B]/80 hover:text-[#38251B] cursor-pointer"
                    >
                      Maybe Later
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
