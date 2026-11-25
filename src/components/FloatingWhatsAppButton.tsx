import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export function FloatingWhatsAppButton() {
  const { cartCount, setCartOpen } = useApp();

  const handleClick = () => {
    if (cartCount > 0) {
      setCartOpen(true);
    } else {
      const menuEl = document.getElementById('menu');
      if (menuEl) {
        menuEl.scrollIntoView({ behavior: 'smooth' });
      } else {
        setCartOpen(true);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Order on WhatsApp"
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#25D366] hover:bg-[#1EBE5A] text-white font-semibold text-sm shadow-lg transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98] cursor-pointer no-print"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="hidden sm:inline">Order on WhatsApp</span>
      {cartCount > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-[#38251B] text-[#FFC247] text-xs font-mono tabular-nums">
          {cartCount}
        </span>
      )}
    </button>
  );
}
