import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Send,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatTime12h } from '../lib/hours.ts';

interface ResolvedLocation {
  lat: number;
  lng: number;
  formattedAddress?: string;
  googleMapsURI?: string;
}

function RestaurantMapCanvas({
  address,
  plusCode,
  directionsUrl,
}: {
  address: string;
  plusCode: string;
  directionsUrl: string;
}) {
  const loadingStatus = useApiLoadingStatus();
  const placesLib = useMapsLibrary('places');
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(true);
  const [resolved, setResolved] = useState<ResolvedLocation | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (!placesLib) return;
    let active = true;

    async function locateRestaurant() {
      try {
        const { places } = await placesLib!.Place.searchByText({
          textQuery: `Signature Dine, ${address}`,
          fields: ['location', 'displayName', 'formattedAddress', 'googleMapsURI'],
          maxResultCount: 1,
        });

        let target = places?.[0];
        if (!target || !target.location) {
          const fallback = await placesLib!.Place.searchByText({
            textQuery: address,
            fields: ['location', 'formattedAddress', 'googleMapsURI'],
            maxResultCount: 1,
          });
          target = fallback.places?.[0];
        }

        if (!active) return;
        if (target?.location) {
          setResolved({
            lat: target.location.lat(),
            lng: target.location.lng(),
            formattedAddress: target.formattedAddress || address,
            googleMapsURI: target.googleMapsURI || directionsUrl,
          });
        } else {
          setLookupError('Location coordinates could not be resolved right now.');
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setLookupError('Interactive map is temporarily unavailable. Use Google Maps link below.');
      }
    }

    locateRestaurant();
    return () => {
      active = false;
    };
  }, [placesLib, address, directionsUrl]);

  if (
    loadingStatus === APILoadingStatus.FAILED ||
    loadingStatus === APILoadingStatus.AUTH_FAILURE ||
    lookupError
  ) {
    return (
      <div className="h-[360px] rounded-2xl border border-white/10 bg-[#15110E] flex flex-col items-center justify-center p-6 text-center">
        <MapPin className="w-8 h-8 text-[#E87522] mb-3" />
        <p className="font-display font-bold text-lg text-[#FFF8ED] mb-1">
          Signature Dine · Brindavan Gardens
        </p>
        <p className="text-sm text-[#FFF8ED]/70 max-w-sm mb-4">
          {lookupError || 'Unable to load interactive map. Open Google Maps directly for navigation.'}
        </p>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E87522] text-white text-sm font-semibold hover:bg-[#D36312] transition-colors"
        >
          <Navigation className="w-4 h-4" />
          <span>Open in Google Maps</span>
        </a>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="h-[360px] rounded-2xl border border-white/10 bg-[#15110E] animate-pulse flex items-center justify-center">
        <span className="text-sm text-[#FFF8ED]/65 font-medium">
          Loading Brindavan Gardens map...
        </span>
      </div>
    );
  }

  return (
    <div className="h-[360px] w-full rounded-2xl overflow-hidden border border-white/12 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={{ lat: resolved.lat, lng: resolved.lng }}
        defaultZoom={16}
        gestureHandling="cooperative"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        <AdvancedMarker
          ref={markerRef}
          position={{ lat: resolved.lat, lng: resolved.lng }}
          title="Signature Dine, Brindavan Gardens, Guntur"
          onClick={() => setInfoOpen((v) => !v)}
        >
          <Pin background="#E87522" borderColor="#38251B" glyphColor="#FFF8ED" />
        </AdvancedMarker>

        {infoOpen && marker && (
          <InfoWindow anchor={marker} onCloseClick={() => setInfoOpen(false)} maxWidth={250}>
            <div className="p-1 text-[#38251B]">
              <p className="font-bold text-sm">Signature Dine (సిగ్నేచర్ డైన్)</p>
              <p className="text-xs text-[#38251B]/80 mt-0.5">{address}</p>
              <p className="text-[11px] text-[#E87522] font-mono mt-1">Plus Code: {plusCode}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

export function LocationHoursSection({ onOpenOrder }: { onOpenOrder: () => void }) {
  const { bootstrap, mapsQuotaExceeded } = useApp();
  const settings = bootstrap?.settings;
  const hours = bootstrap?.openingHours || [];
  const live = bootstrap?.liveHoursStatus;

  const address =
    settings?.address || '3rd Line, Brindavan Gardens, Guntur, Andhra Pradesh 522006, India';
  const plusCode = settings?.plusCode || '8C79+MX, Guntur, Andhra Pradesh';
  const directionsUrl =
    settings?.googleMapsUrl ||
    'https://www.google.com/maps/search/?api=1&query=3rd+Line+Brindavan+Gardens+Guntur+Andhra+Pradesh+522006';

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    subject: 'Table Inquiry / Dining Question',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Could not send your message. Please check your details.');
      }
      setContactSuccess(true);
      setContactForm({
        name: '',
        phone: '',
        email: '',
        subject: 'Table Inquiry / Dining Question',
        message: '',
      });
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Unable to send message right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="py-16 lg:py-24 bg-[#0B0907] border-t border-white/8 text-[#FFF8ED]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FFC247] mb-2">
            Visit Us in Guntur
          </p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#FFF8ED] tracking-tight">
            Location, Opening Hours &amp; Contact
          </h2>
          <p className="text-sm sm:text-base text-[#FFF8ED]/70 mt-2">
            Find us in Brindavan Gardens, check live kitchen hours in IST, or send a message
            directly to the Signature Dine team.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left: Map + Address + Contact Us Form */}
          <div className="lg:col-span-7 space-y-6">
            {mapsApiKey && !mapsQuotaExceeded ? (
              <APIProvider
                apiKey={mapsApiKey}
                language="en"
                region="IN"
                libraries={['marker', 'places']}
              >
                <RestaurantMapCanvas
                  address={address}
                  plusCode={plusCode}
                  directionsUrl={directionsUrl}
                />
              </APIProvider>
            ) : (
              <div className="h-[360px] rounded-2xl border border-white/10 bg-[#15110E] flex flex-col items-center justify-center p-6 text-center">
                <MapPin className="w-8 h-8 text-[#E87522] mb-3" />
                <p className="font-display font-bold text-lg text-[#FFF8ED]">Signature Dine</p>
                <p className="text-sm text-[#FFF8ED]/70 max-w-md mt-1 mb-4">{address}</p>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E87522] hover:bg-[#D36312] text-white text-sm font-semibold transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open in Google Maps</span>
                </a>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-[#15110E] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#FFC247] mb-1">
                  Restaurant Address
                </p>
                <p className="text-base font-semibold text-[#FFF8ED]">{address}</p>
                <p className="text-xs text-[#FFF8ED]/60 font-mono mt-1">
                  Google Maps Plus Code: {plusCode}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E87522] hover:bg-[#D36312] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Get Directions</span>
                </a>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/20 text-[#FFF8ED] hover:border-[#FFC247]/60 hover:text-[#FFC247] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  <span>Open in Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Contact Us Form */}
            <div className="rounded-2xl border border-white/10 bg-[#15110E] p-6 sm:p-7">
              <div className="flex items-center gap-2.5 mb-2">
                <Mail className="w-5 h-5 text-[#FFC247]" />
                <h3 className="font-display font-bold text-xl text-[#FFF8ED]">
                  Send Us a Message
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#FFF8ED]/65 mb-5">
                Have a question about family dining, group feasts, catering trays, or takeaway
                orders? Reach our team directly.
              </p>

              {contactSuccess ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Message received by Signature Dine!</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#FFF8ED]/80 leading-relaxed">
                    Thank you for reaching out. Our restaurant manager will review your message and
                    get back to you on the mobile number or email you provided.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactSuccess(false)}
                    className="px-4 py-2 rounded-lg bg-[#E87522] hover:bg-[#D36312] text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#FFF8ED]/80 mb-1.5">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="e.g. Karthik Reddy"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0907] border border-white/15 text-sm text-[#FFF8ED] placeholder:text-[#FFF8ED]/35 focus:outline-none focus:border-[#FFC247]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#FFF8ED]/80 mb-1.5">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        placeholder="10-digit Indian mobile"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0907] border border-white/15 text-sm font-mono text-[#FFF8ED] placeholder:text-[#FFF8ED]/35 focus:outline-none focus:border-[#FFC247]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#FFF8ED]/80 mb-1.5">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0907] border border-white/15 text-sm text-[#FFF8ED] placeholder:text-[#FFF8ED]/35 focus:outline-none focus:border-[#FFC247]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#FFF8ED]/80 mb-1.5">
                        Topic *
                      </label>
                      <select
                        value={contactForm.subject}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, subject: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0907] border border-white/15 text-sm text-[#FFF8ED] focus:outline-none focus:border-[#FFC247]"
                      >
                        <option value="Table Inquiry / Dining Question">
                          Table Inquiry / Dining Question
                        </option>
                        <option value="Party & Family Feast Pre-Order">
                          Party &amp; Family Feast Pre-Order
                        </option>
                        <option value="Catering / Bulk Biryani Packs">
                          Catering / Bulk Biryani Packs
                        </option>
                        <option value="General Feedback & Support">
                          General Feedback &amp; Support
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#FFF8ED]/80 mb-1.5">
                      Message *
                    </label>
                    <textarea
                      required
                      minLength={5}
                      rows={3}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Tell us your preferred date, party size, or question..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0907] border border-white/15 text-sm text-[#FFF8ED] placeholder:text-[#FFF8ED]/35 focus:outline-none focus:border-[#FFC247]"
                    />
                  </div>

                  {contactError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                      {contactError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#E87522] hover:bg-[#D36312] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Sending Message...' : 'Send Message'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right: Opening Hours (IST) & Direct Contact */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#15110E] p-6">
              <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#FFC247]" />
                  <h3 className="font-display font-bold text-lg text-[#FFF8ED]">
                    Opening Hours (IST)
                  </h3>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                    live?.isOpen
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-[#FFC247]/15 text-[#FFC247] border-[#FFC247]/30'
                  }`}
                >
                  {live?.statusLabel || 'Opens 12:00 PM'}
                </span>
              </div>

              {live && (
                <p className="text-xs text-[#FFF8ED]/55 mb-4 font-mono tabular-nums">
                  Local Time (Asia/Kolkata): {live.istTimeFormatted}
                </p>
              )}

              <div className="divide-y divide-white/8 text-sm">
                {hours.map((day) => {
                  const isToday = live?.todayDayName === day.dayName;
                  return (
                    <div
                      key={day.dayOfWeek}
                      className={`py-2.5 flex items-center justify-between gap-3 ${
                        isToday ? 'font-semibold text-[#FFC247]' : 'text-[#FFF8ED]/75'
                      }`}
                    >
                      <div>
                        <span>{day.dayName}</span>
                        {day.specialNote && (
                          <span className="block text-[11px] text-[#E87522] font-normal">
                            {day.specialNote}
                          </span>
                        )}
                      </div>
                      <div className="text-right font-mono text-xs sm:text-sm tabular-nums">
                        {day.isClosed ? (
                          <span className="text-red-400">Closed</span>
                        ) : (
                          <span>
                            {formatTime12h(day.openTime)} –{' '}
                            {day.closeTime ? formatTime12h(day.closeTime) : 'To be confirmed'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Contact Info (never invented) */}
            <div className="rounded-2xl border border-white/10 bg-[#15110E] p-6 space-y-4">
              <h3 className="font-display font-bold text-lg text-[#FFF8ED]">
                Direct Contact &amp; Ordering
              </h3>

              <div className="flex items-start gap-3 text-sm">
                <Phone className="w-4 h-4 text-[#FFC247] mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-[#FFF8ED]/55 block">Phone Number</span>
                  {settings?.phone ? (
                    <a
                      href={`tel:${settings.phone}`}
                      className="font-mono font-semibold text-[#FFF8ED] hover:text-[#FFC247]"
                    >
                      {settings.phone}
                    </a>
                  ) : (
                    <span className="text-[#FFF8ED]/70">
                      To be confirmed by restaurant owner in Admin Settings
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <MessageCircle className="w-4 h-4 text-[#FFC247] mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-[#FFF8ED]/55 block">WhatsApp Ordering</span>
                  {settings?.whatsappNumber ? (
                    <button
                      type="button"
                      onClick={onOpenOrder}
                      className="font-semibold text-[#FFC247] hover:underline cursor-pointer"
                    >
                      Start WhatsApp Order (+91 {settings.whatsappNumber})
                    </button>
                  ) : (
                    <span className="text-[#FFF8ED]/70">
                      WhatsApp number awaiting owner setup · Pickup pre-orders available online
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
