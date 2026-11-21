const express = require('express');
const router = express.Router();
const db = require('../db');

// POST: Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    let connection;
    try {
        connection = await db.promise().getConnection();
        const [users] = await connection.query(
            'SELECT id, email, password, name, role, developer_id FROM ds_users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        // Simple password comparison (in production, use bcrypt)
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                developer_id: user.developer_id
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// POST: Signup
router.post('/signup', async (req, res) => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Manager can only be created with default credentials
    if (role === 'manager') {
        return res.status(403).json({ error: 'Cannot create manager account. Use default manager credentials.' });
    }

    let connection;
    try {
        connection = await db.promise().getConnection();

        // Check if email already exists
        const [existing] = await connection.query(
            'SELECT id FROM ds_users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // If registering as developer or team_head, create developer record first
        let developer_id = null;
        let developerRole = null;

        if (role === 'developer') {
            developerRole = 'Developer';
            const [devResult] = await connection.query(
                'INSERT INTO ds_developers (name, email, role) VALUES (?, ?, ?)',
                [name, email, developerRole]
            );
            developer_id = devResult.insertId;
            
            // Also insert into ds_roles table
            await connection.query(
                'INSERT INTO ds_roles (developer_id, role_type) VALUES (?, ?)',
                [developer_id, 'developer']
            );
        } else if (role === 'team_head') {
            developerRole = 'Team Head';
            const [devResult] = await connection.query(
                'INSERT INTO ds_developers (name, email, role) VALUES (?, ?, ?)',
                [name, email, developerRole]
            );
            developer_id = devResult.insertId;
            
            // Also insert into ds_roles table
            await connection.query(
                'INSERT INTO ds_roles (developer_id, role_type) VALUES (?, ?)',
                [developer_id, 'team_head']
            );
        }

        // Create user record
        const [result] = await connection.query(
            'INSERT INTO ds_users (email, password, name, role, developer_id) VALUES (?, ?, ?, ?, ?)',
            [email, password, name, role, developer_id]
        );

        res.status(201).json({
            success: true,
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully!`,
            user: {
                id: result.insertId,
                email,
                name,
                role,
                developer_id
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
