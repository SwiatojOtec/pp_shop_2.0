require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const categoryRoutes = require('./routes/categoryRoutes');


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

// Root route for health check
app.get('/', (req, res) => {
    res.send('PP Shop API is running...');
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/categories', categoryRoutes);


// Database Connection and Sync
const PORT = process.env.PORT || 5000;

sequelize.authenticate()
    .then(() => {
        console.log('Connected to PostgreSQL');
        return sequelize.sync({ alter: true });
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
