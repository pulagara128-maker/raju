import React from 'react';
import { ExternalLink, Star } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

const FEEDBACK_THEMES = [
  {
    theme: 'Delicious & Flavorful Food',
    summary:
      'Guests consistently highlight bold, authentic Andhra flavours and well-balanced spice blends across curries and rice dishes.',
  },
  {
    theme: 'Mutton Dum Biryani & Starters',
    summary:
      'Signature biryanis, tender Mutton Dum Biryani, and crispy starters like Royyala Vepudu are frequent dining highlights.',
  },
  {
    theme: 'Pleasant & Elegant Ambiance',
    summary:
      'Diners appreciate the warm lighting, clean dining spaces, and inviting interior suitable for relaxed evening meals.',
  },
  {
    theme: 'Family-Friendly Dining',
    summary:
      'Comfortable seating and a wide vegetarian and non-vegetarian selection make it a popular spot for families and groups.',
  },
  {
    theme: 'Friendly & Attentive Service',
    summary:
      'Hospitality-focused staff who help guests pick dishes and ensure smooth, welcoming table service.',
  },
  {
    theme: 'Reasonable Pricing',
    summary:
      'Generous portion sizes paired with fair value for casual weekday meals as well as weekend family gatherings.',
  },
];

export function ReviewsSection() {
  const { bootstrap } = useApp();
  const score = bootstrap?.googleRating.score ?? 4.6;
  const totalReviews = bootstrap?.googleRating.totalReviews ?? 2080;
  const reviewUrl =
    bootstrap?.settings?.googleReviewUrl ||
    'https://www.google.com/maps/search/?api=1&query=Signature+Dine+Brindavan+Gardens+Guntur';

  return (
    <section
      id="reviews"
      className="py-16 lg:py-24 bg-[#0B0907] text-[#FFF8ED] border-b border-[#FFC247]/12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-sm font-semibold text-[#FFC247] mb-2">Guest Sentiment</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#FFF8ED] tracking-tight">
              Loved by Diners Across Guntur
            </h2>
            <p className="text-sm text-[#FFF8ED]/70 mt-2 max-w-2xl">
              Summary of recurring diner feedback themes. Individual verified customer reviews can
              be read directly on Google Maps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 bg-[#16110D] border border-[#FFC247]/20 rounded-2xl px-5 py-4 shrink-0">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-bold font-mono tabular-nums text-[#FFF8ED]">
                  {score.toFixed(1)}
                </span>
                <span className="text-sm text-[#FFF8ED]/55">/ 5</span>
                <div className="flex items-center ml-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i <= Math.round(score)
                          ? 'fill-[#FFC247] text-[#FFC247]'
                          : 'text-[#FFF8ED]/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-[#FFF8ED]/70 mt-0.5 tabular-nums">
                Based on {totalReviews.toLocaleString('en-IN')} Google Reviews
              </p>
            </div>

            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E87522] hover:bg-[#D96414] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <span>Read More Reviews on Google</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEEDBACK_THEMES.map((item) => (
            <div
              key={item.theme}
              className="rounded-2xl border border-[#FFC247]/15 bg-[#16110D] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-[#FFC247] text-[#FFC247]" />
                  ))}
                  <span className="ml-2 text-xs text-[#FFF8ED]/55 font-medium">
                    Verified Feedback Theme
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-[#FFF8ED] mb-2">
                  {item.theme}
                </h3>
                <p className="text-sm text-[#FFF8ED]/70 leading-relaxed">{item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
