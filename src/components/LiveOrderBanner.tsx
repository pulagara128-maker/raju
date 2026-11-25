import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import type { OrderRecord } from '../types.ts';
import { OrderStatusTracker } from './OrderStatusTracker.tsx';

export function LiveOrderBanner() {
  const { activeOrderRef, setActiveOrderRef, openOrderTracker } = useApp();
  const [order, setOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    if (!activeOrderRef?.orderNumber || !activeOrderRef?.phone) {
      setOrder(null);
      return;
    }

    let cancelled = false;
    async function loadActive() {
      try {
        const res = await fetch(
          `/api/orders/track/${encodeURIComponent(
            activeOrderRef!.orderNumber
          )}?phone=${encodeURIComponent(activeOrderRef!.phone)}`
        );
        if (!res.ok) {
          if (res.status === 404 && !cancelled) {
            setOrder(null);
            setActiveOrderRef(null);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled && data?.order) {
          setOrder(data.order as OrderRecord);
        }
      } catch {
        // keep silent if offline
      }
    }

    loadActive();
    return () => {
      cancelled = true;
    };
  }, [activeOrderRef?.orderNumber, activeOrderRef?.phone, setActiveOrderRef]);

  if (!order || !activeOrderRef) {
    return null;
  }

  return (
    <OrderStatusTracker
      compact
      initialOrder={order}
      phone={activeOrderRef.phone}
      onOrderUpdate={(updated) => setOrder(updated)}
      onOpenDetails={openOrderTracker}
      onDismiss={() => {
        setOrder(null);
        setActiveOrderRef(null);
      }}
    />
  );
}
