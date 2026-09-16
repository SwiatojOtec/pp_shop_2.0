'use strict';

/**
 * Каталог «Послуги» (docs plan «Каталог «Послуги»»): послуга — це Product з
 * isService:true, isRent:false — той самий Product, що й товар/оренда, щоб
 * увесь механізм «додати позицію в угоду» (order-items, invoiceService)
 * запрацював без змін. showInServiceCatalog дзеркалить showInRentCatalog —
 * дозволяє мати послугу лише для внутрішнього використання в угодах, без
 * публічної картки на /poslugy.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Products', 'isService', {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        });
        await queryInterface.addColumn('Products', 'showInServiceCatalog', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Products', 'showInServiceCatalog');
        await queryInterface.removeColumn('Products', 'isService');
    },
};
