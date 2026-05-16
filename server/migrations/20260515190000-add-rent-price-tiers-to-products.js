'use strict';

/** Диференційовані тарифи оренди (₴/доба) за тривалістю — JSONB на Products. */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'Products',
            'rentPriceTiers',
            {
                type: Sequelize.JSONB,
                allowNull: true,
                defaultValue: null,
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Products', 'rentPriceTiers');
    },
};
