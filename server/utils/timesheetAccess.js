const SubdivisionMember = require('../models/SubdivisionMember');
const { ROLES } = require('./roles');

async function isSubdivisionHead(userId) {
    const row = await SubdivisionMember.findOne({
        where: { userId, isHead: true },
        attributes: ['id']
    });
    return !!row;
}

const TIMESHEET_EDITOR_ROLES = [ROLES.PIVDENBUD, ROLES.SHOP_MANAGER, ROLES.SHOP_RENT];

async function canEditOwnTimesheet(user) {
    if (TIMESHEET_EDITOR_ROLES.includes(user.role)) return true;
    if (user.role === 'manager') return true;
    if (user.isSubdivisionHead) return true;
    return isSubdivisionHead(user.id);
}

function isTimesheetOverviewRole(role) {
    return role === ROLES.OWNER;
}

module.exports = {
    isSubdivisionHead,
    canEditOwnTimesheet,
    isTimesheetOverviewRole,
};
