import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useApp } from '../context/AppContext.tsx';
import { DishImage } from './DishImage.tsx';

gsap.registerPlugin(ScrollTrigger);

const HIGHLIGHTS = [
  {
    num: '01.',
    title: 'Authentic Andhra Flavours',
    desc: 'Traditional spice blends, fragrant dum biryanis, and coastal Andhra specialities prepared fresh to order.',
  },
  {
    num: '02.',
    title: 'Family-Friendly Dining',
    desc: 'Warm, spacious seating designed for relaxed family lunches, weekend dinners, and celebrations in Guntur.',
  },
  {
    num: '03.',
    title: 'Elegant Ambiance',
    desc: 'Thoughtful lighting, natural teakwood furnishings, and welcoming comfort in Brindavan Gardens.',
  },
  {
    num: '04.',
    title: 'Friendly & Attentive Service',
    desc: 'Courteous hospitality focused on making every guest feel right at home.',
  },
  {
    num: '05.',
    title: 'Wide Variety of Dishes',
    desc: 'From Mutton Dum Biryani and Royyala Vepudu to Butter Garlic Mushroom and Fruit Curd Rice.',
  },
];

export function AboutSection() {
  const { bootstrap } = useApp();
  const sectionRef = useRef<HTMLElement | null>(null);
  const aboutText =
    bootstrap?.settings?.aboutText ||
    'Signature Dine (సిగ్నేచర్ డైన్) brings the warmth of Andhra hospitality to the heart of Brindavan Gardens, Guntur. From slow-cooked biryanis and bold coastal starters to comforting traditional meals, every dish is crafted for families, friends, and food lovers.';

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.about-reveal', {
        y: 20,
        opacity: 0,
        duration: 0.65,
        stagger: 0.07,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="py-16 lg:py-24 bg-[#0F0C09] text-[#FFF8ED] border-b border-[#FFC247]/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
          {/* Interior Photo */}
          <div className="about-reveal lg:col-span-6 rounded-2xl overflow-hidden border border-[#FFC247]/20 min-h-[320px] bg-[#18130E]">
            <DishImage
              src="/src/assets/images/restaurant_interior_clean_1795633843510.jpg"
              alt="Signature Dine welcoming dining room in Brindavan Gardens, Guntur"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Story & 5 Highlights */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="about-reveal text-sm font-semibold text-[#FFC247] mb-2">
              About Signature Dine · <span className="font-telugu">సిగ్నేచర్ డైన్</span>
            </p>
            <h2 className="about-reveal font-display font-bold text-3xl sm:text-4xl text-[#FFF8ED] tracking-tight mb-4">
              A Warm Table in Brindavan Gardens, Guntur
            </h2>
            <p className="about-reveal text-base text-[#FFF8ED]/75 leading-relaxed mb-8">
              {aboutText}
            </p>

            <div className="divide-y divide-[#FFC247]/15 border-t border-b border-[#FFC247]/15">
              {HIGHLIGHTS.map((item) => (
                <div key={item.num} className="about-reveal py-3.5 flex items-start gap-4">
                  <span className="font-mono text-sm font-semibold text-[#E87522] tabular-nums pt-0.5">
                    {item.num}
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-[#FFF8ED]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#FFF8ED]/70 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
