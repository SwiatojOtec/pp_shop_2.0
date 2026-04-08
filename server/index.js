require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/db');
// Ініціалізація основного Telegram-бота (для калькулятора/рахунків)
require('./utils/telegram');
// Ініціалізація окремого бота для оренди (обмежені права)
require('./utils/telegramRent');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const blogRoutes = require('./routes/blogRoutes');
const contactRoutes = require('./routes/contactRoutes');
const rentCategoryRoutes = require('./routes/rentCategoryRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const rentalApplicationRoutes = require('./routes/rentalApplicationRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');
const subdivisionRoutes = require('./routes/subdivisionRoutes');
const clientRoutes = require('./routes/clientRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const warehouseDashboardRoutes = require('./routes/warehouseDashboardRoutes');
require('./models/Warehouse');
require('./models/InventoryItem');
require('./models/WarehouseEvent');
const { ensureMainWarehouse, ensureRepairWarehouse, bootstrapRentInventoryFromProducts } = require('./services/inventoryService');
const app = express();

// Middleware
const allowedOrigins = [
    'https://pp-shop-2-0.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(null, true); // Allow all for now to debug, or specify origins
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(express.json());

// Rate limiting
// General limit: 200 requests per 15 minutes per IP
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Забагато запитів. Спробуйте пізніше.' }
});

// Strict limit for auth routes: 10 attempts per 15 minutes (brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Забагато спроб входу. Спробуйте через 15 хвилин.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Root route for health check
app.get('/', (req, res) => {
    res.send('PP Shop API is running...');
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/rent-categories', rentCategoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rental-applications', rentalApplicationRoutes);
app.use('/api/timesheet', timesheetRoutes);
app.use('/api/subdivisions', subdivisionRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/warehouse', warehouseDashboardRoutes);
// Database Connection and Sync
const PORT = process.env.PORT || 5000;

sequelize.authenticate()
    .then(() => {
        console.log('Connected to PostgreSQL');
        return sequelize.sync({ alter: true });
    })
    .then(async () => {
        await ensureMainWarehouse();
        await ensureRepairWarehouse();
        await bootstrapRentInventoryFromProducts();
    })
    .then(() => {
        console.log('Database synced');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
