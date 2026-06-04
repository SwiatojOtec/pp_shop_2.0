export const ROLES = {
    OWNER: 'owner',
    SHOP_MANAGER: 'shop_manager',
    RENT: 'rent',
    PIVDENBUD: 'pivdenbud',
    SHOP_RENT: 'shop_rent',
};

export const ROLE_LABELS = {
    [ROLES.OWNER]: 'Власник',
    [ROLES.SHOP_MANAGER]: 'Менеджер магазину',
    [ROLES.RENT]: 'Менеджер оренди',
    [ROLES.PIVDENBUD]: 'ПАН ПІВДЕНЬБУД',
    [ROLES.SHOP_RENT]: 'Менеджер магазину та оренди',
    manager: 'Менеджер (застаріла)',
};

export function hasShopAccess(role) {
    return role === ROLES.OWNER || role === ROLES.SHOP_MANAGER || role === ROLES.SHOP_RENT || role === 'manager';
}

export function hasRentAccess(role) {
    return role === ROLES.OWNER || role === ROLES.RENT || role === ROLES.PIVDENBUD || role === ROLES.SHOP_RENT;
}

export function canUseTimesheet(role, isSubdivisionHead) {
    return role === ROLES.PIVDENBUD || !!isSubdivisionHead;
}

export function isTimesheetViewer(role) {
    return role === ROLES.OWNER;
}
