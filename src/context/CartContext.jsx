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
            if (existing) {
                return safePrev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...safePrev, { ...product, quantity }];
        });
    };

    const removeFromCart = (id) => {
        setCartItems(prev => (Array.isArray(prev) ? prev.filter(item => item.id !== id) : []));
    };

    const updateQuantity = (id, quantity) => {
        if (quantity < 1) return;
        setCartItems(prev => (Array.isArray(prev) ? prev.map(item =>
            item.id === id ? { ...item, quantity } : item
        ) : []));
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
