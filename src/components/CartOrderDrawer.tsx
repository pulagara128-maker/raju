import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { getIstNowParts } from '../lib/hours.ts';
import type { OrderRecord } from '../types.ts';
import { OrderStatusTracker } from './OrderStatusTracker.tsx';

function getPickupDateOptions() {
  const options: Array<{ value: string; label: string }> = [];
  const base = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const { istDateISO } = getIstNowParts(d);
    const label = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(d);
    options.push({
      value: istDateISO,
      label: i === 0 ? `Today (${label})` : i === 1 ? `Tomorrow (${label})` : label,
    });
  }
  return options;
}

const PICKUP_TIME_SLOTS = [
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '07:00 PM',
  '07:30 PM',
  '08:00 PM',
  '08:30 PM',
  '09:00 PM',
  '09:30 PM',
  '10:00 PM',
];

export function CartOrderDrawer() {
  const {
    bootstrap,
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartOpen,
    setCartOpen,
    drawerTab,
    setDrawerTab,
    activeOrderRef,
    setActiveOrderRef,
  } = useApp();

  const tab = drawerTab;
  const setTab = setDrawerTab;
  const dateOptions = useMemo(() => getPickupDateOptions(), []);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');
  const [pickupDate, setPickupDate] = useState(dateOptions[0]?.value || '');
  const [pickupTime, setPickupTime] = useState('01:00 PM');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);
  const [whatsappSetupNotice, setWhatsappSetupNotice] = useState<string | null>(null);

  // Order Tracking State
  const [trackOrderNumber, setTrackOrderNumber] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<OrderRecord | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  const settings = bootstrap?.settings;
  const deliveryEnabled = Boolean(settings?.deliveryEnabled);

  const subtotal = useMemo(
    () =>
      cart.reduce((sum, c) => {
        if (c.menuItem.isPriceConfirmed && c.menuItem.price !== null) {
          return sum + c.menuItem.price * c.quantity;
        }
        return sum;
      }, 0),
    [cart]
  );

  const hasUnpricedItems = useMemo(
    () => cart.some((c) => !c.menuItem.isPriceConfirmed || c.menuItem.price === null),
    [cart]
  );

  const deliveryCharge =
    orderType === 'delivery' && deliveryEnabled && settings?.deliveryCharge
      ? settings.deliveryCharge
      : 0;
  const total = subtotal + deliveryCharge;

  const buildWhatsAppMessage = (orderOverride?: OrderRecord) => {
    const name = orderOverride?.customerName || customerName.trim() || 'Guest';
    const phone = orderOverride?.customerPhone || customerPhone.trim() || 'Not provided';
    const type =
      (orderOverride?.orderType || orderType) === 'delivery' ? 'Delivery' : 'Pickup';
    const instructions =
      (orderOverride?.specialInstructions ?? specialInstructions.trim()) || 'None';

    const lines = orderOverride
      ? orderOverride.items.map((it) => {
          const amt = it.unitPrice !== null ? `₹${it.lineTotal}` : 'Price to be confirmed';
          return `- ${it.dishName} × ${it.quantity} = ${amt}`;
        })
      : cart.map((c) => {
          const priceConfirmed = c.menuItem.isPriceConfirmed && c.menuItem.price !== null;
          const isMrp = c.menuItem.description.toLowerCase().includes('mrp');
          const amt = priceConfirmed
            ? `₹${c.menuItem.price! * c.quantity}`
            : isMrp
            ? 'MRP'
            : 'Price to be confirmed';
          return `- ${c.menuItem.name} × ${c.quantity} = ${amt}`;
        });

    const sub = orderOverride ? orderOverride.subtotal : subtotal;
    const tot = orderOverride ? orderOverride.total : total;

    return [
      `Restaurant: Signature Dine`,
      orderOverride ? `Order Number: ${orderOverride.orderNumber}` : null,
      `Customer Name: ${name}`,
      `Phone: ${phone}`,
      `Order Items:`,
      ...lines,
      `Subtotal: ₹${sub}`,
      `Order Type: ${type}`,
      `Pickup Schedule: ${orderOverride?.pickupDate || pickupDate} at ${orderOverride?.pickupTime || pickupTime}`,
      `Special Instructions: ${instructions}`,
      `Total: ₹${tot}`,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleOpenWhatsApp = (orderOverride?: OrderRecord) => {
    setWhatsappSetupNotice(null);
    if (!orderOverride && cart.length === 0) {
      setError('Add dishes from the menu before ordering on WhatsApp.');
      return;
    }
    const waNumber = settings?.whatsappNumber?.replace(/\D/g, '');
    if (!waNumber) {
      setWhatsappSetupNotice(
        'WhatsApp ordering number is not configured yet in the Admin Dashboard. Please submit an online pickup pre-order above, or ask the restaurant owner to add their WhatsApp number in Admin Settings.'
      );
      return;
    }
    const msg = buildWhatsAppMessage(orderOverride);
    const fullNumber = waNumber.length === 10 ? `91${waNumber}` : waNumber;
    const url = `https://wa.me/${fullNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmitPreOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWhatsappSetupNotice(null);
    if (cart.length === 0) {
      setError('Your cart is empty. Add dishes from the menu first.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          orderType,
          pickupDate,
          pickupTime,
          specialInstructions,
          items: cart.map((c) => ({
            menuItemId: c.menuItem.id,
            quantity: c.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not place pre-order.');
      } else {
        const placed = data.order as OrderRecord;
        setConfirmedOrder(placed);
        setActiveOrderRef({
          orderNumber: placed.orderNumber,
          phone: placed.customerPhone,
        });
        clearCart();
      }
    } catch {
      setError('Network error while placing pre-order.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!cartOpen || tab !== 'track' || trackedOrder || !activeOrderRef) return;
    setTrackOrderNumber(activeOrderRef.orderNumber);
    setTrackPhone(activeOrderRef.phone);
    let cancelled = false;
    (async () => {
      setTrackingLoading(true);
      try {
        const res = await fetch(
          `/api/orders/track/${encodeURIComponent(
            activeOrderRef.orderNumber
          )}?phone=${encodeURIComponent(activeOrderRef.phone)}`
        );
        const data = await res.json();
        if (!cancelled && res.ok && data?.order) {
          setTrackedOrder(data.order as OrderRecord);
        }
      } catch {
        // ignore transient lookup error
      } finally {
        if (!cancelled) setTrackingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cartOpen, tab, trackedOrder, activeOrderRef]);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setTrackedOrder(null);
    setTrackingLoading(true);
    try {
      const res = await fetch(
        `/api/orders/track/${encodeURIComponent(trackOrderNumber.trim())}?phone=${encodeURIComponent(
          trackPhone.trim()
        )}`
      );
      const data = await res.json();
      if (!res.ok) {
        setTrackError(data.error || 'Order not found.');
      } else {
        const found = data.order as OrderRecord;
        setTrackedOrder(found);
        setActiveOrderRef({
          orderNumber: found.orderNumber,
          phone: found.customerPhone,
        });
      }
    } catch {
      setTrackError('Network error looking up order.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end no-print">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Order cart and pickup checkout"
            className="relative z-10 w-full max-w-lg bg-[#FFF8ED] h-full shadow-2xl flex flex-col border-l border-[#38251B]/12"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-[#38251B]/10 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-xl text-[#38251B]">
                  Order &amp; Pickup
                </h2>
                <p className="text-xs text-[#38251B]/65">
                  Signature Dine · Brindavan Gardens, Guntur
                </p>
              </div>
              <button
                type="button"
                aria-label="Close order drawer"
                onClick={() => setCartOpen(false)}
                className="p-2 rounded-lg hover:bg-[#38251B]/5 text-[#38251B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-3 bg-white border-b border-[#38251B]/10 flex gap-4">
              <button
                type="button"
                onClick={() => setTab('cart')}
                className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  tab === 'cart'
                    ? 'border-[#E87522] text-[#E87522]'
                    : 'border-transparent text-[#38251B]/65'
                }`}
              >
                Your Order ({cart.reduce((s, c) => s + c.quantity, 0)})
              </button>
              <button
                type="button"
                onClick={() => setTab('track')}
                className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  tab === 'track'
                    ? 'border-[#E87522] text-[#E87522]'
                    : 'border-transparent text-[#38251B]/65'
                }`}
              >
                Track Order Status
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'track' ? (
                <div className="space-y-5">
                  <form onSubmit={handleTrackOrder} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#38251B] mb-1">
                        Order Number
                      </label>
                      <input
                        type="text"
                        required
                        value={trackOrderNumber}
                        onChange={(e) => setTrackOrderNumber(e.target.value)}
                        placeholder="e.g. SD-20261125-A1B2"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#38251B]/15 bg-white text-sm font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#38251B] mb-1">
                        Mobile Number Used for Order
                      </label>
                      <input
                        type="tel"
                        required
                        value={trackPhone}
                        onChange={(e) => setTrackPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#38251B]/15 bg-white text-sm font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={trackingLoading}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#38251B] text-[#FFC247] text-sm font-semibold cursor-pointer"
                    >
                      <Search className="w-4 h-4" />
                      <span>{trackingLoading ? 'Searching...' : 'Check Status'}</span>
                    </button>
                  </form>

                  {trackError && (
                    <div className="p-3.5 rounded-xl bg-[#B83B24]/10 border border-[#B83B24]/25 text-sm text-[#B83B24]">
                      {trackError}
                    </div>
                  )}

                  {trackedOrder && (
                    <OrderStatusTracker
                      initialOrder={trackedOrder}
                      phone={trackedOrder.customerPhone}
                      onOrderUpdate={(updated) => setTrackedOrder(updated)}
                    />
                  )}
                </div>
              ) : confirmedOrder ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-white p-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-display font-bold text-xl text-[#38251B]">
                          Pre-Order Received!
                        </h3>
                        <p className="text-xs text-[#38251B]/75 mt-1">
                          Keep this page open or check anytime — status updates below happen live as
                          our kitchen updates your order.
                        </p>
                      </div>
                    </div>
                  </div>

                  <OrderStatusTracker
                    initialOrder={confirmedOrder}
                    phone={confirmedOrder.customerPhone}
                    onOrderUpdate={(updated) => setConfirmedOrder(updated)}
                  />

                  {whatsappSetupNotice && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      {whatsappSetupNotice}
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(confirmedOrder)}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] hover:bg-[#1EBE5A] text-white font-semibold text-sm cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Send Order Details on WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmedOrder(null)}
                      className="w-full py-2.5 rounded-xl border border-[#38251B]/15 text-sm font-semibold text-[#38251B] cursor-pointer"
                    >
                      Start Another Order
                    </button>
                  </div>
                </div>
              ) : cart.length === 0 ? (
                <div className="text-center py-14">
                  <ShoppingBag className="w-10 h-10 text-[#E87522]/50 mx-auto mb-3" />
                  <p className="font-display font-bold text-lg text-[#38251B]">
                    Your order cart is empty
                  </p>
                  <p className="text-sm text-[#38251B]/70 mt-1 mb-5">
                    Browse our menu to add biryanis, starters, and Andhra specialities.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false);
                      document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#E87522] text-white text-sm font-semibold cursor-pointer"
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cart Items */}
                  <div className="space-y-3">
                    {cart.map(({ menuItem, quantity }) => {
                      const confirmed = menuItem.isPriceConfirmed && menuItem.price !== null;
                      return (
                        <div
                          key={menuItem.id}
                          className="rounded-xl bg-white border border-[#38251B]/10 p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-[#38251B] truncate">
                              {menuItem.name}
                            </h3>
                            <p className="text-xs text-[#38251B]/65 font-mono tabular-nums mt-0.5">
                              {confirmed
                                ? `₹${menuItem.price} × ${quantity} = ₹${menuItem.price! * quantity}`
                                : menuItem.description.toLowerCase().includes('mrp')
                                ? `At MRP × ${quantity}`
                                : 'Price awaiting owner confirmation'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              aria-label={`Decrease ${menuItem.name}`}
                              onClick={() => updateQuantity(menuItem.id, quantity - 1)}
                              className="p-1.5 rounded-lg border border-[#38251B]/15 hover:bg-[#FFF8ED] cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-mono font-semibold tabular-nums">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase ${menuItem.name}`}
                              onClick={() => updateQuantity(menuItem.id, quantity + 1)}
                              className="p-1.5 rounded-lg border border-[#38251B]/15 hover:bg-[#FFF8ED] cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${menuItem.name}`}
                              onClick={() => removeFromCart(menuItem.id)}
                              className="p-1.5 rounded-lg text-[#B83B24] hover:bg-[#B83B24]/10 ml-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl bg-white border border-[#38251B]/10 p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-[#38251B]/75">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums">₹{subtotal}</span>
                    </div>
                    {deliveryEnabled && orderType === 'delivery' && (
                      <div className="flex justify-between text-[#38251B]/75">
                        <span>Delivery Charge</span>
                        <span className="font-mono tabular-nums">₹{deliveryCharge}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[#38251B]/10 flex justify-between font-bold text-base text-[#38251B]">
                      <span>Total</span>
                      <span className="font-mono tabular-nums">₹{total}</span>
                    </div>
                    {hasUnpricedItems && (
                      <p className="text-xs text-[#B83B24]">
                        One or more selected dishes are awaiting owner price confirmation; final
                        payable amount will be confirmed by the restaurant.
                      </p>
                    )}
                  </div>

                  {/* Checkout Form */}
                  <form onSubmit={handleSubmitPreOrder} className="space-y-4">
                    {error && (
                      <div className="p-3 rounded-xl bg-[#B83B24]/10 border border-[#B83B24]/25 text-xs sm:text-sm text-[#B83B24]">
                        {error}
                      </div>
                    )}
                    {whatsappSetupNotice && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        {whatsappSetupNotice}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#38251B] mb-1">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Full name"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#38251B]/15 bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#38251B] mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="10-digit Indian mobile"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#38251B]/15 bg-white text-sm font-mono"
                        />
                      </div>
                    </div>

                    {deliveryEnabled && (
                      <div>
                        <span className="block text-xs font-semibold text-[#38251B] mb-1.5">
                          Order Type
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {(['pickup', 'delivery'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setOrderType(t)}
                              className={`py-2 rounded-xl border text-xs font-semibold capitalize cursor-pointer ${
                                orderType === t
                                  ? 'bg-[#38251B] text-[#FFC247] border-[#38251B]'
                                  : 'bg-white text-[#38251B] border-[#38251B]/15'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#38251B] mb-1">
                          Pickup Date *
                        </label>
                        <select
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-[#38251B]/15 bg-white text-xs sm:text-sm"
                        >
                          {dateOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#38251B] mb-1">
                          Pickup Time *
                        </label>
                        <select
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-[#38251B]/15 bg-white text-xs sm:text-sm"
                        >
                          {PICKUP_TIME_SLOTS.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#38251B] mb-1">
                        Special Instructions (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder="Spice preference, allergies, or cutlery request..."
                        className="w-full px-3.5 py-2 rounded-xl border border-[#38251B]/15 bg-white text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-2.5 pt-1">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 rounded-xl bg-[#E87522] hover:bg-[#D36312] disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer"
                      >
                        {submitting ? 'Submitting Pre-Order...' : 'Submit Pickup Pre-Order'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp()}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FFC247] hover:bg-[#F5B432] text-[#38251B] font-semibold text-sm transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Order on WhatsApp</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
