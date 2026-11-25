import React, { useState } from 'react';
import { Award, Check, Gift, Search } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface LoyaltyCheckResult {
  enrolled: boolean;
  targetMeals: number;
  birthdayDiscountPercent: number;
  birthdayMaxDiscount: number;
  rulesText: string;
  customer: {
    name: string;
    stampsCount: number;
    totalCompletedMeals: number;
    rewardsAvailable: number;
    rewardsRedeemed: number;
    hasBirthdayOnFile: boolean;
    availableRewardCodes: Array<{ rewardCode: string; status: string }>;
  } | null;
}

export function LoyaltySection() {
  const { bootstrap } = useApp();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LoyaltyCheckResult | null>(null);

  const settings = bootstrap?.settings;
  const targetMeals = result?.targetMeals ?? settings?.loyaltyTargetMeals ?? 10;
  const birthdayPct = result?.birthdayDiscountPercent ?? settings?.birthdayDiscountPercent ?? 15;
  const birthdayMax = result?.birthdayMaxDiscount ?? settings?.birthdayMaxDiscount ?? 500;
  const rulesText =
    result?.rulesText ||
    settings?.loyaltyRulesText ||
    'Earn 1 loyalty stamp for every eligible completed meal. Your 10th eligible meal is free.';

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/loyalty/check?phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to check loyalty progress.');
        setResult(null);
      } else {
        setResult(data as LoyaltyCheckResult);
      }
    } catch {
      setError('Network error while checking loyalty progress.');
    } finally {
      setLoading(false);
    }
  };

  const stampsCount = result?.customer?.stampsCount ?? 0;
  const rewardReady = Boolean(
    result?.customer && (result.customer.rewardsAvailable > 0 || stampsCount >= targetMeals)
  );

  return (
    <section
      id="loyalty"
      className="py-16 lg:py-24 bg-[#120E0B] text-[#FFF8ED] border-b border-[#FFC247]/12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          {/* Program Details */}
          <div className="lg:col-span-5">
            <p className="text-sm font-semibold text-[#FFC247] mb-2">Signature Dine Rewards</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#FFF8ED] tracking-tight mb-4">
              Every 10th Eligible Meal is On Us
            </h2>
            <p className="text-base text-[#FFF8ED]/75 leading-relaxed mb-6">{rulesText}</p>

            <div className="space-y-4 border-t border-[#FFC247]/15 pt-5">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-[#E87522] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-[#FFF8ED]">1 Stamp Per Eligible Meal</h3>
                  <p className="text-sm text-[#FFF8ED]/70">
                    Verified completed pickup and dine-in orders earn 1 stamp automatically when
                    checked off by our team.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-[#FFC247] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-[#FFF8ED]">
                    Birthday Privilege ({birthdayPct}% Off, up to ₹{birthdayMax})
                  </h3>
                  <p className="text-sm text-[#FFF8ED]/70">
                    Share your birthday with our restaurant staff to receive an exclusive birthday
                    celebration discount.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Loyalty Card Lookup */}
          <div className="lg:col-span-7 bg-[#18130E] rounded-2xl border border-[#FFC247]/20 p-6 sm:p-8">
            <h3 className="font-display font-bold text-xl text-[#FFF8ED] mb-1">
              Check Your Stamp Card
            </h3>
            <p className="text-sm text-[#FFF8ED]/70 mb-5">
              Enter your 10-digit mobile number to view your Signature Dine Rewards progress.
            </p>

            <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                required
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#FFC247]/20 bg-[#0B0907] text-sm text-[#FFF8ED] font-mono tabular-nums placeholder:text-[#FFF8ED]/40 focus:outline-none focus:ring-2 focus:ring-[#E87522]"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E87522] hover:bg-[#D96414] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'Checking...' : 'View Stamps'}</span>
              </button>
            </form>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-[#B83B24]/20 border border-[#E87522]/40 text-sm text-[#FFD2C8]">
                {error}
              </div>
            )}

            {result && !result.enrolled && (
              <div className="p-4 rounded-xl bg-[#0B0907] border border-[#FFC247]/15 text-sm text-[#FFF8ED]/80 mb-5">
                No loyalty card found for this number yet. Place a pickup pre-order or ask our
                host at Signature Dine to enroll your number on your next visit!
              </div>
            )}

            {result?.customer && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#FFC247]/15">
                <div>
                  <p className="text-base font-bold text-[#FFF8ED]">{result.customer.name}</p>
                  <p className="text-xs text-[#FFF8ED]/70 tabular-nums">
                    Total completed meals: {result.customer.totalCompletedMeals} · Rewards
                    redeemed: {result.customer.rewardsRedeemed}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-[#FFC247] tabular-nums">
                  {stampsCount} / {targetMeals} Stamps
                </span>
              </div>
            )}

            {rewardReady && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-100">
                <p className="font-semibold text-sm">
                  Congratulations! Your 10th meal reward is available.
                </p>
                {result?.customer?.availableRewardCodes &&
                  result.customer.availableRewardCodes.length > 0 && (
                    <p className="text-xs mt-1 font-mono text-emerald-300">
                      Reward Code: {result.customer.availableRewardCodes[0].rewardCode} — Present at
                      counter to redeem.
                    </p>
                  )}
              </div>
            )}

            {/* 10-Stamp Visual Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {Array.from({ length: targetMeals }, (_, i) => {
                const mealNum = i + 1;
                const earned = result?.customer ? mealNum <= stampsCount : false;
                const isFinal = mealNum === targetMeals;

                return (
                  <div
                    key={mealNum}
                    className={`rounded-xl border p-3 flex flex-col items-center justify-center text-center transition-colors ${
                      earned
                        ? 'bg-[#E87522] border-[#E87522] text-white'
                        : isFinal
                        ? 'bg-[#FFC247]/12 border-[#FFC247]/40 text-[#FFC247]'
                        : 'bg-[#0B0907] border-[#FFC247]/15 text-[#FFF8ED]/65'
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide opacity-85">
                      Meal {mealNum}
                    </span>
                    <div className="mt-1.5 w-7 h-7 rounded-full flex items-center justify-center border border-current/30">
                      {earned ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : isFinal ? (
                        <Gift className="w-3.5 h-3.5 text-[#FFC247]" />
                      ) : (
                        <span className="text-xs font-mono tabular-nums">{mealNum}</span>
                      )}
                    </div>
                    {isFinal && (
                      <span className="text-[10px] font-bold mt-1">
                        {earned ? 'Free Meal Ready!' : 'Free Meal'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
