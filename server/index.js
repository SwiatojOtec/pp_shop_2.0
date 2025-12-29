require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const currencyRoutes = require('./routes/currencyRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/currencies', currencyRoutes);

// Database Connection and Sync
sequelize.authenticate()
    .then(() => {
        console.log('Connected to PostgreSQL');
        return sequelize.sync({ alter: true }); // Sync models to database with alter
    })
    .then(() => {
        console.log('Database synced');
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });
