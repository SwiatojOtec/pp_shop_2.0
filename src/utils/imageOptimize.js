const PROXY_BASE = 'https://images.weserv.nl/';

/** Обгортає зовнішній URL фото через безкоштовний проксі, який віддає
 *  WebP потрібного розміру — вставлені посилання на фото товарів часто
 *  важать кілька мегабайт в оригіналі. Локальні/відносні шляхи, data:/
 *  blob: та вже обгорнуті URL повертає без змін. */
export function optimizeImageUrl(url, { width, quality = 75 } = {}) {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (url.startsWith('/') || url.includes('images.weserv.nl')) return url;
    if (!/^https?:\/\//i.test(url)) return url;

    const params = new URLSearchParams({ url, output: 'webp', q: String(quality) });
    if (width) params.set('w', String(width));
    return `${PROXY_BASE}?${params.toString()}`;
}
