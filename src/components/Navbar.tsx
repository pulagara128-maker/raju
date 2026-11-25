import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface NavbarProps {
  onNavigateHomeSection: (sectionId: string) => void;
  onNavigatePath: (path: string) => void;
}

export function Navbar({ onNavigateHomeSection, onNavigatePath }: NavbarProps) {
  const { bootstrap, cartCount, setCartOpen, setDrawerTab } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const brandName = bootstrap?.settings?.name || 'Signature Dine';
  const teluguName = bootstrap?.settings?.teluguName || 'సిగ్నేచర్ డైన్';

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'menu', label: 'Menu' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'contact', label: 'Contact' },
  ];

  const handleNavClick = (id: string) => {
    setMobileOpen(false);
    onNavigateHomeSection(id);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0907]/75 backdrop-blur-md border-b border-[#FFC247]/15 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => {
            onNavigatePath('/');
            onNavigateHomeSection('home');
          }}
          className="text-left whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC247] rounded-md px-1 cursor-pointer"
        >
          <span className="font-display font-bold text-xl tracking-tight text-[#FFF8ED]">
            {brandName}
          </span>
          <span className="ml-2 text-sm font-semibold text-[#FFC247] font-telugu hidden sm:inline">
            {teluguName}
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-[#FFF8ED]/80"
        >
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => handleNavClick(link.id)}
              className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-[#FFC247] hover:text-[#FFC247] transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary CTA + Mobile Hamburger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setDrawerTab('cart');
              setCartOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E87522] to-[#D96414] hover:from-[#F28230] hover:to-[#E87522] text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0 shadow-md shadow-[#E87522]/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFC247]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Order Now</span>
            {cartCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-xs font-mono tabular-nums rounded bg-[#0B0907] text-[#FFC247]">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-[#FFF8ED] hover:bg-white/10 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="md:hidden bg-[#120E0B]/95 backdrop-blur-md border-t border-[#FFC247]/15 px-4 py-4 shadow-2xl"
          >
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleNavClick(link.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-base font-medium text-[#FFF8ED] hover:bg-[#FFC247]/10 hover:text-[#FFC247] transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
