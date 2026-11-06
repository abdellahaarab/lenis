import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { shopApi, getLocalCartPreview, type Customer, type Preview } from './commerce';

interface AuthContextType {
  customer: Customer | null;
  loading: boolean;
  cart: Preview | null;
  cartCount: number;
  isAuthModalOpen: boolean;
  authMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  setAuthMode: (mode: 'login' | 'register') => void;
  refreshCustomer: () => Promise<void>;
  refreshCart: () => Promise<void>;
  logout: () => Promise<void>;
  setCustomer: (customer: Customer | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Preview | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const refreshCustomer = useCallback(async () => {
    try {
      const res = await shopApi<{ customer: Customer | null }>('/account');
      setCustomer(res.customer);
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const res = await shopApi<Preview>('/cart');
      setCart(res);
      const count = res.items?.length
        ? res.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        : res.rawLines?.length ?? 0;
      setCartCount(count);
    } catch {
      const local = getLocalCartPreview();
      setCart(local);
      const count = local.items?.length
        ? local.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        : local.rawLines?.length ?? 0;
      setCartCount(count);
    }
  }, []);

  useEffect(() => {
    void refreshCustomer();
    void refreshCart();

    const handleAuthChange = () => {
      void refreshCustomer();
    };

    const handleCartChange = () => {
      void refreshCart();
    };

    window.addEventListener('store-auth-changed', handleAuthChange);
    window.addEventListener('store-cart-changed', handleCartChange);

    return () => {
      window.removeEventListener('store-auth-changed', handleAuthChange);
      window.removeEventListener('store-cart-changed', handleCartChange);
    };
  }, [refreshCustomer, refreshCart]);

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await shopApi('/logout', 'POST');
    } catch {
      // Continue cleanup regardless
    }
    setCustomer(null);
    window.dispatchEvent(new Event('store-auth-changed'));
    window.dispatchEvent(new Event('store-cart-changed'));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        customer,
        loading,
        cart,
        cartCount,
        isAuthModalOpen,
        authMode,
        openAuthModal,
        closeAuthModal,
        setAuthMode,
        refreshCustomer,
        refreshCart,
        logout,
        setCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
