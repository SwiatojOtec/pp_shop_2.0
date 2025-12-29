export const CATEGORY_MAP = {
    'parketna-doshka': 'Паркетна дошка',
    'laminat': 'Ламінат',
    'vinil': 'Вініл',
    'pidvikonnya': 'Подоконники',
    'dveri': 'Двері',
    'stinovi-paneli': 'Стінові панелі',
    'aksesuary': 'Аксесуари'
};

export const getCategorySlug = (name) => {
    return Object.keys(CATEGORY_MAP).find(key => CATEGORY_MAP[key] === name) || name;
};

export const getCategoryName = (slug) => {
    return CATEGORY_MAP[slug] || slug;
};
