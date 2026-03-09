const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Open or Create SQLite DB
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL
        )`);
        
        // Create Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            clienteNome TEXT NOT NULL,
            clienteEmail TEXT NOT NULL,
            data TEXT NOT NULL,
            itens TEXT NOT NULL,
            total REAL NOT NULL,
            status TEXT NOT NULL
        )`);
    }
});

// ==========================================
// USER ROUTES
// ==========================================
app.post('/api/users/check', (req, res) => {
    const { email } = req.body;
    db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor.' });
        if (row) return res.json({ exists: true });
        res.json({ exists: false });
    });
});

app.post('/api/users/register', async (req, res) => {
    const { nome, email, senha } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(senha, 10);
        const sql = `INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)`;
        db.run(sql, [nome, email, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'E-mail já cadastrado.' });
                }
                return res.status(500).json({ error: 'Erro no servidor.' });
            }
            res.json({ success: true, user: { id: this.lastID, nome, email } });
        });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao criptografar senha.' });
    }
});

app.post('/api/users/login', (req, res) => {
    const { email, senha } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor.' });
        if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const match = await bcrypt.compare(senha, user.senha);
        if (match) {
            res.json({ success: true, user: { id: user.id, nome: user.nome, email: user.email } });
        } else {
            res.status(401).json({ error: 'Credenciais inválidas.' });
        }
    });
});

// ==========================================
// ORDER ROUTES
// ==========================================
app.post('/api/orders', (req, res) => {
    const { id, clienteNome, clienteEmail, data, itens, total, status } = req.body;
    const sql = `INSERT INTO orders (id, clienteNome, clienteEmail, data, itens, total, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [id, clienteNome, clienteEmail, data, JSON.stringify(itens), total, status], function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao criar pedido.' });
        res.json({ success: true, message: 'Pedido criado com sucesso.' });
    });
});

app.get('/api/orders/:email', (req, res) => {
    const email = req.params.email;
    db.all(`SELECT * FROM orders WHERE clienteEmail = ? ORDER BY data DESC`, [email], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar pedidos.' });
        // Parse itens back to JSON
        const orders = rows.map(r => ({ ...r, itens: JSON.parse(r.itens) }));
        res.json(orders);
    });
});

app.get('/api/admin/orders', (req, res) => {
    db.all(`SELECT * FROM orders ORDER BY data DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar todos os pedidos.' });
        const orders = rows.map(r => ({ ...r, itens: JSON.parse(r.itens) }));
        res.json(orders);
    });
});

app.post('/api/admin/reset', (req, res) => {
    db.serialize(() => {
        db.run('DELETE FROM users');
        db.run('DELETE FROM orders');
        res.json({ success: true, message: 'Banco de dados resetado.' });
    });
});

app.listen(port, () => {
    console.log(`ValoBoost Backend rodando em http://localhost:${port}`);
});
