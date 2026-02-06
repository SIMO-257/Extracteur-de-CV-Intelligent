const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const db = getDB();
        
        console.log('🔐 Login attempt for:', username);

        // Find admin in the 'admin' collection
        const admin = await db.collection('admin').findOne({ username });

        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                error: 'Identifiants invalides' 
            });
        }

        // Basic password check (in a real app, use bcrypt)
        if (admin.password !== password) {
            return res.status(401).json({ 
                success: false, 
                error: 'Identifiants invalides' 
            });
        }

        // Success
        res.json({ 
            success: true, 
            message: 'Connexion réussie',
            user: { username: admin.username }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur lors de la connexion' 
        });
    }
});

module.exports = router;
