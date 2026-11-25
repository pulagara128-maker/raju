import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowRight, MapPin, MessageCircle, Star } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface HeroSectionProps {
  onExploreMenu: () => void;
  onOrderWhatsApp: () => void;
  onGetDirections: () => void;
}

export function HeroSection({
  onExploreMenu,
  onOrderWhatsApp,
  onGetDirections,
}: HeroSectionProps) {
  const { bootstrap } = useApp();
  const sectionRef = useRef<HTMLElement | null>(null);
  const bgParallaxRef = useRef<HTMLDivElement | null>(null);

  const settings = bootstrap?.settings;
  const liveStatus = bootstrap?.liveHoursStatus;
  const ratingScore = bootstrap?.googleRating.score ?? 4.6;
  const ratingCount = bootstrap?.googleRating.totalReviews ?? 2080;

  const headline =
    settings?.heroHeadline || 'Authentic Andhra Flavours, Served with Love';
  const subtext =
    settings?.heroSubtext ||
    'Discover delicious biryanis, traditional Andhra delicacies, flavourful starters, and an unforgettable dining experience in Guntur.';

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.hero-stagger', {
        y: 22,
        opacity: 0,
        duration: 0.72,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });
    }, sectionRef);

    const onScroll = () => {
      if (!bgParallaxRef.current) return;
      const offset = Math.min(window.scrollY * 0.14, 90);
      bgParallaxRef.current.style.transform = `translate3d(0, ${offset}px, 0)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      ctx.revert();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#0B0907] border-b border-[#FFC247]/15"
    >
      {/* Subtle Parallax Background Photography + Warm Ambient Glow */}
      <div
        ref={bgParallaxRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none will-change-transform"
      >
        <img
          src="/src/assets/images/hero_andhra_feast_1795633827360.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-20"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#0B0907]/80 via-[#0B0907]/90 to-[#0B0907] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -top-24 right-[10%] w-[520px] h-[520px] rounded-full bg-[#E87522]/12 blur-[120px] pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Luxury Editorial Copy & CTAs */}
          <div className="lg:col-span-6">
            {/* Rating Line & Location (Clean unboxed typography) */}
            <div className="hero-stagger inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-[#FFC247] font-medium mb-5">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Star className="w-4 h-4 fill-[#FFC247] text-[#FFC247]" />
                {ratingScore}/5
              </span>
              <span aria-hidden="true" className="text-[#FFF8ED]/35">
                ·
              </span>
              <span className="tabular-nums text-[#FFF8ED]/90">
                {ratingCount.toLocaleString('en-IN')} Google Reviews
              </span>
              <span aria-hidden="true" className="text-[#FFF8ED]/35">
                ·
              </span>
              <span className="text-[#FFF8ED]/80">Brindavan Gardens, Guntur</span>
            </div>

            {/* Brand & Telugu Name */}
            <div className="hero-stagger mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-base sm:text-lg font-semibold tracking-wide text-[#FFC247]">
                {settings?.name || 'Signature Dine'}
              </span>
              <span className="text-base sm:text-lg font-semibold text-[#FFF8ED]/85 font-telugu">
                {settings?.teluguName || 'సిగ్నేచర్ డైన్'}
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="hero-stagger font-display font-bold text-[#FFF8ED] leading-[1.08] tracking-tight mb-5 text-[clamp(2.25rem,4vw,3.75rem)]">
              {headline}
            </h1>

            {/* Supporting Description */}
            <p className="hero-stagger text-base sm:text-lg text-[#FFF8ED]/80 leading-relaxed max-w-xl mb-8">
              {subtext}
            </p>

            {/* Primary & Secondary Action Buttons */}
            <div className="hero-stagger flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onExploreMenu}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#E87522] hover:bg-[#D96414] text-white font-semibold text-sm sm:text-base transition-transform duration-150 active:scale-[0.98] shadow-lg shadow-[#E87522]/25 cursor-pointer whitespace-nowrap"
              >
                <span>Explore Our Menu</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOrderWhatsApp}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#FFC247] hover:bg-[#F5B432] text-[#120D0A] font-semibold text-sm sm:text-base transition-transform duration-150 active:scale-[0.98] shadow-md cursor-pointer whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Order on WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={onGetDirections}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/8 hover:bg-white/14 text-[#FFF8ED] border border-[#FFC247]/30 font-medium text-sm sm:text-base transition-colors cursor-pointer whitespace-nowrap"
              >
                <MapPin className="w-4 h-4 text-[#FFC247]" />
                <span>Get Directions</span>
              </button>
            </div>

            {/* Live IST Opening Hours Summary */}
            <div className="hero-stagger mt-8 pt-6 border-t border-[#FFC247]/15 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-[#FFF8ED]/75">
              <span>
                <strong className="text-[#FFC247] font-semibold">
                  {liveStatus ? liveStatus.statusLabel : 'Open Daily · 12:00 PM IST'}
                </strong>
              </span>
              <span aria-hidden="true" className="text-[#FFF8ED]/30">
                ·
              </span>
              <span>
                Opens daily at {liveStatus?.openTimeFormatted || '12:00 PM'} · Closes{' '}
                {liveStatus?.closeTimeFormatted || '11:00 PM'}
              </span>
            </div>
          </div>

          {/* Right Column: Editorial Andhra Culinary Photography */}
          <div className="lg:col-span-6 hero-stagger">
            <div className="space-y-4">
              <div className="relative aspect-[16/11] rounded-3xl overflow-hidden border border-[#FFC247]/20 bg-[#15110E] shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
                <img
                  src="/src/assets/images/hero_andhra_feast_1795633827360.jpg"
                  alt="Signature Dine Authentic Andhra Feast in Guntur"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0B0907]/90 via-[#0B0907]/40 to-transparent pointer-events-none"
                />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FFC247]">
                      Chef&apos;s Signature Spread
                    </p>
                    <p className="font-display font-bold text-lg sm:text-xl text-[#FFF8ED] mt-0.5">
                      Guntur Biryanis &amp; Traditional Andhra Feasts
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="group relative aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 bg-[#15110E] shadow-lg">
                  <img
                    src="/src/assets/images/dish_mutton_dum_biryani_1795633827431.jpg"
                    alt="Mutton Dum Biryani at Signature Dine"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0B0907]/90 to-transparent pointer-events-none"
                  />
                  <p className="absolute bottom-3 left-3.5 right-3.5 text-xs sm:text-sm font-display font-bold text-[#FFF8ED] truncate">
                    Mutton Dum Biryani
                  </p>
                </div>

                <div className="group relative aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 bg-[#15110E] shadow-lg">
                  <img
                    src="/src/assets/images/dish_royyala_vepudu_1795633828150.jpg"
                    alt="Royyala Vepudu at Signature Dine"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0B0907]/90 to-transparent pointer-events-none"
                  />
                  <p className="absolute bottom-3 left-3.5 right-3.5 text-xs sm:text-sm font-display font-bold text-[#FFF8ED] truncate">
                    Royyala Vepudu
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
