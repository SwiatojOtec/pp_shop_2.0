import React, { createContext, useContext, useState, useEffect } from 'react';

const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
    const [favorites, setFavorites] = useState(() => {
        try {
            const saved = localStorage.getItem('favorites');
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Error parsing favorites from localStorage:', e);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }, [favorites]);

    const toggleFavorite = (product) => {
        setFavorites(prev => {
            const isFavorite = prev.some(item => item.id === product.id);
            if (isFavorite) {
                return prev.filter(item => item.id !== product.id);
            }
            return [...prev, product];
        });
    };

    const isFavorite = (id) => {
        return favorites.some(item => item.id === id);
    };

    const favoritesCount = favorites.length;

    return (
        <FavoritesContext.Provider value={{
            favorites,
            toggleFavorite,
            isFavorite,
            favoritesCount
        }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export const useFavorites = () => useContext(FavoritesContext);
