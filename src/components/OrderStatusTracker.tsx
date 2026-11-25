import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  CheckCircle2,
  Clock,
  Flame,
  PackageCheck,
  Radio,
  X,
  XCircle,
} from 'lucide-react';
import type { OrderRecord } from '../types.ts';

interface OrderStatusTrackerProps {
  initialOrder: OrderRecord;
  phone: string;
  compact?: boolean;
  onOrderUpdate?: (order: OrderRecord) => void;
  onDismiss?: () => void;
  onOpenDetails?: () => void;
}

type OrderStatus = OrderRecord['status'];

function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'new':
    case 'confirmed':
      return 0;
    case 'preparing':
      return 1;
    case 'ready':
      return 2;
    case 'completed':
      return 3;
    default:
      return -1;
  }
}

function getStatusMeta(order: OrderRecord): {
  badgeLabel: string;
  headline: string;
  subtext: string;
  badgeClasses: string;
} {
  const isDelivery = order.orderType === 'delivery';
  switch (order.status) {
    case 'new':
      return {
        badgeLabel: 'Pending',
        headline: 'Pending Restaurant Confirmation',
        subtext: 'We have received your order request and our team will confirm it shortly.',
        badgeClasses: 'bg-amber-50 text-amber-900 border-amber-300',
      };
    case 'confirmed':
      return {
        badgeLabel: 'Pending (Confirmed)',
        headline: 'Order Confirmed · Queued for Kitchen',
        subtext: 'Signature Dine has accepted your order and queued it for preparation.',
        badgeClasses: 'bg-[#FFF8ED] text-[#E87522] border-[#E87522]/40',
      };
    case 'preparing':
      return {
        badgeLabel: 'Preparing',
        headline: 'Preparing Your Food',
        subtext: 'Our chefs are freshly preparing your dishes in the kitchen.',
        badgeClasses: 'bg-orange-50 text-[#D36312] border-[#E87522]',
      };
    case 'ready':
      return {
        badgeLabel: isDelivery ? 'Ready for Delivery' : 'Ready for Pickup',
        headline: isDelivery ? 'Order Ready for Dispatch' : 'Ready for Pickup at Signature Dine!',
        subtext: isDelivery
          ? 'Your order is packed and ready for delivery.'
          : 'Please head to the pickup counter at 3rd Line, Brindavan Gardens with your order number.',
        badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      };
    case 'completed':
      return {
        badgeLabel: 'Completed',
        headline: 'Order Completed',
        subtext: 'Thank you for choosing Signature Dine! Enjoy your meal.',
        badgeClasses: 'bg-emerald-100 text-emerald-900 border-emerald-400',
      };
    case 'cancelled':
      return {
        badgeLabel: 'Cancelled',
        headline: 'Order Cancelled',
        subtext: 'This order was cancelled. Please contact Signature Dine if you have questions.',
        badgeClasses: 'bg-[#B83B24]/10 text-[#B83B24] border-[#B83B24]/30',
      };
  }
}

function formatIstTimestamp(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '';
  }
}

