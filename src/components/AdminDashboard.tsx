import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BarChart3,
  CalendarClock,
  Check,
  Clock,
  Download,
  Image as ImageIcon,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  QrCode,
  Radio,
  Send,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { MenuItem, OrderRecord } from '../types.ts';
import {
  AdminOverviewData,
  CustomerMessagesPanel,
  CustomersOrdersPanel,
  ReportsPanel,
  TeamRolesPanel,
  getStatusLabel,
} from './AdminExtraPanels.tsx';

type AdminTab =
  | 'overview'
  | 'orders'
  | 'menu'
  | 'special'
  | 'gallery'
  | 'customers'
  | 'reports'
  | 'leads'
  | 'campaigns'
  | 'messages'
  | 'feedback'
  | 'hours'
  | 'settings'
  | 'team';

const FESTIVAL_PRESETS: Array<{ name: string; greeting: string; offer: string }> = [
  {
    name: 'Christmas',
    greeting:
      'Happy Christmas from Signature Dine! Celebrate this special occasion with delicious food and memorable moments. Visit us at Brindavan Gardens, Guntur. We look forward to serving you!',
    offer: '',
  },
  {
    name: 'New Year',
    greeting:
      'Happy New Year from Signature Dine! Wishing you and your family a joyful and delicious year ahead. Join us at Brindavan Gardens, Guntur!',
    offer: '',
  },
  {
    name: 'Sankranti',
    greeting:
      'Happy Makara Sankranti from Signature Dine (సిగ్నేచర్ డైన్)! Celebrate the harvest season with authentic Andhra flavours and family feasts in Guntur.',
    offer: '',
  },
  {
    name: 'Ugadi',
    greeting:
      'Ugadi Subhakankshalu from Signature Dine! Begin the Telugu New Year with traditional Andhra hospitality and flavourful biryanis in Brindavan Gardens, Guntur.',
    offer: '',
  },
  {
    name: 'Diwali',
    greeting:
      'Happy Diwali from Signature Dine! May this festival of lights bring warmth, happiness, and memorable dining moments with your loved ones.',
    offer: '',
  },
  {
    name: 'Eid',
    greeting:
      'Eid Mubarak from Signature Dine! Celebrate with our signature slow-cooked Mutton Dum Biryani and special Andhra delicacies in Guntur.',
    offer: '',
  },
  {
    name: 'Dussehra',
    greeting:
      'Happy Dussehra from Signature Dine! Gather your family and friends for an unforgettable Andhra meal in Brindavan Gardens, Guntur.',
    offer: '',
  },
  {
    name: 'Holi',
    greeting:
      'Happy Holi from Signature Dine! Add vibrant Andhra flavours to your celebrations—visit us at 3rd Line, Brindavan Gardens, Guntur.',
    offer: '',
  },
];

