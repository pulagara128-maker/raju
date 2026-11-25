import React, { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface DishImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  eager?: boolean;
}

export function DishImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  eager = false,
}: DishImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1611] via-[#261D16] to-[#120E0B] text-[#FFF8ED]/70 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <UtensilsCrossed className="w-7 h-7 text-[#FFC247]/75 mb-2" />
        <span className="text-xs font-medium text-[#FFF8ED]/75 line-clamp-2 max-w-[18ch]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