export function OrderStatusTracker({
  initialOrder,
  phone,
  compact = false,
  onOrderUpdate,
  onDismiss,
  onOpenDetails,
}: OrderStatusTrackerProps) {
  const [order, setOrder] = useState<OrderRecord>(initialOrder);
  const [connectionState, setConnectionState] = useState<'connecting' | 'live' | 'reconnecting'>(
    'connecting'
  );

  // Sync if caller passes a newer snapshot or switches order
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder.orderNumber, initialOrder.status, initialOrder.updatedAt]);

  useEffect(() => {
    const isTerminal = order.status === 'completed' || order.status === 'cancelled';
    if (isTerminal || !order.orderNumber || !phone) {
      setConnectionState('live');
      return;
    }

    const streamUrl = `/api/orders/stream/${encodeURIComponent(
      order.orderNumber
    )}?phone=${encodeURIComponent(phone)}`;
    const es = new EventSource(streamUrl);
    setConnectionState('connecting');

    es.onopen = () => {
      setConnectionState('live');
    };

    const handleStateEvent = (event: MessageEvent) => {
      try {
        const nextOrder = JSON.parse(event.data) as OrderRecord;
        setOrder(nextOrder);
        setConnectionState('live');
        onOrderUpdate?.(nextOrder);
      } catch {
        // ignore malformed payloads
      }
    };

    es.addEventListener('order:state', handleStateEvent as EventListener);

    es.onerror = () => {
      setConnectionState('reconnecting');
    };

    // Reconcile state if the browser tab returns from sleep/background
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(
          `/api/orders/track/${encodeURIComponent(order.orderNumber)}?phone=${encodeURIComponent(
            phone
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.order) {
            setOrder(data.order as OrderRecord);
            onOrderUpdate?.(data.order as OrderRecord);
          }
        }
      } catch {
        // ignore transient refresh failure
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      es.removeEventListener('order:state', handleStateEvent as EventListener);
      es.close();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [order.orderNumber, order.status, phone]);

  const meta = getStatusMeta(order);
  const activeStep = getStepIndex(order.status);
  const isTerminal = order.status === 'completed' || order.status === 'cancelled';
  const updatedTimeStr = formatIstTimestamp(order.updatedAt || order.createdAt);

  const steps = [
    {
      key: 'pending',
      label: order.status === 'confirmed' ? 'Confirmed' : 'Pending',
      icon: Clock,
    },
    {
      key: 'preparing',
      label: 'Preparing',
      icon: Flame,
    },
    {
      key: 'ready',
      label: order.orderType === 'delivery' ? 'Ready for Delivery' : 'Ready for Pickup',
      icon: PackageCheck,
    },
    {
      key: 'completed',
      label: 'Completed',
      icon: CheckCircle2,
    },
  ];

  if (compact) {
    const compactProgress =
      order.status === 'cancelled'
        ? 0
        : activeStep === 0
        ? order.status === 'confirmed'
          ? 22
          : 12
        : activeStep === 1
        ? 55
        : activeStep === 2
        ? 85
        : 100;

    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-[#15110E] border-b border-[#FFC247]/25 text-[#FFF8ED] shadow-md no-print"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FFC247]">
              <Radio
                className={`w-3.5 h-3.5 ${
                  isTerminal
                    ? 'text-[#FFF8ED]/45'
                    : connectionState === 'live'
                    ? 'text-emerald-400 animate-pulse'
                    : 'text-amber-400'
                }`}
              />
              <span>Live Order</span>
            </div>
            <span className="font-mono font-bold text-xs sm:text-sm text-[#FFF8ED]">
              {order.orderNumber}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-md border text-xs font-bold ${meta.badgeClasses}`}
            >
              {meta.badgeLabel}
            </span>
            <span className="text-xs text-[#FFF8ED]/75 truncate">
              {meta.headline}
              {updatedTimeStr ? ` · Updated ${updatedTimeStr} IST` : ''}
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {order.status !== 'cancelled' && (
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold">
                <span className={activeStep >= 0 ? 'text-[#FFC247]' : 'text-[#FFF8ED]/40'}>
                  Pending
                </span>
                <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{ width: `${compactProgress}%` }}
                    transition={{ duration: 0.35 }}
                    className={`h-full rounded-full ${
                      activeStep >= 2 ? 'bg-emerald-500' : 'bg-[#E87522]'
                    }`}
                  />
                </div>
                <span className={activeStep >= 1 ? 'text-[#FFC247]' : 'text-[#FFF8ED]/40'}>
                  Preparing
                </span>
                <span className="text-[#FFF8ED]/30">→</span>
                <span className={activeStep >= 2 ? 'text-emerald-400' : 'text-[#FFF8ED]/40'}>
                  Ready for Pickup
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {onOpenDetails && (
                <button
                  type="button"
                  onClick={onOpenDetails}
                  className="px-3 py-1.5 rounded-lg bg-[#E87522] text-white text-xs font-semibold hover:bg-[#D36312] transition-colors cursor-pointer"
                >
                  View Details
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  aria-label="Dismiss live order tracker"
                  className="p-1.5 rounded-lg text-[#FFF8ED]/60 hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-[#38251B]/12 bg-white p-5 space-y-5 shadow-xs"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm text-[#38251B]">
              {order.orderNumber}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-md border text-xs font-bold ${meta.badgeClasses}`}
            >
              {meta.badgeLabel}
            </span>
          </div>
          <p className="text-xs text-[#38251B]/65 mt-1">
            Pickup Schedule: {order.pickupDate} at {order.pickupTime}
          </p>
        </div>

        <div className="text-right">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#38251B]/75">
            <span
              className={`w-2 h-2 rounded-full ${
                isTerminal
                  ? 'bg-[#38251B]/40'
                  : connectionState === 'live'
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span>
              {isTerminal
                ? 'Final Status'
                : connectionState === 'live'
                ? 'Live Updates Active'
                : connectionState === 'connecting'
                ? 'Connecting...'
                : 'Reconnecting...'}
            </span>
          </div>
          {updatedTimeStr && (
            <p className="text-[11px] text-[#38251B]/55 font-mono mt-0.5">
              Updated {updatedTimeStr} IST
            </p>
          )}
        </div>
      </div>

      {/* Status Callout */}
      <div
        className={`rounded-xl border p-3.5 ${
          order.status === 'cancelled'
            ? 'bg-[#B83B24]/5 border-[#B83B24]/25'
            : order.status === 'ready' || order.status === 'completed'
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-[#FFF8ED] border-[#E87522]/25'
        }`}
      >
        <p className="text-sm font-bold text-[#38251B]">{meta.headline}</p>
        <p className="text-xs text-[#38251B]/75 mt-0.5 leading-relaxed">{meta.subtext}</p>
      </div>

      {/* Step-by-Step Real-Time Timeline */}
      {order.status === 'cancelled' ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#B83B24]/10 text-[#B83B24] text-xs font-semibold">
          <XCircle className="w-5 h-5 shrink-0" />
          <span>Order cancelled by restaurant or guest request.</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-4 gap-2 relative">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx < activeStep || order.status === 'completed';
              const isCurrent = idx === activeStep && order.status !== 'completed';
              return (
                <div key={step.key} className="flex flex-col items-center text-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-[#E87522] border-[#E87522] text-white ring-4 ring-[#E87522]/20'
                        : 'bg-[#FFF8ED] border-[#38251B]/15 text-[#38251B]/40'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-[11px] leading-tight font-semibold ${
                      isCompleted
                        ? 'text-emerald-800'
                        : isCurrent
                        ? 'text-[#E87522]'
                        : 'text-[#38251B]/45'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="h-1.5 rounded-full bg-[#38251B]/10 overflow-hidden">
            <motion.div
              initial={false}
              animate={{
                width:
                  activeStep === 0
                    ? order.status === 'confirmed'
                      ? '25%'
                      : '12%'
                    : activeStep === 1
                    ? '50%'
                    : activeStep === 2
                    ? '78%'
                    : '100%',
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                activeStep >= 2 ? 'bg-emerald-600' : 'bg-[#E87522]'
              }`}
            />
          </div>
        </div>
      )}

      {/* Order Items Breakdown */}
      <div className="divide-y divide-[#38251B]/10 text-sm pt-2 border-t border-[#38251B]/10">
        {order.items.map((it, idx) => (
          <div key={idx} className="py-1.5 flex justify-between gap-3">
            <span className="text-[#38251B]">
              {it.dishName} × {it.quantity}
            </span>
            <span className="font-mono tabular-nums text-[#38251B]">
              {it.unitPrice !== null ? `₹${it.lineTotal}` : 'Price TBD'}
            </span>
          </div>
        ))}
        {order.specialInstructions && (
          <p className="py-2 text-xs text-[#38251B]/70">
            Note: {order.specialInstructions}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-[#38251B]/10 flex justify-between font-bold text-sm text-[#38251B]">
        <span>Total</span>
        <span className="font-mono tabular-nums">
          ₹{order.total}
          {order.hasUnpricedItems ? ' (+ TBD)' : ''}
        </span>
      </div>
    </div>
  );
}
