import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const saved = localStorage.getItem('cart');
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Error parsing cart from localStorage:', e);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product, quantity = 1) => {
        setCartItems(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const existing = safePrev.find(item => item.id === product.id);

            const hasLimit = product && product.isRent && typeof product.quantityAvailable === 'number';
            const maxAllowed = hasLimit ? product.quantityAvailable : Infinity;
            const currentQty = existing ? existing.quantity : 0;
            const desiredQty = currentQty + quantity;
            const finalQty = Math.min(desiredQty, maxAllowed);

            // Якщо вже досягнуто максимум – не змінюємо кошик
            if (finalQty <= currentQty) {
                return safePrev;
            }

            if (existing) {
                return safePrev.map(item =>
                    item.id === product.id ? { ...item, quantity: finalQty } : item
                );
            }
            return [...safePrev, { ...product, quantity: finalQty }];
        });
    };

    const removeFromCart = (id) => {
        setCartItems(prev => (Array.isArray(prev) ? prev.filter(item => item.id !== id) : []));
    };

    const updateQuantity = (id, quantity) => {
        if (quantity < 1) return;
        setCartItems(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.map(item => {
                if (item.id !== id) return item;

                const hasLimit = item && item.isRent && typeof item.quantityAvailable === 'number';
                const maxAllowed = hasLimit ? item.quantityAvailable : Infinity;
                const clampedQty = Math.min(quantity, maxAllowed);

                return { ...item, quantity: clampedQty };
            });
        });
    };

    const clearCart = () => setCartItems([]);

    const safeCartItems = Array.isArray(cartItems) ? cartItems : [];
    const cartTotal = safeCartItems.reduce((sum, item) => {
        const packSize = item.packSize || 1;
        return sum + (parseFloat(item.price) * item.quantity * packSize);
    }, 0);
    const cartCount = safeCartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartTotal,
            cartCount
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
