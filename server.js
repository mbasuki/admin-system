require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serves CSS/JS
app.set('view engine', 'ejs');      // Serves HTML files

// --- DATABASE SETUP ---
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    // 1. Products Table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL
    )`);

    // 2. Stock Table
    db.run(`CREATE TABLE IF NOT EXISTS stock (
        product_id INTEGER,
        quantity INTEGER,
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // 3. Purchases Table
    db.run(`CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        customer TEXT,
        product_id INTEGER,
        quantity INTEGER,
        total REAL,
        status TEXT DEFAULT 'Active'
    )`);

    // 4. Seed Data (Insert sample products if empty)
    db.get("SELECT count(*) as count FROM products", (err, row) => {
        if (row.count === 0) {
            const products = [
                { name: "Wireless Mouse", price: 25.00, stock: 50 },
                { name: "Mechanical Keyboard", price: 85.00, stock: 30 },
                { name: "27-inch Monitor", price: 150.00, stock: 15 },
                { name: "USB-C Hub", price: 40.00, stock: 100 },
                { name: "Webcam 1080p", price: 60.00, stock: 25 },
                { name: "Headphones", price: 120.00, stock: 20 },
                { name: "Laptop Stand", price: 35.00, stock: 45 },
                { name: "External SSD 1TB", price: 110.00, stock: 60 },
                { name: "Ergonomic Chair", price: 200.00, stock: 10 },
                { name: "Smart Lamp", price: 45.00, stock: 35 }
            ];

            products.forEach(p => {
                db.run("INSERT INTO products (name, price) VALUES (?, ?)", [p.name, p.price], function(err) {
                    if (!err) {
                        db.run("INSERT INTO stock (product_id, quantity) VALUES (?, ?)", [this.lastID, p.stock]);
                    }
                });
            });
            console.log("Database seeded with 10 products.");
        }
    });
});

// --- ROUTES ---

// Render Dashboard
app.get('/', (req, res) => {
    res.render('index');
});

// API: Stats
app.get('/api/stats', (req, res) => {
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM products) as totalProducts,
            (SELECT COUNT(*) FROM purchases WHERE status='Active') as activeOrders,
            (SELECT COALESCE(SUM(total), 0) FROM purchases WHERE status='Active') as revenue
    `;
    db.get(sql, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// API: Get Products
app.get('/api/products', (req, res) => {
    const sql = `SELECT p.id, p.name, p.price, s.quantity as stock FROM products p JOIN stock s ON p.id = s.product_id`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API: Get Purchases
app.get('/api/purchases', (req, res) => {
    const sql = `SELECT pur.id, pur.date, pur.customer, pur.quantity, pur.total, pur.status, p.name as productName 
                 FROM purchases pur JOIN products p ON pur.product_id = p.id ORDER BY pur.id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API: Create Purchase
app.post('/api/purchase', (req, res) => {
    const { customer, productId, quantity } = req.body;
    
    db.get("SELECT quantity FROM stock WHERE product_id = ?", [productId], (err, stockRow) => {
        if (err || !stockRow) return res.status(500).json({ error: "Product not found" });
        if (stockRow.quantity < quantity) return res.status(400).json({ error: "Insufficient stock" });

        db.get("SELECT price FROM products WHERE id = ?", [productId], (err, prodRow) => {
            const total = prodRow.price * quantity;
            const date = new Date().toISOString().split('T')[0];
            
            db.run("INSERT INTO purchases (date, customer, product_id, quantity, total) VALUES (?,?,?,?,?)", 
                [date, customer, productId, quantity, total], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                db.run("UPDATE stock SET quantity = quantity - ? WHERE product_id = ?", [quantity, productId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: "Purchase created", id: this.lastID });
                });
            });
        });
    });
});

// API: Cancel Purchase
app.post('/api/cancel/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM purchases WHERE id = ?", [id], (err, purchase) => {
        if (err || !purchase) return res.status(404).json({ error: "Purchase not found" });
        if (purchase.status === 'Cancelled') return res.status(400).json({ error: "Already cancelled" });

        db.run("UPDATE purchases SET status = 'Cancelled' WHERE id = ?", [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            db.run("UPDATE stock SET quantity = quantity + ? WHERE product_id = ?", [purchase.quantity, purchase.product_id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Purchase cancelled" });
            });
        });
    });
});

// API: Chat
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    const systemPrompt = "You are a helpful Admin Assistant. Answer concisely.";

    try {
        const response = await axios.post(process.env.AI_ENDPOINT, {
            //model: "deepseek-chat", // or "gpt-3.5-turbo"
			model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });
        res.json({ reply: response.data.choices[0].message.content });
    } catch (error) {
        console.error("AI Error:", error.response ? error.response.data : error.message);
        res.json({ reply: "Sorry, AI connection failed. Check API Key." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});