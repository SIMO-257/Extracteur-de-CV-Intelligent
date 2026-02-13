// APP.JS
const express = require('express');
const cors = require('cors');
const { connectDB} = require('./db');
const cvRoutes = require('./Routes/cvRoutes');
const authRoutes = require('./Routes/authRoutes');
const adminRoutes = require('./Routes/adminRoutes');
const path = require('path'); // Add this line

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'uploads' directory (for MinIO)
app.use('/uploads', express.static('uploads'));
// Also serve the temporary uploads for multer disk storage
app.use('/temp_uploads', express.static(path.join(__dirname, 'temp_uploads')));

// Routes
app.use('/api/cv', cvRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error: err.message || 'Something went wrong!' 
    });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}`);
    console.log(`MongoDB connecte`);
  });
}).catch(err => {
  console.error('Erreur de connexion MongoDB:', err);
  process.exit(1);
});

module.exports = app;