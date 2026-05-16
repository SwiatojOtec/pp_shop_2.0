/**
 * Єдиний перелік технічного стану для картки товару (оренда), заявок і відображення на складі.
 * Значення value === те, що зберігається в БД (Products.technicalCondition, позиції заявок).
 */
export const TECHNICAL_CONDITION_OPTIONS = [
    { value: 'Новий', label: 'Новий' },
    { value: 'Відмінний', label: 'Відмінний' },
    { value: 'Добрий', label: 'Добрий' },
    { value: 'Задовільний', label: 'Задовільний' },
    { value: 'Потребує ремонту', label: 'Потребує ремонту' },
];

const ALLOWED = new Set(TECHNICAL_CONDITION_OPTIONS.map((o) => o.value));

/** Старі значення з заявок / ручного вводу → актуальний варіант з каталогу. */
const LEGACY_LOWER = {
    новий: 'Новий',
    відмінний: 'Відмінний',
    добрий: 'Добрий',
    задовільний: 'Задовільний',
    'потребує ремонту': 'Потребує ремонту',
    /** Раніше в заявці було «справний» — найближче до «Добрий» у шкалі картки товару. */
    справний: 'Добрий',
};

/**
 * Повертає канонічне значення з {@link TECHNICAL_CONDITION_OPTIONS} або порожній рядок.
 * Невідомі непорожні рядки повертаються як є (для select + збережених даних).
 */
export function normalizeTechnicalCondition(raw) {
    if (raw == null) return '';
    const s = String(raw).trim();
    if (!s) return '';
    if (ALLOWED.has(s)) return s;
    const fromLegacy = LEGACY_LOWER[s.toLowerCase()];
    if (fromLegacy) return fromLegacy;
    for (const opt of TECHNICAL_CONDITION_OPTIONS) {
        if (opt.value.toLowerCase() === s.toLowerCase()) return opt.value;
    }
    return s;
}

export function isCanonicalTechnicalCondition(value) {
    return value != null && ALLOWED.has(String(value).trim());
}