export function AdminDashboard({
  onBackToSite,
  onOpenQrMenu,
}: {
  onBackToSite: () => void;
  onOpenQrMenu: () => void;
}) {
  const { authUser, authLoading, signInWithGoogle, signOutUser, getIdToken, refreshBootstrap } =
    useApp();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [liveFeedState, setLiveFeedState] = useState<'connecting' | 'live' | 'reconnecting'>(
    'connecting'
  );
  const [incomingOrderAlert, setIncomingOrderAlert] = useState<OrderRecord | null>(null);

  const showNotice = useCallback((msg: string) => {
    setError(null);
    setToast(msg);
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  const adminFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated. Please sign in again.');
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      return json;
    },
    [getIdToken]
  );

  const loadOverview = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    setError(null);
    try {
      const json = (await adminFetch('/api/admin/overview')) as AdminOverviewData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [authUser, adminFetch]);

  useEffect(() => {
    if (authUser) {
      loadOverview();
    } else {
      setData(null);
    }
  }, [authUser, loadOverview]);

  // Real-time Admin/Staff SSE Incoming Order Stream
  useEffect(() => {
    if (!authUser || !data?.currentUser) return;
    const role = data.currentUser.role;
    if (role !== 'admin' && role !== 'staff') return;

    let closed = false;
    let es: EventSource | null = null;
    let reconnectTimer: number | null = null;

    async function connectStream() {
      if (closed) return;
      setLiveFeedState('connecting');
      try {
        const res = (await adminFetch('/api/admin/stream-ticket', {
          method: 'POST',
        })) as { ticket: string };
        if (closed) return;

        es = new EventSource(`/api/admin/stream?ticket=${encodeURIComponent(res.ticket)}`);
        es.onopen = () => {
          setLiveFeedState('live');
        };
        es.addEventListener('admin:ready', () => {
          setLiveFeedState('live');
        });
        es.addEventListener('order:event', (ev: MessageEvent) => {
          try {
            const payload = JSON.parse(ev.data) as {
              type: 'created' | 'updated';
              order: OrderRecord;
            };
            if (payload.type === 'created') {
              setIncomingOrderAlert(payload.order);
            }
            loadOverview();
          } catch {
            // ignore malformed payload
          }
        });
        es.onerror = () => {
          setLiveFeedState('reconnecting');
          es?.close();
          if (!closed) {
            reconnectTimer = window.setTimeout(connectStream, 4000);
          }
        };
      } catch {
        setLiveFeedState('reconnecting');
        if (!closed) {
          reconnectTimer = window.setTimeout(connectStream, 6000);
        }
      }
    }

    connectStream();

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [authUser, data?.currentUser?.id, data?.currentUser?.role, adminFetch, loadOverview]);

  const uploadImageFile = async (file: File): Promise<string> => {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read image file'));
      reader.readAsDataURL(file);
    });
    const res = await adminFetch('/api/admin/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl }),
    });
    return res.url as string;
  };

  const handleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8ED] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-7 h-7 border-2 border-[#E87522] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#38251B]/75">Checking staff session...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-[#FFF8ED] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#38251B]/12 p-8 shadow-sm text-center space-y-5">
          <div>
            <p className="text-xs font-semibold text-[#E87522] mb-1">
              Signature Dine · సిగ్నేచర్ డైన్
            </p>
            <h1 className="font-display font-bold text-2xl text-[#38251B]">
              Owner &amp; Staff Admin Portal
            </h1>
            <p className="text-sm text-[#38251B]/75 mt-2 leading-relaxed">
              Sign in securely with your authorized Google account to manage live orders, menu
              prices &amp; availability, customers, sales reports, and restaurant settings.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 text-left">
              {authError}
            </div>
          )}

          <button
            type="button"
            disabled={signingIn}
            onClick={handleSignIn}
            className="w-full py-3 px-5 rounded-xl bg-[#E87522] hover:bg-[#D36312] disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            {signingIn ? 'Opening Google Sign-In...' : 'Sign in with Google'}
          </button>

          <p className="text-[11px] text-[#38251B]/55">
            Protected by server-side Firebase verification and Admin / Staff role permissions.
          </p>

          <button
            type="button"
            onClick={onBackToSite}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#38251B]/70 hover:text-[#38251B] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Website</span>
          </button>
        </div>
      </div>
    );
  }

  // Signed in, but awaiting Admin role approval or disabled
  if (!loading && !data && error) {
    return (
      <div className="min-h-screen bg-[#FFF8ED] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#38251B]/12 p-8 shadow-sm text-center space-y-4">
          <Shield className="w-10 h-10 text-[#E87522] mx-auto" />
          <h1 className="font-display font-bold text-xl text-[#38251B]">
            Authorization Required
          </h1>
          <p className="text-xs font-mono text-[#38251B]/70 bg-[#FFF8ED] px-3 py-1.5 rounded-lg inline-block">
            Signed in as: {authUser.email}
          </p>
          <p className="text-sm text-[#38251B]/80 leading-relaxed">{error}</p>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => loadOverview()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#E87522] text-white text-xs font-semibold cursor-pointer"
            >
              Retry Check
            </button>
            <button
              type="button"
              onClick={() => signOutUser()}
              className="flex-1 py-2.5 px-4 rounded-xl border border-[#38251B]/20 text-[#38251B] text-xs font-semibold cursor-pointer"
            >
              Switch Account
            </button>
          </div>
          <button
            type="button"
            onClick={onBackToSite}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#38251B]/65 hover:text-[#38251B] cursor-pointer pt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Website</span>
          </button>
        </div>
      </div>
    );
  }

  const userRole = data?.currentUser?.role || 'staff';
  const isAdmin = userRole === 'admin';

  const allNavItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
  }> = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'orders', label: 'Live Orders', icon: <ShoppingBag className="w-4 h-4" /> },
    {
      id: 'menu',
      label: isAdmin ? 'Menu & Categories' : 'Menu Availability',
      icon: <UtensilsCrossed className="w-4 h-4" />,
    },
    { id: 'customers', label: 'Customers & History', icon: <Award className="w-4 h-4" /> },
    { id: 'reports', label: 'Sales Reports', icon: <TrendingUp className="w-4 h-4" />, adminOnly: true },
    { id: 'special', label: "Today's Special", icon: <Sparkles className="w-4 h-4" />, adminOnly: true },
    { id: 'gallery', label: 'Gallery', icon: <ImageIcon className="w-4 h-4" />, adminOnly: true },
    { id: 'leads', label: 'Customer Leads', icon: <Users className="w-4 h-4" />, adminOnly: true },
    { id: 'campaigns', label: 'Festival Campaigns', icon: <Send className="w-4 h-4" />, adminOnly: true },
    { id: 'messages', label: 'Customer Messages', icon: <Mail className="w-4 h-4" />, adminOnly: true },
    { id: 'feedback', label: 'Feedback', icon: <MessageSquare className="w-4 h-4" />, adminOnly: true },
    { id: 'hours', label: 'Opening Hours', icon: <Clock className="w-4 h-4" />, adminOnly: true },
    { id: 'settings', label: 'Settings & Banners', icon: <Settings className="w-4 h-4" />, adminOnly: true },
    { id: 'team', label: 'Team & Roles', icon: <Shield className="w-4 h-4" />, adminOnly: true },
  ];

  const navItems = allNavItems.filter((item) => isAdmin || !item.adminOnly);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-[#24150E] text-[#FFF8ED] shrink-0 flex flex-col">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-display font-bold text-lg text-white">Signature Dine</p>
            <p className="text-xs text-[#FFC247]">
              {isAdmin ? 'Admin Portal' : 'Staff Kitchen Portal'}
            </p>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              isAdmin ? 'bg-[#E87522] text-white' : 'bg-white/15 text-[#FFC247]'
            }`}
          >
            {userRole}
          </span>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                tab === item.id
                  ? 'bg-[#E87522] text-white'
                  : 'text-[#FFF8ED]/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </span>
              {item.id === 'orders' && (data?.stats.pendingOrders ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#FFC247] text-[#38251B] text-[10px] font-mono font-bold">
                  {data!.stats.pendingOrders}
                </span>
              )}
              {item.id === 'messages' && (data?.unreadMessagesCount ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#FFC247] text-[#38251B] text-[10px] font-mono font-bold">
                  {data!.unreadMessagesCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2 text-xs">
          <p className="text-[#FFF8ED]/65 truncate">{authUser.email}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToSite}
              className="flex-1 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium cursor-pointer"
            >
              Public Site
            </button>
            <button
              type="button"
              onClick={() => signOutUser()}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {isAdmin ? 'Admin' : 'Staff'} / {navItems.find((n) => n.id === tab)?.label}
              </p>
              <h1 className="text-2xl font-bold text-slate-900">
                {navItems.find((n) => n.id === tab)?.label}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700">
                <Radio
                  className={`w-3.5 h-3.5 ${
                    liveFeedState === 'live'
                      ? 'text-emerald-600 animate-pulse'
                      : 'text-amber-600'
                  }`}
                />
                <span>
                  {liveFeedState === 'live'
                    ? 'Live Order Feed'
                    : liveFeedState === 'connecting'
                    ? 'Connecting...'
                    : 'Reconnecting...'}
                </span>
              </span>

              <button
                type="button"
                onClick={onOpenQrMenu}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-[#E87522]" />
                <span>QR Menu Poster</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => loadOverview()}
                className="px-3.5 py-2 rounded-lg bg-slate-900 disabled:opacity-60 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                {loading ? 'Syncing...' : 'Refresh Data'}
              </button>
            </div>
          </div>

          {/* Incoming Order Real-time Alert */}
          {incomingOrderAlert && (
            <div className="p-4 rounded-xl bg-amber-50 border border-[#E87522]/40 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="text-sm text-[#38251B]">
                <strong className="text-[#E87522]">New Incoming Order:</strong>{' '}
                <span className="font-mono font-bold">{incomingOrderAlert.orderNumber}</span> from{' '}
                <strong>{incomingOrderAlert.customerName}</strong> (₹{incomingOrderAlert.total})
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab('orders');
                    setIncomingOrderAlert(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#E87522] text-white text-xs font-semibold cursor-pointer"
                >
                  Open Live Orders
                </button>
                <button
                  type="button"
                  onClick={() => setIncomingOrderAlert(null)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {toast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-900">
              {toast}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          {loading && !data ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading restaurant operations...
            </div>
          ) : data ? (
            <>
              {tab === 'overview' && (
                <OverviewPanel
                  data={data}
                  isAdmin={isAdmin}
                  onGoToOrders={() => setTab('orders')}
                />
              )}
              {tab === 'orders' && (
                <OrdersPanel
                  data={data}
                  adminFetch={adminFetch}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await loadOverview();
                  }}
                  onError={showError}
                />
              )}
              {tab === 'menu' && (
                <MenuAdminPanel
                  data={data}
                  isAdmin={isAdmin}
                  adminFetch={adminFetch}
                  uploadImageFile={uploadImageFile}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await Promise.all([loadOverview(), refreshBootstrap()]);
                  }}
                  onError={showError}
                />
              )}
              {tab === 'customers' && (
                <CustomersOrdersPanel
                  data={data}
                  adminFetch={adminFetch}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await loadOverview();
                  }}
                  onError={showError}
                />
              )}
              {tab === 'reports' && isAdmin && (
                <ReportsPanel data={data} getIdToken={getIdToken} onError={showError} />
              )}
              {tab === 'special' && isAdmin && (
                <SpecialAdminPanel
                  data={data}
                  adminFetch={adminFetch}
                  uploadImageFile={uploadImageFile}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await Promise.all([loadOverview(), refreshBootstrap()]);
                  }}
                  onError={showError}
                />
              )}
              {tab === 'gallery' && isAdmin && (
                <GalleryAdminPanel
                  data={data}
                  adminFetch={adminFetch}
                  uploadImageFile={uploadImageFile}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await Promise.all([loadOverview(), refreshBootstrap()]);
                  }}
                  onError={showError}
                />
              )}
              {tab === 'leads' && isAdmin && (
                <LeadsAdminPanel
                  data={data}
                  adminFetch={adminFetch}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await loadOverview();
                  }}
                  onError={showError}
                />
              )}
              {tab === 'campaigns' && isAdmin && (
                <CampaignsAdminPanel
                  data={data}
                  adminFetch={adminFetch}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await loadOverview();
                  }}
                  onError={showError}
                />
              )}
              {tab === 'messages' && isAdmin && (
                <CustomerMessagesPanel
                  data={data}
                  adminFetch={adminFetch}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await loadOverview();
                  }}
                  onError={showError}
                />
              )}
              {tab === 'feedback' && isAdmin && (
                <FeedbackAdminPanel
                  data={data}
                  adminFetch={adminFetch}
                  getIdToken={getIdToken}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await loadOverview();
                  }}
                  onError={showError}
                />
              )}
              {tab === 'hours' && isAdmin && (
                <HoursAdminPanel
                  data={data}
                  adminFetch={adminFetch}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await Promise.all([loadOverview(), refreshBootstrap()]);
                  }}
                  onError={showError}
                />
              )}
              {tab === 'settings' && isAdmin && (
                <SettingsAdminPanel
                  data={data}
                  adminFetch={adminFetch}
                  onOpenSpecial={() => setTab('special')}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await Promise.all([loadOverview(), refreshBootstrap()]);
                  }}
                  onError={showError}
                />
              )}
              {tab === 'team' && isAdmin && (
                <TeamRolesPanel
                  data={data}
                  adminFetch={adminFetch}
                  onChanged={async (msg) => {
                    showNotice(msg);
                    await loadOverview();
                  }}
                  onError={showError}
                />
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

// =========================================================================
// SUB-PANELS
// =========================================================================

function OverviewPanel({
  data,
  isAdmin,
  onGoToOrders,
}: {
  data: AdminOverviewData;
  isAdmin: boolean;
  onGoToOrders: () => void;
}) {
  const cards = [
    { label: 'Total Orders', value: String(data.stats.totalOrders) },
    ...(isAdmin
      ? [
          {
            label: 'Total Sales',
            value: `₹${(data.stats.totalSales ?? 0).toLocaleString('en-IN')}`,
          },
        ]
      : []),
    { label: 'Pending Orders', value: String(data.stats.pendingOrders) },
    { label: 'Customers', value: String(data.stats.totalCustomers) },
    { label: "Today's Orders", value: String(data.stats.todaysOrders) },
    ...(isAdmin
      ? [
          {
            label: "Today's Sales",
            value: `₹${(data.stats.todaysSales ?? 0).toLocaleString('en-IN')}`,
          },
          { label: 'Consented Leads', value: String(data.stats.totalLeads) },
          { label: 'Feedback Count', value: String(data.stats.totalFeedback) },
        ]
      : [
          { label: 'Preparing Now', value: String(data.stats.statusCounts.preparing || 0) },
          { label: 'Ready for Pickup', value: String(data.stats.statusCounts.ready || 0) },
        ]),
  ];

  const statuses: Array<{ key: OrderRecord['status']; label: string }> = [
    { key: 'new', label: 'Pending (New)' },
    { key: 'confirmed', label: 'Accepted' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready', label: 'Ready for Pickup' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const maxStatusCount = Math.max(
    1,
    ...statuses.map((s) => data.stats.statusCounts[s.key] || 0)
  );
  const maxDishQty = Math.max(
    1,
    ...data.stats.popularOrderedDishes.map((d) => d.quantity)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {data.stats.pendingOrders > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-950">
            <strong>{data.stats.pendingOrders} pending order(s)</strong> awaiting kitchen review
            or preparation.
          </p>
          <button
            type="button"
            onClick={onGoToOrders}
            className="px-4 py-2 rounded-lg bg-[#E87522] text-white text-xs font-semibold cursor-pointer"
          >
            Manage Live Orders
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-4">Orders by Status</h2>
          <div className="space-y-3">
            {statuses.map((s) => {
              const val = data.stats.statusCounts[s.key] || 0;
              const pct = Math.round((val / maxStatusCount) * 100);
              return (
                <div key={s.key} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{s.label}</span>
                    <span className="font-mono tabular-nums">{val}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-[#E87522] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-4">Most Ordered Menu Items</h2>
          {data.stats.popularOrderedDishes.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Ordered item metrics will appear once pickup pre-orders are placed.
            </p>
          ) : (
            <div className="space-y-3">
              {data.stats.popularOrderedDishes.map((d) => {
                const pct = Math.round((d.quantity / maxDishQty) * 100);
                return (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span className="truncate">{d.name}</span>
                      <span className="font-mono tabular-nums">{d.quantity} ordered</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-[#FFC247] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersPanel({
  data,
  adminFetch,
  onChanged,
  onError,
}: {
  data: AdminOverviewData;
  adminFetch: (u: string, o?: RequestInit) => Promise<any>;
  onChanged: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<number | null>(null);

  const tabs = [
    { id: 'all', label: 'All', count: data.orders.length },
    { id: 'new', label: 'Pending (New)', count: data.stats.statusCounts.new || 0 },
    { id: 'confirmed', label: 'Accepted', count: data.stats.statusCounts.confirmed || 0 },
    { id: 'preparing', label: 'Preparing', count: data.stats.statusCounts.preparing || 0 },
    { id: 'ready', label: 'Ready for Pickup', count: data.stats.statusCounts.ready || 0 },
    { id: 'completed', label: 'Completed', count: data.stats.statusCounts.completed || 0 },
    { id: 'cancelled', label: 'Rejected / Cancelled', count: data.stats.statusCounts.cancelled || 0 },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (q) {
        const hay = `${o.orderNumber} ${o.customerName} ${o.customerPhone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.orders, filter, search]);

  const updateStatus = async (orderId: number, status: OrderRecord['status'], awardStamp = false) => {
    setBusyId(orderId);
    setConfirmRejectId(null);
    try {
      const res = await adminFetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, awardStamp }),
      });
      await onChanged(
        res.stampAwarded
          ? `Order updated to ${getStatusLabel(status)} and 1 loyalty stamp awarded.`
          : `Order updated to ${getStatusLabel(status)} (live-synced to customer).`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update order status.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                filter === t.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order #, name, mobile..."
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm w-full sm:w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No orders match this filter yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                        order.status === 'ready' || order.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : order.status === 'cancelled'
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="text-xs text-slate-500 capitalize">{order.orderType}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    {order.customerName} · <span className="font-mono">{order.customerPhone}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pickup Schedule: {order.pickupDate} at {order.pickupTime} · Placed:{' '}
                    {new Date(order.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                    ₹{order.total}
                  </p>
                  {order.hasUnpricedItems && (
                    <p className="text-[11px] text-amber-700">Includes unpriced items</p>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-3 space-y-1">
                {order.items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      {it.dishName} × {it.quantity}
                    </span>
                    <span className="font-mono">
                      {it.unitPrice !== null ? `₹${it.lineTotal}` : 'TBD'}
                    </span>
                  </div>
                ))}
                {order.specialInstructions && (
                  <p className="pt-1 border-t border-slate-200 text-slate-600">
                    Instructions: {order.specialInstructions}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {order.status === 'new' && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === order.id}
                      onClick={() => updateStatus(order.id, 'confirmed', false)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                    >
                      Accept Order
                    </button>
                    <button
                      type="button"
                      disabled={busyId === order.id}
                      onClick={() => setConfirmRejectId(order.id)}
                      className="px-3.5 py-1.5 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 disabled:opacity-40 text-red-700 text-xs font-semibold cursor-pointer"
                    >
                      Reject Order
                    </button>
                  </>
                )}

                {(
                  [
                    { st: 'new', label: 'Pending' },
                    { st: 'preparing', label: 'Preparing' },
                    { st: 'ready', label: 'Ready for Pickup' },
                    { st: 'completed', label: 'Completed' },
                  ] as const
                ).map(({ st, label }) => (
                  <button
                    key={st}
                    type="button"
                    disabled={busyId === order.id || order.status === st}
                    onClick={() => updateStatus(order.id, st, false)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      order.status === st
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40'
                    }`}
                  >
                    {label}
                  </button>
                ))}

                {order.status !== 'new' && order.status !== 'cancelled' && order.status !== 'completed' && (
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => setConfirmRejectId(order.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                  >
                    Cancel Order
                  </button>
                )}

                {order.status === 'completed' && !order.hasLoyaltyStamp && (
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => updateStatus(order.id, 'completed', true)}
                    className="px-3 py-1.5 rounded-lg bg-[#E87522] text-white text-xs font-semibold cursor-pointer"
                  >
                    + Award Loyalty Stamp
                  </button>
                )}
                {order.hasLoyaltyStamp && (
                  <span className="text-xs font-semibold text-emerald-700">
                    ✓ Loyalty Stamp Awarded
                  </span>
                )}
              </div>

              {/* Inline Reject/Cancel Confirmation */}
              {confirmRejectId === order.id && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-red-900 font-medium">
                    Confirm rejecting/cancelling order <strong>{order.orderNumber}</strong>?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === order.id}
                      onClick={() => updateStatus(order.id, 'cancelled', false)}
                      className="px-3 py-1 rounded bg-red-700 text-white font-semibold cursor-pointer"
                    >
                      Yes, Cancel Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRejectId(null)}
                      className="px-3 py-1 rounded border border-slate-300 bg-white text-slate-700 font-semibold cursor-pointer"
                    >
                      Keep Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuAdminPanel({
  data,
  isAdmin,
  adminFetch,
  uploadImageFile,
  onChanged,
  onError,
}: {
  data: AdminOverviewData;
  isAdmin: boolean;
  adminFetch: (u: string, o?: RequestInit) => Promise<any>;
  uploadImageFile: (f: File) => Promise<string>;
  onChanged: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteDishId, setConfirmDeleteDishId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<number | 'all'>('all');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    categoryId: data.categories[0]?.id || 1,
    name: '',
    description: '',
    price: '',
    isPriceConfirmed: true,
    isVeg: false,
    isSpicy: false,
    isAvailable: true,
    isBestseller: false,
    imageUrl: '',
  });

  const categoryNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const c of data.categories) map[c.id] = c.name;
    return map;
  }, [data.categories]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.menuItems.filter((item) => {
      if (catFilter !== 'all' && item.categoryId !== catFilter) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [data.menuItems, search, catFilter]);

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setForm({
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: item.price !== null ? String(item.price) : '',
      isPriceConfirmed: item.isPriceConfirmed,
      isVeg: item.isVeg,
      isSpicy: item.isSpicy,
      isAvailable: item.isAvailable,
      isBestseller: item.isBestseller,
      imageUrl: item.imageUrl || '',
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      categoryId: data.categories[0]?.id || 1,
      name: '',
      description: '',
      price: '',
      isPriceConfirmed: true,
      isVeg: false,
      isSpicy: false,
      isAvailable: true,
      isBestseller: false,
      imageUrl: '',
    });
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const numericPrice = form.price.trim() ? Number(form.price.trim()) : null;
      const body = {
        categoryId: Number(form.categoryId),
        name: form.name,
        description: form.description,
        price: numericPrice,
        isPriceConfirmed: numericPrice !== null && numericPrice > 0 ? form.isPriceConfirmed : false,
        isVeg: form.isVeg,
        isSpicy: form.isSpicy,
        isAvailable: form.isAvailable,
        isBestseller: form.isBestseller,
        imageUrl: form.imageUrl || null,
      };
      if (editingId) {
        await adminFetch(`/api/admin/menu/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        resetForm();
        await onChanged('Menu item updated and live-synced to public menu.');
      } else {
        await adminFetch('/api/admin/menu', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        resetForm();
        await onChanged('New menu item added and live-synced to public menu.');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save menu item.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    setTogglingId(item.id);
    try {
      await adminFetch(`/api/admin/menu/${item.id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      await onChanged(
        `${item.name} marked ${!item.isAvailable ? 'Available' : 'Unavailable'} on public menu.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to toggle availability.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await adminFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName }),
      });
      setNewCatName('');
      await onChanged('Menu category added.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add category.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Categories (Admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Manage Food Categories</h2>
          <div className="flex flex-wrap gap-2">
            {data.categories.map((cat) => (
              <div
                key={cat.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800"
              >
                {editingCatId === cat.id ? (
                  <>
                    <input
                      type="text"
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      className="px-2 py-0.5 rounded border border-slate-300 bg-white text-xs w-32"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await adminFetch(`/api/admin/categories/${cat.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ name: editingCatName }),
                          });
                          setEditingCatId(null);
                          await onChanged('Category renamed.');
                        } catch (err) {
                          onError(err instanceof Error ? err.message : 'Rename failed.');
                        }
                      }}
                      className="text-emerald-700 hover:underline cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCatId(null)}
                      className="text-slate-500 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span>{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setEditingCatName(cat.name);
                      }}
                      className="text-[#E87522] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                    {confirmDeleteCatId === cat.id ? (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await adminFetch(`/api/admin/categories/${cat.id}`, {
                                method: 'DELETE',
                              });
                              setConfirmDeleteCatId(null);
                              await onChanged('Category deleted.');
                            } catch (err) {
                              onError(err instanceof Error ? err.message : 'Delete failed.');
                            }
                          }}
                          className="text-red-700 font-bold cursor-pointer"
                        >
                          Confirm?
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCatId(null)}
                          className="text-slate-500 cursor-pointer"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCatId(cat.id)}
                        className="text-red-600 hover:text-red-800 cursor-pointer"
                        title="Delete category"
                      >
                        ×
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2 max-w-md">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="New category name..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
            >
              Add Category
            </button>
          </form>
        </div>
      )}

      {/* Add / Edit Dish Form (Admin only) */}
      {isAdmin && (
        <form
          onSubmit={handleSaveDish}
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {editingId ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-slate-600 underline cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dish Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Price in ₹ (leave blank if unconfirmed)
              </label>
              <input
                type="number"
                min={1}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. 380"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
            <textarea
              rows={2}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Food Image URL or Upload
              </label>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="/uploads/... or https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Uploading...' : 'Upload Food Photo'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      const url = await uploadImageFile(file);
                      setForm((f) => ({ ...f, imageUrl: url }));
                    } catch (err) {
                      onError(err instanceof Error ? err.message : 'Image upload failed.');
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-xs font-medium text-slate-700 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isVeg}
                onChange={(e) => setForm({ ...form, isVeg: e.target.checked })}
              />
              Vegetarian
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isSpicy}
                onChange={(e) => setForm({ ...form, isSpicy: e.target.checked })}
              />
              Spicy
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isBestseller}
                onChange={(e) => setForm({ ...form, isBestseller: e.target.checked })}
              />
              Best-Selling Dish
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
              />
              Available
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E87522] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Dish to Menu'}</span>
          </button>
        </form>
      )}

      {/* Menu Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            Menu Items ({filteredItems.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes..."
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs sm:text-sm"
            />
            <select
              value={catFilter}
              onChange={(e) =>
                setCatFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs sm:text-sm"
            >
              <option value="all">All Categories</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3">Dish</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Availability</th>
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2.5">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200"
                        />
                      )}
                      <div>
                        <p>{item.name}</p>
                        {item.isBestseller && (
                          <span className="text-[11px] text-[#E87522] font-semibold">
                            Popular Dish
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {categoryNameMap[item.categoryId] || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {item.isVeg ? 'Veg' : 'Non-Veg'} {item.isSpicy ? '· Spicy' : ''}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.isPriceConfirmed && item.price !== null
                      ? `₹${item.price}`
                      : 'Awaiting owner'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <button
                      type="button"
                      disabled={togglingId === item.id}
                      onClick={() => handleToggleAvailability(item)}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer border ${
                        item.isAvailable
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {togglingId === item.id
                        ? 'Updating...'
                        : item.isAvailable
                        ? 'Available'
                        : 'Unavailable'}
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="text-xs font-semibold text-[#E87522] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      {confirmDeleteDishId === item.id ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await adminFetch(`/api/admin/menu/${item.id}`, {
                                  method: 'DELETE',
                                });
                                setConfirmDeleteDishId(null);
                                await onChanged('Menu item deleted.');
                              } catch (err) {
                                onError(err instanceof Error ? err.message : 'Delete failed.');
                              }
                            }}
                            className="text-xs font-bold text-red-700 cursor-pointer"
                          >
                            Confirm?
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDishId(null)}
                            className="text-xs text-slate-500 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDishId(item.id)}
                          className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SpecialAdminPanel({
  data,
  adminFetch,
  uploadImageFile,
  onChanged,
  onError,
}: {
  data: AdminOverviewData;
  adminFetch: (u: string, o?: RequestInit) => Promise<any>;
  uploadImageFile: (f: File) => Promise<string>;
  onChanged: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const s = data.todaysSpecial;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dishName: s?.dishName || '',
    description: s?.description || '',
    specialPrice: s?.specialPrice !== null && s?.specialPrice !== undefined ? String(s.specialPrice) : '',
    originalPrice: s?.originalPrice !== null && s?.originalPrice !== undefined ? String(s.originalPrice) : '',
    imageUrl: s?.imageUrl || '',
    validDate: s?.validDate || new Date().toISOString().slice(0, 10),
    isAvailable: s?.isAvailable ?? true,
    isEnabled: s?.isEnabled ?? false,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFetch('/api/admin/special', {
        method: 'PUT',
        body: JSON.stringify({
          dishName: form.dishName,
          description: form.description,
          specialPrice: form.specialPrice ? Number(form.specialPrice) : null,
          originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
          imageUrl: form.imageUrl || null,
          validDate: form.validDate,
          isAvailable: form.isAvailable,
          isEnabled: form.isEnabled,
        }),
      });
      await onChanged("Today's Special updated and live-synced.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save Today's Special.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Today&apos;s Special Promotional Offer Banner
          </h2>
          <p className="text-xs text-slate-500">
            When disabled or expired, the Today&apos;s Special section automatically hides on the
            homepage.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isEnabled}
            onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
          />
          Show on Homepage
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Dish Name *</label>
          <input
            type="text"
            required
            value={form.dishName}
            onChange={(e) => setForm({ ...form, dishName: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Date *</label>
          <input
            type="date"
            required
            value={form.validDate}
            onChange={(e) => setForm({ ...form, validDate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
        <textarea
          rows={2}
          required
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Today&apos;s Price (₹)
          </label>
          <input
            type="number"
            min={1}
            value={form.specialPrice}
            onChange={(e) => setForm({ ...form, specialPrice: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Original Price (₹, optional)
          </label>
          <input
            type="number"
            min={1}
            value={form.originalPrice}
            onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
            />
            Currently Available
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          placeholder="Special image URL"
          className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-slate-300 text-sm"
        />
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>Upload Photo</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const url = await uploadImageFile(file);
                setForm((f) => ({ ...f, imageUrl: url }));
              } catch (err) {
                onError(err instanceof Error ? err.message : 'Image upload failed.');
              }
            }}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 rounded-lg bg-[#E87522] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
      >
        {saving ? 'Saving...' : "Save Today's Special"}
      </button>
    </form>
  );
}

function GalleryAdminPanel({
  data,
  adminFetch,
  uploadImageFile,
  onChanged,
  onError,
}: {
  data: AdminOverviewData;
  adminFetch: (u: string, o?: RequestInit) => Promise<any>;
  uploadImageFile: (f: File) => Promise<string>;
  onChanged: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'Biryani',
    imageUrl: '',
    caption: '',
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFetch('/api/admin/gallery', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ title: '', category: 'Biryani', imageUrl: '', caption: '' });
      await onChanged('Gallery photo added.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add photo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Add Photo to Gallery</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Photo title"
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          >
            <option>Biryani</option>
            <option>Andhra Dishes</option>
            <option>Interior & Ambiance</option>
            <option>Family Dining</option>
            <option>Preparation</option>
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="Image URL or upload"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <label className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold cursor-pointer flex items-center">
              Upload
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await uploadImageFile(file);
                    setForm((f) => ({ ...f, imageUrl: url }));
                  } catch (err) {
                    onError(err instanceof Error ? err.message : 'Upload failed.');
                  }
                }}
              />
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-[#E87522] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
        >
          {saving ? 'Adding...' : 'Add to Gallery'}
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.galleryItems.map((g) => (
          <div key={g.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <img src={g.imageUrl} alt={g.title} className="w-full h-44 object-cover" />
            <div className="p-3.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{g.title}</p>
                <p className="text-xs text-slate-500">{g.category}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await adminFetch(`/api/admin/gallery/${g.id}`, { method: 'DELETE' });
                    await onChanged('Gallery photo removed.');
                  } catch (err) {
                    onError(err instanceof Error ? err.message : 'Delete failed.');
                  }
                }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadsAdminPanel({
  data,
  adminFetch,
  onChanged,
  onError,
}: {
  data: AdminOverviewData;
  adminFetch: (u: string, o?: RequestInit) => Promise<any>;
  onChanged: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Mobile</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Consent Status</th>
            <th className="px-4 py-3">Consent Time</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.leads.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                No WhatsApp promotional leads collected yet.
              </td>
            </tr>
          ) : (
            data.leads.map((lead) => (
              <tr key={lead.id}>
                <td className="px-4 py-3 font-medium">{lead.name || 'Guest'}</td>
                <td className="px-4 py-3 font-mono text-xs">{lead.phone}</td>
                <td className="px-4 py-3 text-xs capitalize">{lead.source}</td>
                <td className="px-4 py-3 text-xs">
                  {lead.unsubscribed
                    ? 'Unsubscribed'
                    : lead.consentStatus
                    ? 'Consented'
                    : 'No consent'}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-slate-500">
                  {new Date(lead.consentTimestamp).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3 text-right">
                  {!lead.unsubscribed && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await adminFetch(`/api/admin/leads/${lead.id}/unsubscribe`, {
                            method: 'PATCH',
                          });
                          await onChanged('Subscriber opted out.');
                        } catch (err) {
                          onError(err instanceof Error ? err.message : 'Update failed.');
                        }
                      }}
                      className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      Unsubscribe
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function CampaignsAdminPanel({
  data,
  adminFetch,
  onChanged,
  onError,
}: {
  data: AdminOverviewData;
  adminFetch: (u: string, o?: RequestInit) => Promise<any>;
  onChanged: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [festivalName, setFestivalName] = useState(FESTIVAL_PRESETS[0].name);
  const [greetingMessage, setGreetingMessage] = useState(FESTIVAL_PRESETS[0].greeting);
  const [offerText, setOfferText] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [manualRecipients, setManualRecipients] = useState<
    Array<{
      deliveryId: number | null;
      leadId: number;
      name: string;
      phone: string;
      status: string;
      whatsappUrl: string;
    }>
  >([]);

  const previewText = offerText.trim()
    ? `${greetingMessage}\n\nSpecial Offer: ${offerText}`
    : greetingMessage;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFetch('/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          festivalName,
          greetingMessage,
          offerText: offerText || null,
          scheduledAt: scheduledAt || null,
        }),
      });
      await onChanged('Festival campaign saved.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save campaign.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendCampaign = async (id: number) => {
    try {
      const res = await adminFetch(`/api/admin/campaigns/${id}/send`, {
        method: 'POST',
      });
      if (res.mode === 'manual' && Array.isArray(res.recipients)) {
        setManualRecipients(res.recipients);
      }
      await onChanged(res.message);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to process campaign.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-950">
        {data.whatsappApiConfigured ? (
          <span>
            <strong>WhatsApp Business Cloud API Connected:</strong> Campaigns will be dispatched
            automatically to consented, non-unsubscribed leads.
          </span>
        ) : (
          <span>
            <strong>Manual WhatsApp Campaign Mode Active:</strong> Automated WhatsApp Business API
            credentials (<code>WHATSAPP_ACCESS_TOKEN</code>,{' '}
            <code>WHATSAPP_PHONE_NUMBER_ID</code>) are not configured. Clicking{' '}
            <strong>Generate WhatsApp Links</strong> creates personalized WhatsApp links for each
            consented lead.
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCreate}
          className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900">Create Festival Greeting</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Festival Preset
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FESTIVAL_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setFestivalName(p.name);
                    setGreetingMessage(p.greeting);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    festivalName === p.name
                      ? 'bg-[#E87522] text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Greeting Message *
            </label>
            <textarea
              rows={4}
              required
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Offer / Discount
              </label>
              <input
                type="text"
                value={offerText}
                onChange={(e) => setOfferText(e.target.value)}
                placeholder="e.g. Complimentary dessert on family dine-in"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Schedule Date &amp; Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E87522] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
          >
            <CalendarClock className="w-4 h-4" />
            <span>
              {saving ? 'Saving...' : `Save Campaign (${data.stats.totalLeads} Consented Leads)`}
            </span>
          </button>
        </form>

        {/* Live WhatsApp Preview + Test Send */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Live WhatsApp Message Preview</h2>
          <div className="rounded-xl bg-[#E7F8EE] border border-emerald-200 p-4 text-sm text-slate-800 whitespace-pre-line">
            {previewText}
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Send Test Preview to Your Number
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="10-digit test mobile"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
              />
              <a
                href={
                  testPhone.replace(/\D/g, '').length >= 10
                    ? `https://wa.me/91${testPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(previewText)}`
                    : undefined
                }
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold ${
                  testPhone.replace(/\D/g, '').length >= 10
                    ? 'bg-[#25D366] text-white'
                    : 'bg-slate-200 text-slate-500 pointer-events-none'
                }`}
              >
                Test in WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign History */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Campaign History</h2>
        {data.campaigns.length === 0 ? (
          <p className="text-sm text-slate-500">No campaigns created yet.</p>
        ) : (
          <div className="space-y-3">
            {data.campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-sm text-slate-900">{c.festivalName}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                      {c.status.replace('_', ' ')}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {c.recipientCount} recipients
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.greetingMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendCampaign(c.id)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                >
                  {data.whatsappApiConfigured ? 'Send Campaign' : 'Generate WhatsApp Links'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual WhatsApp Send Queue */}
      {manualRecipients.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-base font-bold text-slate-900">
            Manual WhatsApp Dispatch Queue ({manualRecipients.length} Consented Subscribers)
          </h3>
          <div className="divide-y divide-slate-100">
            {manualRecipients.map((r) => (
              <div key={r.leadId} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div>
                  <span className="font-semibold">{r.name}</span>{' '}
                  <span className="font-mono text-xs text-slate-500">{r.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 capitalize">{r.status}</span>
                  <a
                    href={r.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async () => {
                      if (r.deliveryId) {
                        await adminFetch(
                          `/api/admin/campaigns/deliveries/${r.deliveryId}/mark-sent`,
                          { method: 'POST' }
                        );
                        setManualRecipients((prev) =>
                          prev.map((x) =>
                            x.leadId === r.leadId ? { ...x, status: 'sent' } : x
                          )
                        );
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold"
                  >
                    Send on WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackAdminPanel({
  data,
  adminFetch,
  getIdToken,
  onChanged,
  onError,
}: {
  data: AdminOverviewData;
  adminFetch: (u: string, o?: RequestInit) => Promise<any>;
  getIdToken: () => Promise<string | null>;
  onChanged: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [minRating, setMinRating] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = data.feedback.filter((f) => {
    if (minRating > 0 && f.overallRating !== minRating) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${f.referenceNumber} ${f.customerName || ''} ${f.writtenFeedback || ''} ${
        f.suggestions || ''
      }`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const handleExportCsv = async () => {
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Session expired.');
      const res = await fetch('/api/admin/feedback/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to export CSV.');
      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'signature-dine-feedback.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feedback..."
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
          />
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
          >
            <option value={0}>All Overall Ratings</option>
            <option value={5}>5 Stars</option>
            <option value={4}>4 Stars</option>
            <option value={3}>3 Stars</option>
            <option value={2}>2 Stars</option>
            <option value={1}>1 Star</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No private feedback records match your filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((fb) => (
            <div key={fb.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {fb.referenceNumber}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {fb.customerName || 'Anonymous Guest'}
                  </span>
                  {fb.customerPhone && (
                    <span className="font-mono text-xs text-slate-500">{fb.customerPhone}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await adminFetch(`/api/admin/feedback/${fb.id}/review`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isReviewed: !fb.isReviewed }),
                      });
                      await onChanged('Feedback status updated.');
                    } catch (err) {
                      onError(err instanceof Error ? err.message : 'Update failed.');
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    fb.isReviewed
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{fb.isReviewed ? 'Reviewed' : 'Mark Reviewed'}</span>
                </button>
              </div>

              <p className="text-xs font-mono text-slate-600">
                Food: {fb.foodRating}/5 · Service: {fb.serviceRating}/5 · Ambiance:{' '}
                {fb.ambianceRating}/5 · Overall: {fb.overallRating}/5
              </p>

              {fb.writtenFeedback && (
                <p className="text-sm text-slate-800">Feedback: {fb.writtenFeedback}</p>
              )}
              {fb.suggestions && (
                <p className="text-sm text-slate-600">Suggestions: {fb.suggestions}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HoursAdminPanel({
  data,
  adminFetch,
  onChanged,
  onError,
}: {
  data: AdminOverviewData;
  adminFetch: (u: string, o?: RequestInit) => Promise<any>;
  onChanged: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [hours, setHours] = useState(data.openingHours);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFetch('/api/admin/hours', {
        method: 'PUT',
        body: JSON.stringify({
          hours: hours.map((h) => ({
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime || null,
            isClosed: h.isClosed,
            specialNote: h.specialNote || null,
          })),
        }),
      });
      await onChanged('Opening hours updated and live-synced.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save opening hours.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-base font-bold text-slate-900">
        Weekly Opening &amp; Closing Hours (IST)
      </h2>
      <div className="divide-y divide-slate-100">
        {hours.map((h, idx) => (
          <div
            key={h.dayOfWeek}
            className="py-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
          >
            <span className="md:col-span-2 font-semibold text-sm">{h.dayName}</span>
            <div className="md:col-span-2">
              <label className="text-[11px] text-slate-500 block">Opens</label>
              <input
                type="time"
                value={h.openTime}
                onChange={(e) =>
                  setHours((prev) =>
                    prev.map((row, i) => (i === idx ? { ...row, openTime: e.target.value } : row))
                  )
                }
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] text-slate-500 block">Closes (blank = TBD)</label>
              <input
                type="time"
                value={h.closeTime || ''}
                onChange={(e) =>
                  setHours((prev) =>
                    prev.map((row, i) =>
                      i === idx ? { ...row, closeTime: e.target.value || null } : row
                    )
                  )
                }
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-mono"
              />
            </div>
            <div className="md:col-span-2 pt-3">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={h.isClosed}
                  onChange={(e) =>
                    setHours((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, isClosed: e.target.checked } : row
                      )
                    )
                  }
                />
                Closed Day
              </label>
            </div>
            <div className="md:col-span-4">
              <label className="text-[11px] text-slate-500 block">Special Festival Note</label>
              <input
                type="text"
                value={h.specialNote || ''}
                onChange={(e) =>
                  setHours((prev) =>
                    prev.map((row, i) =>
                      i === idx ? { ...row, specialNote: e.target.value } : row
                    )
                  )
                }
                placeholder="Optional festival hours note"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 rounded-lg bg-[#E87522] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
      >
        {saving ? 'Saving...' : 'Save Weekly Schedule'}
      </button>
    </form>
  );
}

function SettingsAdminPanel({
  data,
  adminFetch,
  onOpenSpecial,
  onChanged,
  onError,
}: {
  data: AdminOverviewData;
  adminFetch: (u: string, o?: RequestInit) => Promise<any>;
  onOpenSpecial: () => void;
  onChanged: (msg: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const s = data.settings;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: s.name,
    teluguName: s.teluguName,
    address: s.address,
    plusCode: s.plusCode,
    phone: s.phone || '',
    whatsappNumber: s.whatsappNumber || '',
    googleMapsUrl: s.googleMapsUrl || '',
    googleReviewUrl: s.googleReviewUrl || '',
    instagramUrl: s.instagramUrl || '',
    facebookUrl: s.facebookUrl || '',
    deliveryEnabled: s.deliveryEnabled,
    deliveryCharge: s.deliveryCharge !== null ? String(s.deliveryCharge) : '',
    heroHeadline: s.heroHeadline,
    heroSubtext: s.heroSubtext,
    aboutText: s.aboutText,
    loyaltyTargetMeals: s.loyaltyTargetMeals,
    birthdayDiscountPercent: s.birthdayDiscountPercent,
    birthdayMaxDiscount: s.birthdayMaxDiscount,
    loyaltyRulesText: s.loyaltyRulesText,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          phone: form.phone || null,
          whatsappNumber: form.whatsappNumber || null,
          googleMapsUrl: form.googleMapsUrl || null,
          googleReviewUrl: form.googleReviewUrl || null,
          instagramUrl: form.instagramUrl || null,
          facebookUrl: form.facebookUrl || null,
          deliveryCharge: form.deliveryCharge ? Number(form.deliveryCharge) : null,
        }),
      });
      await onChanged('Restaurant settings, banners & content updated live.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">
          Restaurant Profile, Contact &amp; Homepage Banners
        </h2>
        <button
          type="button"
          onClick={onOpenSpecial}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E87522]/40 bg-amber-50 text-xs font-semibold text-[#38251B] hover:bg-amber-100 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E87522]" />
          <span>Edit Promotional Today&apos;s Special Banner</span>
        </button>
      </div>

      {/* Identity & Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Restaurant Name *
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Telugu Name *
          </label>
          <input
            type="text"
            required
            value={form.teluguName}
            onChange={(e) => setForm({ ...form, teluguName: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-telugu"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Address *</label>
          <input
            type="text"
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Google Maps Plus Code *
          </label>
          <input
            type="text"
            required
            value={form.plusCode}
            onChange={(e) => setForm({ ...form, plusCode: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
      </div>

      {/* Contact & Maps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Official Phone Number
          </label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Not configured yet"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            WhatsApp Ordering Number (10-digit Indian mobile)
          </label>
          <input
            type="text"
            value={form.whatsappNumber}
            onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
            placeholder="10-digit WhatsApp number"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Verified Google Business Review URL
          </label>
          <input
            type="url"
            value={form.googleReviewUrl}
            onChange={(e) => setForm({ ...form, googleReviewUrl: e.target.value })}
            placeholder="https://g.page/..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Google Maps Share URL
          </label>
          <input
            type="url"
            value={form.googleMapsUrl}
            onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={form.deliveryEnabled}
            onChange={(e) => setForm({ ...form, deliveryEnabled: e.target.checked })}
          />
          Enable Delivery Option
        </label>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Delivery Charge (₹)
          </label>
          <input
            type="number"
            min={0}
            value={form.deliveryCharge}
            onChange={(e) => setForm({ ...form, deliveryCharge: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Loyalty Target Meals
          </label>
          <input
            type="number"
            min={2}
            max={30}
            value={form.loyaltyTargetMeals}
            onChange={(e) =>
              setForm({ ...form, loyaltyTargetMeals: Number(e.target.value) || 10 })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Birthday Discount (%)
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={form.birthdayDiscountPercent}
            onChange={(e) =>
              setForm({ ...form, birthdayDiscountPercent: Number(e.target.value) || 15 })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Birthday Max Discount (₹)
          </label>
          <input
            type="number"
            min={0}
            value={form.birthdayMaxDiscount}
            onChange={(e) =>
              setForm({ ...form, birthdayMaxDiscount: Number(e.target.value) || 500 })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Homepage Hero Banner Headline
          </label>
          <input
            type="text"
            value={form.heroHeadline}
            onChange={(e) => setForm({ ...form, heroHeadline: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Homepage Hero Banner Supporting Text
          </label>
          <textarea
            rows={2}
            value={form.heroSubtext}
            onChange={(e) => setForm({ ...form, heroSubtext: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">About Us Copy</label>
          <textarea
            rows={3}
            value={form.aboutText}
            onChange={(e) => setForm({ ...form, aboutText: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Loyalty Program Rules &amp; Exclusions
          </label>
          <textarea
            rows={2}
            value={form.loyaltyRulesText}
            onChange={(e) => setForm({ ...form, loyaltyRulesText: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2.5 rounded-lg bg-[#E87522] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
      >
        {saving ? 'Saving...' : 'Save All Settings'}
      </button>
    </form>
  );
}
