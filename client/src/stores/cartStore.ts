import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IBook } from '../types';

export interface CartItem {
    book: IBook;
}

interface CartState {
    items: CartItem[];
    addToCart: (book: IBook) => void;
    removeFromCart: (bookId: string) => void;
    clearCart: () => void;
    isInCart: (bookId: string) => boolean;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            addToCart: (book: IBook) => {
                const { items } = get();
                // Prevent duplicate additions
                if (!items.find((item) => item.book._id === book._id)) {
                    set({ items: [...items, { book }] });
                }
            },
            removeFromCart: (bookId: string) => {
                const { items } = get();
                set({ items: items.filter((item) => item.book._id !== bookId) });
            },
            clearCart: () => {
                set({ items: [] });
            },
            isInCart: (bookId: string) => {
                const { items } = get();
                return items.some((item) => item.book._id === bookId);
            },
        }),
        {
            name: 'borrowing-cart-storage', // name of the item in the storage (must be unique)
        }
    )
);
