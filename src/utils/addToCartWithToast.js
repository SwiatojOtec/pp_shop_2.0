/**
 * Додає товар до кошика і показує відповідний toast.
 * Якщо орендний товар вже в кошику на максимумі — показує попередження.
 */
export function addToCartWithToast(product, quantity = 1, cartItems, addToCart, showToast) {
    if (product.isRent && typeof product.quantityAvailable === 'number') {
        const existing = cartItems.find(item => item.id === product.id);
        const currentQty = existing ? existing.quantity : 0;

        if (currentQty >= product.quantityAvailable) {
            showToast(
                `Вибачте, на складі не залишилось більше "${product.name}". Будь ласка, зконтактуйтесь з менеджером.`,
                'warning'
            );
            return;
        }
    }

    addToCart(product, quantity);
    showToast(`${product.name} додано в кошик`);
}
