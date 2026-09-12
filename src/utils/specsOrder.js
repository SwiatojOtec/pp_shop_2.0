/**
 * `specs` лишається обʼєктом { key: value } — за ним фільтрує каталог через
 * JSONB-запит на сервері (server/routes/productRoutes.js), і об'єкт для
 * цього зручніший, ніж масив пар. Порядок показу зберігається окремо, у
 * `specsOrder` (масив ключів). Ключ, якого нема в specsOrder (ще не
 * впорядкований вручну, або доданий пізніше), показується після
 * впорядкованих — у природньому порядку вставки.
 */
export function getOrderedSpecEntries(specs, specsOrder) {
    const entries = Object.entries(specs || {});
    if (!Array.isArray(specsOrder) || specsOrder.length === 0) return entries;

    const byKey = new Map(entries);
    const ordered = specsOrder.filter((key) => byKey.has(key)).map((key) => [key, byKey.get(key)]);
    const orderedKeys = new Set(specsOrder);
    const rest = entries.filter(([key]) => !orderedKeys.has(key));

    return [...ordered, ...rest];
}
