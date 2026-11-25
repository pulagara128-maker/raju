import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';

interface FooterProps {
  onNavigateHomeSection: (id: string) => void;
  onNavigatePath: (path: string) => void;
}

export function Footer({ onNavigateHomeSection, onNavigatePath }: FooterProps) {
  const { bootstrap, openOrderTracker } = useApp();
  const settings = bootstrap?.settings;
  const live = bootstrap?.liveHoursStatus;

  const [unsubOpen, setUnsubOpen] = useState(false);
  const [unsubPhone, setUnsubPhone] = useState('');
  const [unsubStatus, setUnsubStatus] = useState<string | null>(null);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnsubStatus(null);
    try {
      const res = await fetch('/api/leads/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: unsubPhone }),
      });
      const data = await res.json();
      setUnsubStatus(data.message || data.error);
      if (res.ok) setUnsubPhone('');
    } catch {
      setUnsubStatus('Could not process request. Please try again.');
    }
  };

  const mapsUrl =
    settings?.googleMapsUrl ||
    'https://www.google.com/maps/search/?api=1&query=3rd+Line+Brindavan+Gardens+Guntur+Andhra+Pradesh+522006';

  return (
    <footer className="bg-[#070504] text-[#FFF8ED]/85 border-t border-white/10 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <p className="font-display font-bold text-2xl text-[#FFF8ED]">Signature Dine</p>
            <p className="font-telugu text-base font-semibold text-[#FFC247] mt-0.5">
              సిగ్నేచర్ డైన్
            </p>
            <p className="text-sm text-[#FFF8ED]/65 leading-relaxed mt-3">
              Authentic Andhra Restaurant serving slow-cooked biryanis, traditional Andhra meals,
              and fiery starters in Brindavan Gardens, Guntur.
            </p>
          </div>

          {/* Address & Hours */}
          <div className="space-y-3 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC247]">
              Location &amp; Hours
            </h3>
            <p className="text-[#FFF8ED]/75 leading-relaxed">
              {settings?.address ||
                '3rd Line, Brindavan Gardens, Guntur, Andhra Pradesh 522006, India'}
            </p>
            <p className="font-mono text-xs text-[#FFF8ED]/55">
              Plus Code: {settings?.plusCode || '8C79+MX, Guntur, Andhra Pradesh'}
            </p>
            <p className="text-xs text-[#FFF8ED]/75">
              Opens Daily: {live?.openTimeFormatted || '12:00 PM'} · Closing:{' '}
              {live?.closeTimeFormatted || 'To be confirmed'}
            </p>
            {settings?.phone && (
              <p className="text-xs font-mono text-[#FFF8ED]">Phone: {settings.phone}</p>
            )}
            <div className="pt-1 flex flex-wrap gap-4 text-xs">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FFC247] hover:underline font-medium"
              >
                Google Maps
              </a>
              {settings?.whatsappNumber && (
                <a
                  href={`https://wa.me/91${settings.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FFC247] hover:underline font-medium"
                >
                  WhatsApp Us
                </a>
              )}
            </div>
          </div>

          {/* Explore Links */}
          <div className="space-y-2.5 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC247]">
              Explore
            </h3>
            <ul className="space-y-2 text-[#FFF8ED]/75">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateHomeSection('menu')}
                  className="hover:text-[#FFC247] transition-colors cursor-pointer"
                >
                  Food Menu
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openOrderTracker}
                  className="hover:text-[#FFC247] transition-colors cursor-pointer"
                >
                  Track Live Order
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateHomeSection('loyalty')}
                  className="hover:text-[#FFC247] transition-colors cursor-pointer"
                >
                  Signature Dine Rewards
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePath('/qr-menu')}
                  className="hover:text-[#FFC247] transition-colors cursor-pointer"
                >
                  Printable QR Menu
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateHomeSection('contact')}
                  className="hover:text-[#FFC247] transition-colors cursor-pointer"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Policies & Opt-Out */}
          <div className="space-y-2.5 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC247]">
              Policies &amp; Access
            </h3>
            <ul className="space-y-2 text-[#FFF8ED]/75">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePath('/privacy')}
                  className="hover:text-[#FFC247] transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePath('/terms')}
                  className="hover:text-[#FFC247] transition-colors cursor-pointer"
                >
                  Terms &amp; Conditions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setUnsubOpen((v) => !v)}
                  className="hover:text-[#FFC247] transition-colors cursor-pointer"
                >
                  Unsubscribe from WhatsApp Offers
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePath('/admin')}
                  className="text-[#FFF8ED]/55 hover:text-[#FFC247] transition-colors cursor-pointer"
                >
                  Owner &amp; Staff Portal
                </button>
              </li>
            </ul>

            {unsubOpen && (
              <form onSubmit={handleUnsubscribe} className="pt-2 space-y-2">
                <input
                  type="tel"
                  required
                  value={unsubPhone}
                  onChange={(e) => setUnsubPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white font-mono placeholder:text-white/50"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 rounded-lg bg-[#E87522] hover:bg-[#D36312] text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Confirm Unsubscribe
                </button>
                {unsubStatus && <p className="text-xs text-[#FFC247]">{unsubStatus}</p>}
              </form>
            )}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#FFF8ED]/50">
          <p>© {new Date().getFullYear()} Signature Dine (సిగ్నేచర్ డైన్). All rights reserved.</p>
          <p>3rd Line, Brindavan Gardens, Guntur, Andhra Pradesh 522006</p>
        </div>
      </div>
    </footer>
  );
}
