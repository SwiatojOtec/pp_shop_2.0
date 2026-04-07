const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SubdivisionMember = sequelize.define('SubdivisionMember', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    subdivisionId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    isHead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    timestamps: true,
    indexes: [{ unique: true, fields: ['userId'] }]
});

const Subdivision = require('./Subdivision');
const User = require('./User');

SubdivisionMember.belongsTo(User, { foreignKey: 'userId' });
SubdivisionMember.belongsTo(Subdivision, { foreignKey: 'subdivisionId' });
Subdivision.hasMany(SubdivisionMember, { foreignKey: 'subdivisionId' });

module.exports = SubdivisionMember;
