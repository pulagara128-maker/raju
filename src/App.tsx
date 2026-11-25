import React, { useCallback, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { TodaysSpecialSection } from './components/TodaysSpecialSection.tsx';
import { AboutSection } from './components/AboutSection.tsx';
import { MenuSection } from './components/MenuSection.tsx';
import { GallerySection } from './components/GallerySection.tsx';
import { ReviewsSection } from './components/ReviewsSection.tsx';
import { LoyaltySection } from './components/LoyaltySection.tsx';
import { FeedbackSection } from './components/FeedbackSection.tsx';
import { LocationHoursSection } from './components/LocationHoursSection.tsx';
import { CartOrderDrawer } from './components/CartOrderDrawer.tsx';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton.tsx';
import { LeadPopup } from './components/LeadPopup.tsx';
import { Footer } from './components/Footer.tsx';
import { LiveOrderBanner } from './components/LiveOrderBanner.tsx';
import { QrMenuPage } from './components/QrMenuPage.tsx';
import { LegalPage } from './components/LegalPage.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { PageLoader } from './components/PageLoader.tsx';

function normalizePath(pathname: string): string {
  const cleaned = pathname.replace(/\/+$/, '');
  return cleaned === '' ? '/' : cleaned;
}

function AppShell() {
  const { bootstrap, error, refreshBootstrap, mapsQuotaExceeded, setCartOpen } = useApp();
  const [path, setPath] = useState<string>(() =>
    typeof window !== 'undefined' ? normalizePath(window.location.pathname) : '/'
  );

  const scrollToSection = useCallback((sectionId: string) => {
    window.setTimeout(() => {
      if (sectionId === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  }, []);

  const navigatePath = useCallback(
    (nextPath: string) => {
      const normalized = normalizePath(nextPath);
      if (typeof window !== 'undefined' && normalizePath(window.location.pathname) !== normalized) {
        window.history.pushState({}, '', normalized);
      }
      setPath(normalized);

      if (normalized === '/menu') {
        scrollToSection('menu');
      } else if (normalized === '/loyalty') {
        scrollToSection('loyalty');
      } else if (normalized === '/order') {
        setCartOpen(true);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [scrollToSection, setCartOpen]
  );

  const navigateHomeSection = useCallback(
    (sectionId: string) => {
      const isHomeView = path === '/' || path === '/menu' || path === '/order' || path === '/loyalty';
      if (!isHomeView) {
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', '/');
        }
        setPath('/');
      }
      scrollToSection(sectionId);
    },
    [path, scrollToSection]
  );

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Handle initial route intents (/menu, /order, /loyalty, /#menu)
  useEffect(() => {
    if (path === '/menu' || window.location.hash === '#menu') {
      scrollToSection('menu');
    } else if (path === '/loyalty' || window.location.hash === '#loyalty') {
      scrollToSection('loyalty');
    } else if (path === '/order') {
      setCartOpen(true);
    }
  }, [path, scrollToSection, setCartOpen]);

  const QuotaBanner = mapsQuotaExceeded ? (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-950 hover:text-amber-800"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
    </div>
  ) : null;

  if (path === '/admin') {
    return (
      <>
        {QuotaBanner}
        <AdminDashboard
          onBackToSite={() => navigatePath('/')}
          onOpenQrMenu={() => navigatePath('/qr-menu')}
        />
      </>
    );
  }

  if (path === '/qr-menu') {
    return (
      <>
        {QuotaBanner}
        <QrMenuPage onBack={() => navigatePath('/')} />
      </>
    );
  }

  if (path === '/privacy') {
    return (
      <>
        {QuotaBanner}
        <LegalPage type="privacy" onBack={() => navigatePath('/')} />
      </>
    );
  }

  if (path === '/terms') {
    return (
      <>
        {QuotaBanner}
        <LegalPage type="terms" onBack={() => navigatePath('/')} />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0907] text-[#FFF8ED]">
      <PageLoader />
      {QuotaBanner}

      <Navbar
        onNavigateHomeSection={navigateHomeSection}
        onNavigatePath={navigatePath}
      />

      <LiveOrderBanner />

      {error && !bootstrap && (
        <div className="bg-[#B83B24] text-white px-4 py-2.5 text-xs sm:text-sm text-center">
          <span>{error} </span>
          <button
            type="button"
            onClick={refreshBootstrap}
            className="underline font-semibold ml-2 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      <main className="flex-1">
        <HeroSection
          onExploreMenu={() => scrollToSection('menu')}
          onOrderWhatsApp={() => setCartOpen(true)}
          onGetDirections={() => scrollToSection('contact')}
        />

        <TodaysSpecialSection onOrderSpecial={() => setCartOpen(true)} />

        <AboutSection />

        <MenuSection onOpenQrMenu={() => navigatePath('/qr-menu')} />

        <GallerySection />

        <ReviewsSection />

        <LoyaltySection />

        <FeedbackSection />

        <LocationHoursSection onOpenOrder={() => setCartOpen(true)} />
      </main>

      <Footer
        onNavigateHomeSection={navigateHomeSection}
        onNavigatePath={navigatePath}
      />

      <CartOrderDrawer />
      <FloatingWhatsAppButton />
      <LeadPopup onOpenPrivacy={() => navigatePath('/privacy')} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
