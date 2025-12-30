export const CATEGORY_MAP = {
    'parketna_doshka': 'Паркетна дошка',
    'laminat': 'Ламінат',
    'vinilova_pidloha': 'Вінілова підлога',
    'pidvikonnya': 'Підвіконня',
    'stinovi_paneli': 'Стінові панелі',
    'plintusa': 'Плінтуса'
};

export const getCategorySlug = (name) => {
    return Object.keys(CATEGORY_MAP).find(key => CATEGORY_MAP[key] === name) || name;
};

export const getCategoryName = (slug) => {
    // Also handle old hyphenated slugs for backward compatibility if needed
    const normalizedSlug = slug.replace(/-/g, '_');
    return CATEGORY_MAP[normalizedSlug] || CATEGORY_MAP[slug] || slug;
};
