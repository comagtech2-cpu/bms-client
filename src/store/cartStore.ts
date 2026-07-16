import { create } from 'zustand';
import { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  customerId: string | null;
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  updatePrice: (productId: string, price: number) => void;
  setCustomer: (id: string | null) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, qty: Math.min(i.qty + 1, item.stock) }
              : i
          ),
        };
      }
      return { items: [...state.items, { ...item, qty: 1 }] };
    }),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

  updateQty: (productId, qty) =>
    set((state) => ({
      items: qty <= 0
        ? state.items.filter((i) => i.productId !== productId)
        : state.items.map((i) =>
            i.productId === productId ? { ...i, qty: Math.min(qty, i.stock) } : i
          ),
    })),

  updatePrice: (productId, price) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, price: Math.max(0, price) } : i
      ),
    })),

  setCustomer: (id) => set({ customerId: id }),

  clearCart: () => set({ items: [], customerId: null }),

  total: () => get().items.reduce((sum, item) => sum + item.price * item.qty, 0),
}));
