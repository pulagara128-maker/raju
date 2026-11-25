import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  GalleryItem,
  MenuCategory,
  MenuItem,
  OrderRecord,
  RestaurantSettings,
  TodaysSpecial,
} from '../types.ts';
import type { OpeningHourRow } from '../lib/hours.ts';

export interface AdminCustomerRecord {
  id: number;
  name: string | null;
  phone: string;
  birthday: string | null;
  birthdayConsent: boolean;
  stampsCount: number;
  totalCompletedMeals: number;
  rewardsAvailable: number;
  rewardsRedeemed: number;
  orderCount?: number;
  totalSpent?: number;
  lastOrderAt?: string | null;
}

export interface AdminTeamUser {
  id: number;
  uid: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AdminContactMessage {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AdminReportsData {
  dailySales: Array<{
    date: string;
    label: string;
    orders: number;
    completed: number;
    sales: number;
  }>;
  weeklySales: Array<{
    weekStart: string;
    label: string;
    orders: number;
    completed: number;
    sales: number;
  }>;
  monthlySales: Array<{
    month: string;
    label: string;
    orders: number;
    completed: number;
    sales: number;
  }>;
  orderTypeBreakdown: {
    pickup: number;
    delivery: number;
    pickupSales: number;
    deliverySales: number;
  };
}

export interface AdminOverviewData {
  currentUser: AdminTeamUser;
  stats: {
    totalOrders: number;
    todaysOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalSales: number | null;
    todaysSales: number | null;
    completedSales: number | null;
    averageOrderValue: number | null;
    totalCustomers: number;
    totalLeads: number;
    totalLeadsAll: number;
    rewardsRedeemed: number;
    totalFeedback: number;
    statusCounts: Record<string, number>;
    popularOrderedDishes: Array<{ name: string; quantity: number; revenue?: number }>;
  };
  reports: AdminReportsData | null;
  settings: RestaurantSettings;
  openingHours: OpeningHourRow[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  todaysSpecial: TodaysSpecial;
  galleryItems: GalleryItem[];
  orders: OrderRecord[];
  customers: AdminCustomerRecord[];
  leads: Array<{
    id: number;
    name: string | null;
    phone: string;
    consentStatus: boolean;
    consentTimestamp: string;
    unsubscribed: boolean;
    source: string;
    createdAt: string;
  }>;
  feedback: Array<{
    id: number;
    referenceNumber: string;
    customerName: string | null;
    customerPhone: string | null;
    foodRating: number;
    serviceRating: number;
    ambianceRating: number;
    overallRating: number;
    writtenFeedback: string | null;
    suggestions: string | null;
    isReviewed: boolean;
    createdAt: string;
  }>;
  campaigns: Array<{
    id: number;
    festivalName: string;
    greetingMessage: string;
    offerText: string | null;
    scheduledAt: string | null;
    mode: string;
    status: string;
    recipientCount: number;
    createdAt: string;
    sentAt: string | null;
  }>;
  teamUsers: AdminTeamUser[];
  messages: AdminContactMessage[];
  unreadMessagesCount: number;
  whatsappApiConfigured: boolean;
}

export function getStatusLabel(status: OrderRecord['status']): string {
  switch (status) {
    case 'new':
      return 'Pending';
    case 'confirmed':
      return 'Accepted (Pending Prep)';
    case 'preparing':
      return 'Preparing';
    case 'ready':
      return 'Ready for Pickup';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
  }
}

export function CustomersOrdersPanel({
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
  const [search, setSearch] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    birthday: '',
    birthdayConsent: false,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.customers;
    return data.customers.filter(
      (c) => c.phone.includes(q) || (c.name || '').toLowerCase().includes(q)
    );
  }, [data.customers, search]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFetch('/api/admin/customers', {
        method: 'POST',
        body: JSON.stringify(regForm),
      });
      setRegForm({ name: '', phone: '', birthday: '', birthdayConsent: false });
      await onChanged('Customer saved in Signature Dine Rewards.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleRegister}
        className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
      >
        <h2 className="text-base font-bold text-slate-900">
          Register / Update Customer &amp; Loyalty Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            required
            value={regForm.name}
            onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
            placeholder="Customer Name *"
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <input
            type="tel"
            required
            value={regForm.phone}
            onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
            placeholder="10-digit Indian mobile *"
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
          <input
            type="text"
            value={regForm.birthday}
            onChange={(e) => setRegForm({ ...regForm, birthday: e.target.value })}
            placeholder="Birthday (DD-MM or YYYY-MM-DD)"
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={regForm.birthdayConsent}
            onChange={(e) => setRegForm({ ...regForm, birthdayConsent: e.target.checked })}
          />
          Customer consented to share birthday for birthday discount privileges
        </label>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-[#E87522] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save Customer Profile'}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Customers &amp; Order History ({filtered.length})
            </h2>
            <p className="text-xs text-slate-500">
              Click Order History on any customer to view all past and active orders.
            </p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone or name..."
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-full sm:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Mobile</th>
                <th className="px-3 py-2.5">Orders</th>
                <th className="px-3 py-2.5">Total Spend</th>
                <th className="px-3 py-2.5">Loyalty Stamps</th>
                <th className="px-3 py-2.5">Rewards</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No customers match your search yet.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const custOrders = data.orders.filter(
                    (o) => o.customerId === c.id || o.customerPhone === c.phone
                  );
                  const isExpanded = expandedCustomerId === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr className="hover:bg-slate-50/60">
                        <td className="px-3 py-2.5 font-medium text-slate-900">
                          {c.name || 'Guest'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{c.phone}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {c.orderCount ?? custOrders.length}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold">
                          ₹{(c.totalSpent ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-[#E87522]">
                          {c.stampsCount} / {data.settings?.loyaltyTargetMeals ?? 10}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {c.rewardsAvailable} ready · {c.rewardsRedeemed} redeemed
                        </td>
                        <td className="px-3 py-2.5 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedCustomerId(isExpanded ? null : c.id)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                          >
                            <span>History ({custOrders.length})</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === c.id}
                            onClick={async () => {
                              setBusyId(c.id);
                              try {
                                await adminFetch(`/api/admin/customers/${c.id}/stamp`, {
                                  method: 'POST',
                                  body: JSON.stringify({ notes: 'Completed eligible meal' }),
                                });
                                await onChanged('Added 1 loyalty stamp.');
                              } catch (err) {
                                onError(
                                  err instanceof Error ? err.message : 'Failed to award stamp.'
                                );
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                          >
                            +1 Stamp
                          </button>
                          {c.rewardsAvailable > 0 && (
                            <button
                              type="button"
                              disabled={busyId === c.id}
                              onClick={async () => {
                                setBusyId(c.id);
                                try {
                                  await adminFetch(`/api/admin/customers/${c.id}/redeem`, {
                                    method: 'POST',
                                  });
                                  await onChanged('10th meal reward redeemed.');
                                } catch (err) {
                                  onError(
                                    err instanceof Error
                                      ? err.message
                                      : 'Failed to redeem reward.'
                                  );
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                            >
                              Redeem Free Meal
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 px-4 py-4">
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-700">
                                Order History for {c.name || c.phone}
                              </p>
                              {custOrders.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                  No online orders placed by this customer yet.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {custOrders.map((ord) => (
                                    <div
                                      key={ord.id}
                                      className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-slate-900">
                                          {ord.orderNumber}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                                          {getStatusLabel(ord.status)}
                                        </span>
                                      </div>
                                      <p className="text-slate-500">
                                        {ord.pickupDate} at {ord.pickupTime} ·{' '}
                                        <span className="capitalize">{ord.orderType}</span>
                                      </p>
                                      <p className="text-slate-700">
                                        {ord.items
                                          .map((it) => `${it.dishName} × ${it.quantity}`)
                                          .join(', ')}
                                      </p>
                                      <p className="font-mono font-bold text-slate-900">
                                        Total: ₹{ord.total}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ReportsPanel({
  data,
  getIdToken,
  onError,
}: {
  data: AdminOverviewData;
  getIdToken: () => Promise<string | null>;
  onError: (msg: string) => void;
}) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [exporting, setExporting] = useState(false);

  const reports = data.reports;
  if (!reports) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-600">
        Sales reports are available only to Restaurant Admin accounts.
      </div>
    );
  }

  const rows =
    period === 'daily'
      ? reports.dailySales.map((d) => ({
          key: d.date,
          label: d.label,
          orders: d.orders,
          completed: d.completed,
          sales: d.sales,
        }))
      : period === 'weekly'
      ? reports.weeklySales.map((w) => ({
          key: w.weekStart,
          label: w.label,
          orders: w.orders,
          completed: w.completed,
          sales: w.sales,
        }))
      : reports.monthlySales.map((m) => ({
          key: m.month,
          label: m.label,
          orders: m.orders,
          completed: m.completed,
          sales: m.sales,
        }));

  const maxSales = Math.max(1, ...rows.map((r) => r.sales));
  const nonCancelledCount = data.stats.totalOrders - (data.stats.statusCounts.cancelled || 0);
  const completionRate =
    nonCancelledCount > 0
      ? Math.round((data.stats.completedOrders / nonCancelledCount) * 100)
      : 0;

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Session expired. Please sign in again.');
      const res = await fetch('/api/admin/reports/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Unable to export sales report.');
      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'signature-dine-sales-report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">Gross Sales (Non-Cancelled)</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            ₹{(data.stats.totalSales ?? 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">Completed Orders Revenue</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            ₹{(data.stats.completedSales ?? 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">Average Order Value</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            ₹{(data.stats.averageOrderValue ?? 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">Completion Rate</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#E87522] mt-1">
            {completionRate}%
          </p>
        </div>
      </div>

      {/* Period Toggle + Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'daily', label: 'Daily Sales (14 Days)' },
                { id: 'weekly', label: 'Weekly Sales (8 Weeks)' },
                { id: 'monthly', label: 'Monthly Sales (6 Months)' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  period === p.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={exporting}
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E87522] hover:bg-[#D36312] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'Export Sales CSV'}</span>
          </button>
        </div>

        {/* Visual Bar Chart */}
        <div className="space-y-2.5">
          {rows.map((r) => {
            const pct = Math.round((r.sales / maxSales) * 100);
            return (
              <div key={r.key} className="grid grid-cols-12 items-center gap-3 text-xs">
                <span className="col-span-4 sm:col-span-3 font-medium text-slate-700 truncate">
                  {r.label}
                </span>
                <div className="col-span-5 sm:col-span-6 h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#E87522] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="col-span-3 text-right font-mono tabular-nums text-slate-900">
                  ₹{r.sales.toLocaleString('en-IN')} ({r.orders})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Type & Top Dishes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-base font-bold text-slate-900">Order Channel Breakdown</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Pickup Pre-Orders</p>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {reports.orderTypeBreakdown.pickup}
              </p>
              <p className="text-xs font-mono text-[#E87522] mt-0.5">
                ₹{reports.orderTypeBreakdown.pickupSales.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Delivery Orders</p>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {reports.orderTypeBreakdown.delivery}
              </p>
              <p className="text-xs font-mono text-[#E87522] mt-0.5">
                ₹{reports.orderTypeBreakdown.deliverySales.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-base font-bold text-slate-900">Top Selling Dishes</h3>
          {data.stats.popularOrderedDishes.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No dish sales recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-sm">
              {data.stats.popularOrderedDishes.map((d) => (
                <div key={d.name} className="py-2 flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800 truncate">{d.name}</span>
                  <span className="font-mono text-xs text-slate-600 whitespace-nowrap">
                    {d.quantity} sold
                    {d.revenue !== undefined ? ` · ₹${d.revenue.toLocaleString('en-IN')}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TeamRolesPanel({
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
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFetch('/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
      setEmail('');
      await onChanged(`Saved ${role} access for ${email.toLowerCase()}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not update team access.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (id: number, nextRole: 'admin' | 'staff' | 'disabled') => {
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
      await onChanged(`Updated account role to ${nextRole}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <Shield className="w-5 h-5 text-[#E87522]" />
          <h2>Role-Based Access Control (Admin &amp; Staff)</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>Admin</strong> accounts have full control over menu editing, pricing, restaurant
          settings, sales reports, leads, campaigns, feedback, and team roles.{' '}
          <strong>Staff</strong> accounts can sign in to view and manage live orders, toggle dish
          availability, and manage customer loyalty stamps. Unknown Google sign-ins default to{' '}
          <strong>Pending</strong> until approved here.
        </p>
      </div>

      <form
        onSubmit={handleInvite}
        className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
      >
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#E87522]" />
          <span>Authorize Google Account by Email</span>
        </h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@gmail.com"
            className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          >
            <option value="staff">Staff (Orders &amp; Availability)</option>
            <option value="admin">Admin (Full Access)</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#E87522] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
          >
            {saving ? 'Authorizing...' : 'Grant Access'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#E87522]" />
          <h3 className="text-sm font-bold text-slate-900">
            Team Accounts ({data.teamUsers.length})
          </h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            <tr>
              <th className="px-4 py-3">Google Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.teamUsers.map((u) => {
              const isSelf = u.id === data.currentUser?.id;
              const isInvited = u.uid.startsWith('invite:');
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.email}
                    {isSelf && (
                      <span className="ml-2 text-xs font-semibold text-[#E87522]">(You)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {isInvited ? 'Pre-authorized (awaiting first sign-in)' : 'Signed in'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                        u.role === 'admin'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : u.role === 'staff'
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {!isSelf && (
                      <>
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => handleRoleChange(u.id, 'admin')}
                            className="px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                          >
                            Make Admin
                          </button>
                        )}
                        {u.role !== 'staff' && (
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => handleRoleChange(u.id, 'staff')}
                            className="px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                          >
                            Make Staff
                          </button>
                        )}
                        {u.role !== 'disabled' && (
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => handleRoleChange(u.id, 'disabled')}
                            className="px-2.5 py-1 rounded border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 cursor-pointer"
                          >
                            Disable
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={async () => {
                            setBusyId(u.id);
                            try {
                              await adminFetch(`/api/admin/users/${u.id}`, {
                                method: 'DELETE',
                              });
                              await onChanged('Team member removed.');
                            } catch (err) {
                              onError(
                                err instanceof Error ? err.message : 'Failed to remove member.'
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer align-middle"
                          title="Remove user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CustomerMessagesPanel({
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
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const messages = data.messages || [];
  const filtered = useMemo(() => {
    if (filter === 'unread') return messages.filter((m) => !m.isRead);
    return messages;
  }, [messages, filter]);

  const toggleRead = async (id: number, isRead: boolean) => {
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/messages/${id}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ isRead }),
      });
      await onChanged(isRead ? 'Message marked as read.' : 'Message marked as unread.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update message status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setBusyId(id);
    setConfirmDeleteId(null);
    try {
      await adminFetch(`/api/admin/messages/${id}`, {
        method: 'DELETE',
      });
      await onChanged('Customer message deleted.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete message.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            All Messages ({messages.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filter === 'unread'
                ? 'bg-[#E87522] text-white'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            Unread ({data.unreadMessagesCount ?? 0})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
          <Mail className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-600">
            {filter === 'unread'
              ? 'No unread customer messages.'
              : 'Customer inquiries from the Contact Us form will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div
              key={m.id}
              className={`bg-white rounded-xl border p-5 space-y-3 ${
                m.isRead ? 'border-slate-200' : 'border-[#E87522]/50 bg-amber-50/30'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{m.subject}</span>
                    {!m.isRead ? (
                      <span className="px-2 py-0.5 rounded bg-[#E87522] text-white text-[10px] font-bold uppercase">
                        Unread
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                        Read
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 mt-1">
                    From: <strong>{m.name}</strong> ·{' '}
                    <a
                      href={`tel:${m.phone}`}
                      className="font-mono text-[#E87522] hover:underline"
                    >
                      {m.phone}
                    </a>
                    {m.email && (
                      <>
                        {' '}
                        ·{' '}
                        <a href={`mailto:${m.email}`} className="text-slate-600 hover:underline">
                          {m.email}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date(m.createdAt).toLocaleString('en-IN')}
                </span>
              </div>

              <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-3.5 leading-relaxed whitespace-pre-line">
                {m.message}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() => toggleRead(m.id, !m.isRead)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{m.isRead ? 'Mark Unread' : 'Mark as Read'}</span>
                  </button>
                </div>

                {confirmDeleteId === m.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-700 font-medium">Delete this message?</span>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => handleDelete(m.id)}
                      className="px-2.5 py-1 rounded bg-red-700 text-white font-semibold cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() => setConfirmDeleteId(m.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

