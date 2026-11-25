import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import type { CartItem, MenuItem, PublicBootstrapData } from '../types.ts';

export interface ActiveOrderRef {
  orderNumber: string;
  phone: string;
}

interface AppContextValue {
  bootstrap: PublicBootstrapData | null;
  loading: boolean;
  error: string | null;
  refreshBootstrap: () => Promise<void>;
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  removeFromCart: (menuItemId: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  drawerTab: 'cart' | 'track';
  setDrawerTab: (tab: 'cart' | 'track') => void;
  openOrderTracker: () => void;
  activeOrderRef: ActiveOrderRef | null;
  setActiveOrderRef: (ref: ActiveOrderRef | null) => void;
  mapsQuotaExceeded: boolean;
  authUser: User | null;
  authLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

const CART_STORAGE_KEY = 'signature_dine_cart_v1';
const ACTIVE_ORDER_STORAGE_KEY = 'signature_dine_active_order_v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [bootstrap, setBootstrap] = useState<PublicBootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as CartItem[];
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'cart' | 'track'>('cart');
  const [activeOrderRef, setActiveOrderRefState] = useState<ActiveOrderRef | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ActiveOrderRef;
        if (parsed?.orderNumber && parsed?.phone) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const setActiveOrderRef = useCallback((ref: ActiveOrderRef | null) => {
    setActiveOrderRefState(ref);
    try {
      if (ref) {
        localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(ref));
      } else {
        localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const openOrderTracker = useCallback(() => {
    setDrawerTab('track');
    setCartOpen(true);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/public/bootstrap');
      if (!res.ok) {
        throw new Error('Unable to load restaurant details right now.');
      }
      const data = (await res.json()) as PublicBootstrapData;
      setBootstrap(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  // Real-time catalog synchronization when Admin updates menu, prices, availability, special, hours, or settings
  useEffect(() => {
    const es = new EventSource('/api/public/stream');
    const onCatalogUpdated = () => {
      refreshBootstrap();
    };
    es.addEventListener('catalog:updated', onCatalogUpdated);
    return () => {
      es.removeEventListener('catalog:updated', onCatalogUpdated);
      es.close();
    };
  }, [refreshBootstrap]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    const handler = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addToCart = useCallback((menuItem: MenuItem) => {
    if (!menuItem.isAvailable) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === menuItem.id
            ? { ...c, menuItem, quantity: Math.min(30, c.quantity + 1) }
            : c
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((c) => c.menuItem.id !== menuItemId));
      return;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.menuItem.id === menuItemId ? { ...c, quantity: Math.min(30, quantity) } : c
      )
    );
  }, []);

  const removeFromCart = useCallback((menuItemId: number) => {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== menuItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleAuthProvider);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        bootstrap,
        loading,
        error,
        refreshBootstrap,
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        cartOpen,
        setCartOpen,
        drawerTab,
        setDrawerTab,
        openOrderTracker,
        activeOrderRef,
        setActiveOrderRef,
        mapsQuotaExceeded,
        authUser,
        authLoading,
        signInWithGoogle,
        signOutUser,
        getIdToken,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
