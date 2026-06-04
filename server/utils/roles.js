/** Ролі користувачів адмін-панелі */
const ROLES = {
    OWNER: 'owner',
    SHOP_MANAGER: 'shop_manager',
    RENT: 'rent',
    PIVDENBUD: 'pivdenbud',
    /** Магазин + оренда без доступу до підприємства */
    SHOP_RENT: 'shop_rent',
};

const ASSIGNABLE_ROLES = [
    ROLES.SHOP_MANAGER,
    ROLES.RENT,
    ROLES.PIVDENBUD,
    ROLES.SHOP_RENT,
];

const SHOP_ROLES = [ROLES.OWNER, ROLES.SHOP_MANAGER, ROLES.SHOP_RENT];
const RENT_ROLES = [ROLES.OWNER, ROLES.RENT, ROLES.PIVDENBUD, ROLES.SHOP_RENT];

function hasShopAccess(role) {
    return SHOP_ROLES.includes(role);
}

function hasRentAccess(role) {
    return RENT_ROLES.includes(role);
}

/** Роль після призначення головою підрозділу */
function roleWhenBecomingHead(currentRole) {
    if (currentRole === ROLES.RENT) return ROLES.PIVDENBUD;
    if (currentRole === ROLES.SHOP_MANAGER || currentRole === ROLES.SHOP_RENT) return currentRole;
    if (currentRole === 'manager') return ROLES.SHOP_MANAGER;
    return ROLES.PIVDENBUD;
}

/** Роль після зняття з посади голови (лише якщо була pivdenbud через підрозділ) */
function roleWhenLeavingHead(currentRole) {
    if (currentRole === ROLES.PIVDENBUD) return ROLES.RENT;
    return currentRole;
}

module.exports = {
    ROLES,
    ASSIGNABLE_ROLES,
    SHOP_ROLES,
    RENT_ROLES,
    hasShopAccess,
    hasRentAccess,
    roleWhenBecomingHead,
    roleWhenLeavingHead,
};
