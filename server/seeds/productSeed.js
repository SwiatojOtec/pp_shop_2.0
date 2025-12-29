require('dotenv').config({ path: '../.env' });
const sequelize = require('../config/db');
const Product = require('../models/Product');

const products = [
    {
        name: 'Chevron Oak Natural',
        slug: 'chevron-oak-natural',
        price: 2400,
        oldPrice: 2800,
        image: 'https://placehold.co/800x800/E63946/FFFFFF?text=Oak+Natural',
        badge: 'SALE',
        colors: ['#D2B48C', '#8B4513', '#DEB887'],
        rating: 5,
        reviews: 12,
        sku: 'PP-CH-001',
        category: 'Паркетна дошка',
        desc: 'Елегантна паркетна дошка з натурального дуба, виконана в класичному стилі "Шеврон". Ідеально підходить для сучасних інтер\'єрів.',
        specs: [
            { label: 'Товщина', value: '15 мм' },
            { label: 'Ширина', value: '120 мм' },
            { label: 'Довжина', value: '600 мм' }
        ]
    },
    {
        name: 'Herringbone Walnut',
        slug: 'herringbone-walnut',
        price: 3100,
        image: 'https://placehold.co/800x800/121212/FFFFFF?text=Walnut',
        badge: 'NEW',
        colors: ['#3D2B1F', '#1A1A1A'],
        rating: 4,
        reviews: 8,
        sku: 'PP-HB-002',
        category: 'Паркетна дошка',
        desc: 'Насичений колір американського горіха в укладці "Ялинка". Додасть вашому дому затишку та статусності.',
        specs: [
            { label: 'Товщина', value: '14 мм' },
            { label: 'Ширина', value: '90 мм' },
            { label: 'Довжина', value: '540 мм' }
        ]
    },
    {
        name: 'Plank Ash White',
        slug: 'plank-ash-white',
        price: 1800,
        image: 'https://placehold.co/800x800/E9ECEF/212529?text=Ash+White',
        colors: ['#F5F5F5', '#E0E0E0'],
        rating: 5,
        reviews: 15,
        sku: 'PP-PL-003',
        category: 'Паркетна дошка',
        desc: 'Світла дошка з ясеня візуально розширює простір. Міцне покриття лаком захищає від подряпин.',
        specs: [
            { label: 'Товщина', value: '15 мм' },
            { label: 'Ширина', value: '140 мм' },
            { label: 'Довжина', value: '1200 мм' }
        ]
    },
    {
        name: 'Mosaic Teak',
        slug: 'mosaic-teak',
        price: 4500,
        image: 'https://placehold.co/800x800/333333/FFFFFF?text=Teak',
        badge: 'HIT',
        colors: ['#CD853F'],
        rating: 4,
        reviews: 5,
        sku: 'PP-MS-004',
        category: 'Паркетна дошка',
        desc: 'Екзотичний тік у форматі мозаїки. Стійкий до вологи, ідеальний для ванних кімнат та терас.',
        specs: [
            { label: 'Товщина', value: '10 мм' },
            { label: 'Ширина', value: '300 мм' },
            { label: 'Довжина', value: '300 мм' }
        ]
    }
];

const seedDB = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ force: true }); // This will drop the table and recreate it
        await Product.bulkCreate(products);
        console.log('Database Seeded with PostgreSQL!');
        process.exit();
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
};

seedDB();
