function toIso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

/** Пресети періоду для вкладки «Аналітика» — value/from/to рахуються при
 *  виборі (не зберігаються статично), щоб «Сьогодні»/«7 днів» завжди
 *  означали справжні поточні дати. */
export const DATE_RANGE_PRESETS = [
    { value: 'today', label: 'Сьогодні', range: () => { const t = new Date(); return { from: toIso(t), to: toIso(t) }; } },
    { value: '7d', label: '7 днів', range: () => ({ from: toIso(daysAgo(6)), to: toIso(new Date()) }) },
    { value: '30d', label: '30 днів', range: () => ({ from: toIso(daysAgo(29)), to: toIso(new Date()) }) },
    {
        value: 'month',
        label: 'Цей місяць',
        range: () => {
            const t = new Date();
            return { from: toIso(new Date(t.getFullYear(), t.getMonth(), 1)), to: toIso(t) };
        },
    },
    {
        value: 'year',
        label: 'Цей рік',
        range: () => {
            const t = new Date();
            return { from: toIso(new Date(t.getFullYear(), 0, 1)), to: toIso(t) };
        },
    },
    { value: 'all', label: 'Весь час', range: () => ({ from: '2020-01-01', to: toIso(new Date()) }) },
    { value: 'custom', label: 'Свій період', range: null },
];

export function defaultRange() {
    return DATE_RANGE_PRESETS.find((p) => p.value === 'month').range();
}

const MONTH_NAMES_UA = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
];

function formatDay(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTH_NAMES_UA[m - 1]} ${y}`;
}

/** Точку графіка (bucket + гранулярність) → конкретний from/to для дрилдауну
 *  «показати лише цей день/тиждень/місяць» після кліку на графіку виручки. */
export function bucketToRange(bucket, granularity) {
    if (granularity === 'month') {
        const [y, m] = bucket.split('-').map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0);
        return {
            from: toIso(start),
            to: toIso(end),
            label: start.toLocaleString('uk-UA', { month: 'long', year: 'numeric' }),
        };
    }
    if (granularity === 'week') {
        const start = new Date(bucket);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { from: bucket, to: toIso(end), label: `${formatDay(bucket)} — ${formatDay(toIso(end))}` };
    }
    return { from: bucket, to: bucket, label: formatDay(bucket) };
}
