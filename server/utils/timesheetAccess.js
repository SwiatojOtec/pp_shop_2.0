const SubdivisionMember = require('../models/SubdivisionMember');
const { ROLES } = require('./roles');

async function isSubdivisionHead(userId) {
    const row = await SubdivisionMember.findOne({
        where: { userId, isHead: true },
        attributes: ['id']
    });
    return !!row;
}

async function canEditOwnTimesheet(user) {
    if (user.role === ROLES.PIVDENBUD) return true;
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
