import React from 'react';
import { Calendar, ShoppingBag, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { DishImage } from './DishImage.tsx';

export function TodaysSpecialSection({ onOrderSpecial }: { onOrderSpecial: () => void }) {
  const { bootstrap } = useApp();
  const special = bootstrap?.todaysSpecial;

  if (!special || !special.isEnabled) {
    return null;
  }

  const hasDiscount =
    special.specialPrice !== null &&
    special.originalPrice !== null &&
    special.originalPrice > special.specialPrice;

  return (
    <section
      id="todays-special"
      className="py-16 lg:py-20 bg-[#14100D] text-[#FFF8ED] border-b border-[#FFC247]/12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 rounded-2xl overflow-hidden bg-[#1D1611] border border-[#FFC247]/15 aspect-[4/3] lg:aspect-auto lg:min-h-[360px] group">
            <DishImage
              src={special.imageUrl}
              alt={special.dishName}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
          </div>

          <div className="lg:col-span-6 flex flex-col justify-center py-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#FFC247] mb-3">
              <span>Chef&apos;s Today&apos;s Special</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Calendar className="w-3.5 h-3.5" />
                Valid {special.validDate}
              </span>
              <span aria-hidden="true">·</span>
              <span>{special.isAvailable ? 'Available Today' : 'Sold Out'}</span>
            </div>

            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#FFF8ED] tracking-tight mb-4">
              {special.dishName}
            </h2>

            <p className="text-[#FFF8ED]/75 text-base leading-relaxed mb-6 max-w-xl">
              {special.description}
            </p>

            <div className="flex flex-wrap items-baseline gap-4 mb-8">
              {special.specialPrice !== null ? (
                <span className="text-3xl font-bold text-[#FFC247] font-mono tabular-nums">
                  ₹{special.specialPrice}
                </span>
              ) : (
                <span className="text-sm font-medium text-[#FFC247]">
                  Special chef pricing available at counter
                </span>
              )}

              {hasDiscount && (
                <>
                  <span className="text-lg text-[#FFF8ED]/45 line-through font-mono tabular-nums">
                    ₹{special.originalPrice}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#E87522]">
                    <Tag className="w-3.5 h-3.5" />
                    Save ₹{special.originalPrice! - special.specialPrice!}
                  </span>
                </>
              )}
            </div>

            <div>
              <button
                type="button"
                disabled={!special.isAvailable}
                onClick={onOrderSpecial}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#E87522] hover:bg-[#D96414] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors cursor-pointer shadow-md shadow-[#E87522]/20"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{special.isAvailable ? 'Order Now' : 'Currently Sold Out'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
