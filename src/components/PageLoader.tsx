import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export function PageLoader() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    try {
      if (sessionStorage.getItem('sd_loader_seen')) return false;
    } catch {
      // ignore storage access issues
    }
    return true;
  });

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem('sd_loader_seen', '1');
      } catch {
        // ignore storage errors
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } }}
          aria-hidden="true"
          className="fixed inset-0 z-50 bg-[#0B0907] flex flex-col items-center justify-center pointer-events-none select-none"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="text-center px-6"
          >
            <p className="font-telugu text-sm font-semibold text-[#FFC247] mb-2">
              సిగ్నేచర్ డైన్
            </p>
            <p className="font-display font-bold text-3xl sm:text-4xl text-[#FFF8ED] tracking-tight">
              Signature Dine
            </p>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 h-[2px] w-36 mx-auto origin-left bg-gradient-to-r from-[#E87522] via-[#FFC247] to-[#E87522]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
