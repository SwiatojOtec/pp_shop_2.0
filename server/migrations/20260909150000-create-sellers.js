'use strict';

/**
 * docs/admin-redesign/03-screens.md, «Компанія» — «Юрособи»: новий довідник
 * орендодавців/продавців у БД, seed-нутий з наявних чотирьох записів у
 * src/constants/sellers.js та server/constants/sellers.js (id лишається той
 * самий, щоб Order.sellerId і надалі резолвився). Самі константи поки НЕ
 * видаляються — 03-screens.md вимагає перевести на API усі місця, що їх
 * читають (друковані документи), а це окрема, обережніша зміна.
 *
 * @type {import('sequelize-cli').Migration}
 */
const OFFICE_CONTACTS = {
    phone: '+38 098 188 00 44; +38 095 672 44 00',
    email: 'office@ppbud.info',
    warehouseAddress: 'м. Київ, вул. Холодноярська 2а',
};

const SEED = [
    {
        id: 'fop_pankratiev_mo',
        label: 'ФОП Панкрат\'єв М.О.',
        type: 'fop',
        isDefault: true,
        appliesVat: false,
        personName: 'Панкрат\'єв Микола Олександрович',
        fullName: 'Фізична особа-підприємець Панкрат\'єв Микола Олександрович',
        taxIdLabel: 'ІПН',
        taxId: '3584307038',
        legalAddress: '08130, м. Київ, вул. Садова, буд 139',
        bankName: 'АТ «УНІВЕРСАЛ БАНК»',
        bankMfo: '322001',
        iban: 'UA733220010000026002330029958',
        signedBy: 'Панкрат\'єв М.О.',
        rentalContractCity: 'м. Київ',
        rentalContractEdrDate: '14.03.2012',
        rentalContractEdrNumber: '2 146 017 0000 012345',
        ...OFFICE_CONTACTS,
    },
    {
        id: 'fop_pankratiev_mykhailo',
        label: 'ФОП Панкрат\'єв Михайло О.',
        type: 'fop',
        isDefault: false,
        appliesVat: false,
        personName: 'Панкрат\'єв Михайло Олександрович',
        fullName: 'Фізична особа-підприємець Панкрат\'єв Михайло Олександрович',
        taxIdLabel: 'ІПН',
        taxId: '3849711711',
        legalAddress: '15300, Чернігівська обл., Корюківський р-н, м. Корюківка, вул. Садова, буд. 139',
        bankName: 'АТ «УНІВЕРСАЛ БАНК»',
        bankMfo: '322001',
        iban: 'UA473220010000026001350113243',
        signedBy: 'Панкрат\'єв М.О.',
        rentalContractCity: 'м. Київ',
        rentalContractEdrDate: '22.06.2015',
        rentalContractEdrNumber: '2 146 017 0000 023456',
        ...OFFICE_CONTACTS,
    },
    {
        id: 'fop_pankratiev_om',
        label: 'ФОП Панкрат\'єв О.М.',
        type: 'fop',
        isDefault: false,
        appliesVat: false,
        personName: 'Панкрат\'єв Олександр Миколайович',
        fullName: 'Фізична особа-підприємець Панкрат\'єв Олександр Миколайович',
        taxIdLabel: 'ІПН',
        taxId: '2490020092',
        legalAddress: '15300, Чернігівська обл., Корюківський р-н, м. Корюківка, вул. Садова, буд. 139',
        bankName: 'АТ «УКРСИББАНК»',
        bankMfo: '351005',
        iban: 'UA363510050000026008134274800',
        signedBy: 'Панкрат\'єв О.М.',
        rentalContractCity: 'м. Київ',
        rentalContractEdrDate: '11.01.2006',
        rentalContractEdrNumber: '2 146 017 0000 004725',
        ...OFFICE_CONTACTS,
    },
    {
        id: 'tov_pan_pivdenbud',
        label: 'ТОВ «ПАН-ПІВДЕНЬБУД»',
        type: 'tov',
        isDefault: false,
        appliesVat: true,
        personName: 'ТОВ «ПАН-ПІВДЕНЬБУД»',
        fullName: 'ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ «ПАН-ПІВДЕНЬБУД»',
        taxIdLabel: 'ЄДРПОУ',
        taxId: '35061088',
        legalAddress: '03022, м. Київ, вул. Холодноярська, буд. 2А',
        bankName: 'АТ «УКРСИББАНК»',
        bankMfo: '351005',
        iban: 'UA243510050000026005122428702',
        signedBy: 'Панкрат\'єв О.М.',
        rentalContractCity: null,
        rentalContractEdrDate: null,
        rentalContractEdrNumber: null,
        ...OFFICE_CONTACTS,
    },
];

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Sellers', {
            id: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
            label: { type: Sequelize.STRING, allowNull: false },
            type: { type: Sequelize.ENUM('fop', 'tov'), allowNull: false, defaultValue: 'fop' },
            isDefault: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            appliesVat: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            personName: { type: Sequelize.STRING, allowNull: true },
            fullName: { type: Sequelize.STRING, allowNull: true },
            taxIdLabel: { type: Sequelize.STRING, allowNull: true, defaultValue: 'ІПН' },
            taxId: { type: Sequelize.STRING, allowNull: true },
            legalAddress: { type: Sequelize.TEXT, allowNull: true },
            phone: { type: Sequelize.STRING, allowNull: true },
            email: { type: Sequelize.STRING, allowNull: true },
            warehouseAddress: { type: Sequelize.TEXT, allowNull: true },
            bankName: { type: Sequelize.STRING, allowNull: true },
            bankMfo: { type: Sequelize.STRING, allowNull: true },
            iban: { type: Sequelize.STRING, allowNull: true },
            signedBy: { type: Sequelize.STRING, allowNull: true },
            rentalContractCity: { type: Sequelize.STRING, allowNull: true },
            rentalContractEdrDate: { type: Sequelize.STRING, allowNull: true },
            rentalContractEdrNumber: { type: Sequelize.STRING, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        const now = new Date();
        await queryInterface.bulkInsert('Sellers', SEED.map((s) => ({ ...s, createdAt: now, updatedAt: now })));
    },

    async down(queryInterface) {
        await queryInterface.dropTable('Sellers');
    },
};
