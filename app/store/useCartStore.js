// store/useCartStore.js
import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  cart: [],
  // এটি React এর setCart(prev => ...) এর মতো কাজ করবে
  setCart: (updater) => set((state) => ({
    cart: typeof updater === 'function' ? updater(state.cart) : updater
  })),
  getCartTotal: () => {
    return get().cart.reduce((total, item) => total + (item.current_price * item.qty * (item.rentDays || 1)), 0);
  }
}));
