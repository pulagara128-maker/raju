import React from 'react';
import { ArrowLeft } from 'lucide-react';

export function LegalPage({
  type,
  onBack,
}: {
  type: 'privacy' | 'terms';
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FFF8ED] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#38251B]/12 p-8 sm:p-10 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#E87522] hover:underline mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Signature Dine</span>
        </button>

        {type === 'privacy' ? (
          <div className="space-y-5 text-sm text-[#38251B]/85 leading-relaxed">
            <h1 className="font-display font-bold text-3xl text-[#38251B]">
              Privacy Policy — Signature Dine (సిగ్నేచర్ డైన్)
            </h1>
            <p>
              Signature Dine values your trust and respects your privacy. This policy explains how
              we collect, store, and protect customer contact information.
            </p>
            <h2 className="font-display font-bold text-lg text-[#38251B]">
              1. Information We Collect
            </h2>
            <p>
              When you place a pickup pre-order, join Signature Dine Rewards, submit feedback, or
              opt in to our offers list, we may collect your name, Indian mobile number, order
              details, and (with your consent) your birthday for birthday dining discounts.
            </p>
            <h2 className="font-display font-bold text-lg text-[#38251B]">
              2. WhatsApp Promotional Consent &amp; Opt-Out
            </h2>
            <p>
              We only send promotional WhatsApp offers or festival greetings to guests who have
              explicitly checked the consent box. Consent timestamps are logged securely. You may
              unsubscribe at any time using the Unsubscribe option in our website footer or by
              informing our staff.
            </p>
            <h2 className="font-display font-bold text-lg text-[#38251B]">
              3. Data Protection &amp; Private Feedback
            </h2>
            <p>
              Customer mobile numbers, orders, and feedback are accessible only to authorized
              Signature Dine staff via authenticated access controls. Private guest feedback is
              never published publicly without permission.
            </p>
          </div>
        ) : (
          <div className="space-y-5 text-sm text-[#38251B]/85 leading-relaxed">
            <h1 className="font-display font-bold text-3xl text-[#38251B]">
              Terms &amp; Conditions — Signature Dine (సిగ్నేచర్ డైన్)
            </h1>
            <h2 className="font-display font-bold text-lg text-[#38251B]">
              1. Pickup Pre-Orders &amp; Confirmation
            </h2>
            <p>
              Online pickup pre-orders submitted through this website are order requests. An order
              is considered confirmed only after Signature Dine staff review and accept it. Menu
              items marked as awaiting owner confirmation will have their final price confirmed by
              the restaurant before preparation.
            </p>
            <h2 className="font-display font-bold text-lg text-[#38251B]">
              2. Signature Dine Rewards (Loyalty Program)
            </h2>
            <p>
              Guests earn 1 stamp per eligible completed meal order. Duplicate stamps for the same
              order are not permitted. Upon earning 10 eligible stamps, the 10th eligible meal
              reward becomes available for redemption subject to restaurant verification.
            </p>
            <h2 className="font-display font-bold text-lg text-[#38251B]">
              3. Location &amp; Opening Hours
            </h2>
            <p>
              3rd Line, Brindavan Gardens, Guntur, Andhra Pradesh 522006, India. Opening hours and
              special holiday schedules are displayed in India Standard Time (Asia/Kolkata).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
