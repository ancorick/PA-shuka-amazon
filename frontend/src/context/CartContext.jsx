import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, put, del } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);
const EMPTY = { groups: [], grandTotal: 0, count: 0, hasProblems: false };

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setCart(EMPTY); return EMPTY; }
    setLoading(true);
    try {
      const data = await get('/cart');
      setCart(data.cart);
      return data.cart;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  const quantityOf = useCallback((productId) => {
    for (const g of cart.groups) for (const i of g.items) if (i.productId === productId) return i.quantity;
    return 0;
  }, [cart]);

  const value = useMemo(() => ({
    cart,
    loading,
    count: user ? cart.count : 0,
    refresh,
    quantityOf,
    async setQuantity(productId, quantity) {
      const data = await put(`/cart/items/${productId}`, { quantity });
      setCart(data.cart);
      return data.cart;
    },
    async add(productId, qty) {
      const data = await put(`/cart/items/${productId}`, { quantity: quantityOf(productId) + qty });
      setCart(data.cart);
      return data.cart;
    },
    async remove(productId) {
      const data = await del(`/cart/items/${productId}`);
      setCart(data.cart);
      return data.cart;
    },
    clearLocal() { setCart(EMPTY); },
  }), [cart, loading, user, refresh, quantityOf]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
