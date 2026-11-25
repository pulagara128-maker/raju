import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { DishImage } from './DishImage.tsx';

export function GallerySection() {
  const { bootstrap } = useApp();
  const galleryItems = bootstrap?.galleryItems || [];
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(galleryItems.map((g) => g.category)));
    return ['All', ...unique];
  }, [galleryItems]);

  const filtered = useMemo(() => {
    if (selectedCategory === 'All') return galleryItems;
    return galleryItems.filter((g) => g.category === selectedCategory);
  }, [galleryItems, selectedCategory]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight')
        setLightboxIndex((idx) => (idx === null ? null : (idx + 1) % filtered.length));
      if (e.key === 'ArrowLeft')
        setLightboxIndex((idx) =>
          idx === null ? null : (idx - 1 + filtered.length) % filtered.length
        );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, filtered.length]);

  return (
    <section
      id="gallery"
      className="py-16 lg:py-24 bg-[#120E0B] text-[#FFF8ED] border-b border-[#FFC247]/12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-[#FFC247] mb-2">Visual Showcase</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#FFF8ED] tracking-tight">
              Food &amp; Ambiance Gallery
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setLightboxIndex(null);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#FFC247] text-[#120D0A]'
                    : 'bg-[#1A140F] border border-[#FFC247]/15 text-[#FFF8ED]/80 hover:border-[#FFC247]/45'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className="group relative rounded-2xl overflow-hidden bg-[#1A140F] border border-[#FFC247]/15 hover:border-[#FFC247]/40 text-left aspect-[4/3] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFC247] transition-colors"
            >
              <DishImage
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0907]/90 via-[#0B0907]/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <p className="text-xs text-[#FFC247] font-medium mb-0.5">{item.category}</p>
                <h3 className="font-display font-semibold text-base sm:text-lg leading-snug text-[#FFF8ED]">
                  {item.title}
                </h3>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={filtered[lightboxIndex].title}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#16110D] rounded-2xl overflow-hidden border border-[#FFC247]/25 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close lightbox"
              onClick={() => setLightboxIndex(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/70 text-[#FFF8ED] hover:bg-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="aspect-[16/10] bg-black flex items-center justify-center">
              <DishImage
                src={filtered[lightboxIndex].imageUrl}
                alt={filtered[lightboxIndex].title}
                eager
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-4 sm:p-5 flex items-center justify-between gap-4 text-[#FFF8ED]">
              <div>
                <p className="text-xs text-[#FFC247] font-medium">
                  {filtered[lightboxIndex].category}
                </p>
                <h3 className="font-display text-lg font-bold">
                  {filtered[lightboxIndex].title}
                </h3>
                {filtered[lightboxIndex].caption && (
                  <p className="text-sm text-[#FFF8ED]/75 mt-1">
                    {filtered[lightboxIndex].caption}
                  </p>
                )}
              </div>

              {filtered.length > 1 && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() =>
                      setLightboxIndex(
                        (lightboxIndex - 1 + filtered.length) % filtered.length
                      )
                    }
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % filtered.length)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
