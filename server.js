const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'mudream-secret-key-change-in-production';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Security warnings
if (!IS_PROD && JWT_SECRET === 'mudream-secret-key-change-in-production') {
    console.warn('⚠️  AVISO: JWT_SECRET padrão em uso. Defina um segredo forte em produção!');
}
if (IS_PROD && !process.env.JWT_SECRET) {
    console.error('🚨 ERRO CRÍTICO: JWT_SECRET não definido em produção! Abortando.');
    process.exit(1);
}

let resendClient = null;
if (RESEND_API_KEY) {
    const { Resend } = require('resend');
    resendClient = new Resend(RESEND_API_KEY);
}

async function sendEmail(to, subject, html) {
    if (!resendClient) return { sent: false, reason: 'no_api_key' };
    try {
        await resendClient.emails.send({
            from: `MU Timer Dream <${FROM_EMAIL}>`,
            to,
            subject,
            html
        });
        return { sent: true };
    } catch (err) {
        console.error('Email error:', err.message);
        return { sent: false, reason: err.message };
    }
}

const dbPath = process.env.DB_PATH || './data/mudream.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        sent_by INTEGER,
        sent_at TEXT DEFAULT (datetime('now')),
        recipients_count INTEGER DEFAULT 0,
        FOREIGN KEY (sent_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS guilds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        master_id INTEGER NOT NULL,
        join_code TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (master_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS guild_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        char_name TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (guild_id) REFERENCES guilds(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS guild_event_signups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        member_id INTEGER NOT NULL,
        event_id TEXT NOT NULL,
        event_date TEXT NOT NULL,
        status TEXT DEFAULT 'going',
        signed_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (guild_id) REFERENCES guilds(id),
        FOREIGN KEY (member_id) REFERENCES guild_members(id),
        UNIQUE(guild_id, member_id, event_id, event_date)
    );

    CREATE TABLE IF NOT EXISTS user_pins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        pin_hash TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_id TEXT NOT NULL,
        obtained INTEGER DEFAULT 1,
        obtained_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'premium',
        plan TEXT NOT NULL DEFAULT 'year',
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'EUR',
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        confirmed_at TEXT,
        confirmed_by INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (confirmed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// Settings table
db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('max_users', '40')").run();

// Migrate: add premium columns to users if missing
try { db.prepare("ALTER TABLE users ADD COLUMN premium_until TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE users ADD COLUMN premium_plan TEXT").run(); } catch {}
// Migrate: add adds column to user_items for item options (+luck, +skill, etc.)
try { db.prepare("ALTER TABLE user_items ADD COLUMN adds TEXT DEFAULT '[]'").run(); } catch {}

const adminExists = db.prepare('SELECT id FROM users WHERE is_admin = 1').get();
if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT OR IGNORE INTO users (username, email, password, is_admin) VALUES (?, ?, ?, 1)')
        .run('superadmin', 'admin@mudream.local', hash);
    console.log('Super admin created: superadmin / admin123');
}

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // SPA loads inline scripts
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // 10 tentativas por IP
    message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Muitas solicitações de reset. Aguarde 15 minutos.' }
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

function authMiddleware(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Não autenticado' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

function adminMiddleware(req, res, next) {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Acesso negado' });
    next();
}

// Limite de cadastros (sem contar admin) — configurável via admin
function getMaxUsers() {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'max_users'").get();
    return row ? parseInt(row.value) : 40;
}

// Cookie options helper
function cookieOpts(maxAge) {
    return { httpOnly: true, maxAge, sameSite: 'lax', secure: IS_PROD };
}

// HTML sanitizer to prevent XSS in email templates
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

app.post('/api/auth/register', (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });

    // Username validation
    if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username deve ter 3-20 caracteres' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username só pode conter letras, números e _' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Email inválido' });

    // Verificar limite de cadastros gratuitos (não conta admins)
    const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_admin = 0').get().cnt;
    const maxUsers = getMaxUsers();
    if (userCount >= maxUsers) {
        return res.status(403).json({
            error: 'limitReached',
            limit: maxUsers,
            pricing: { eur: 10, brl: 59.90, eurMonth: 3, brlMonth: 10 }
        });
    }

    try {
        const hash = bcrypt.hashSync(password, 10);
        const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email.toLowerCase(), hash);
        const token = jwt.sign({ id: result.lastInsertRowid, username, is_admin: 0 }, JWT_SECRET, { expiresIn: '30d' });
        res.cookie('token', token, cookieOpts(30 * 24 * 3600000));
        res.json({ ok: true, user: { id: result.lastInsertRowid, username, is_admin: 0 } });
        // Send welcome email (async, non-blocking)
        sendEmail(email.toLowerCase(), '⚔️ Bem-vindo ao MU Timer Dream!', buildWelcomeHtml(username)).catch(() => {});
    } catch (e) {
        if (e.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Usuário ou email já cadastrado' });
        }
        res.status(500).json({ error: 'Erro ao cadastrar' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ error: 'Preencha todos os campos' });

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login, login.toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }

    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, cookieOpts(30 * 24 * 3600000));
    res.json({ ok: true, user: { id: user.id, username: user.username, is_admin: user.is_admin } });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ ok: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT id, username, email, is_admin, created_at, last_login FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ user });
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
    const users = db.prepare('SELECT id, username, email, is_admin, created_at, last_login, premium_until, premium_plan FROM users ORDER BY created_at DESC').all();
    // Attach payment info for each user
    const paymentsStmt = db.prepare('SELECT id, type, plan, amount, currency, status, created_at, confirmed_at FROM payments WHERE user_id = ? ORDER BY created_at DESC');
    users.forEach(u => {
        u.payments = paymentsStmt.all(u.id);
        u.is_premium = u.premium_until && new Date(u.premium_until + 'Z') > new Date();
    });
    res.json({ users, total: users.length });
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) return res.status(400).json({ error: 'Não pode deletar a si mesmo' });
    const user = db.prepare('SELECT id FROM users WHERE id = ? AND is_admin = 0').get(userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Cascade delete all related data
    const memberIds = db.prepare('SELECT id FROM guild_members WHERE user_id = ?').all(userId).map(m => m.id);
    for (const mid of memberIds) {
        db.prepare('DELETE FROM guild_event_signups WHERE member_id = ?').run(mid);
    }
    db.prepare('DELETE FROM guild_members WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM payments WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM user_pins WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM user_items WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ ok: true });
});

// Premium payment management
app.post('/api/admin/users/:id/premium', authMiddleware, adminMiddleware, (req, res) => {
    const userId = parseInt(req.params.id);
    const { plan, amount, currency, notes } = req.body;
    if (!plan || !amount || !currency) return res.status(400).json({ error: 'Preencha plano, valor e moeda' });

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Calculate premium_until
    const now = new Date();
    let premiumUntil;
    if (plan === 'year') {
        premiumUntil = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
        premiumUntil = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    // Insert payment record
    db.prepare('INSERT INTO payments (user_id, type, plan, amount, currency, status, notes, confirmed_at, confirmed_by) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(?), ?)')
        .run(userId, 'premium', plan, amount, currency, 'confirmed', notes || null, 'now', req.user.id);

    // Update user premium status
    db.prepare('UPDATE users SET premium_until = ?, premium_plan = ? WHERE id = ?')
        .run(premiumUntil.toISOString().split('T')[0], plan, userId);

    res.json({ ok: true, premium_until: premiumUntil.toISOString().split('T')[0] });
});

app.delete('/api/admin/users/:id/premium', authMiddleware, adminMiddleware, (req, res) => {
    const userId = parseInt(req.params.id);
    db.prepare('UPDATE users SET premium_until = NULL, premium_plan = NULL WHERE id = ?').run(userId);
    res.json({ ok: true });
});

app.post('/api/admin/campaign', authMiddleware, adminMiddleware, async (req, res) => {
    const { subject, body, targetEmails } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'Assunto e corpo são obrigatórios' });

    let emails;
    if (targetEmails && targetEmails.length > 0) {
        emails = targetEmails;
    } else {
        const users = db.prepare('SELECT email FROM users WHERE email NOT LIKE ?').all('%@mudream.local');
        emails = users.map(u => u.email);
    }

    if (emails.length === 0) return res.status(400).json({ error: 'Nenhum destinatário encontrado' });

    db.prepare('INSERT INTO campaigns (subject, body, sent_by, recipients_count) VALUES (?, ?, ?, ?)')
        .run(subject, body, req.user.id, emails.length);

    if (resendClient) {
        const results = [];
        const html = buildEmailHtml(subject, body);
        for (const email of emails) {
            const r = await sendEmail(email, subject, html);
            results.push({ email, status: r.sent ? 'sent' : 'failed' });
        }
        res.json({ ok: true, sent: results.filter(r => r.status === 'sent').length, failed: results.filter(r => r.status === 'failed').length, total: emails.length });
    } else {
        res.json({ ok: true, sent: 0, total: emails.length, message: 'RESEND_API_KEY não configurada. Campanha salva mas emails não enviados.' });
    }
});

app.get('/api/admin/campaigns', authMiddleware, adminMiddleware, (req, res) => {
    const campaigns = db.prepare(`
        SELECT c.*, u.username as sent_by_name
        FROM campaigns c
        LEFT JOIN users u ON c.sent_by = u.id
        ORDER BY c.sent_at DESC
    `).all();
    res.json({ campaigns });
});

// ==================== ADMIN DASHBOARD ====================

app.get('/api/admin/dashboard', authMiddleware, adminMiddleware, (req, res) => {
    const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_admin = 0').get().cnt;
    const premiumUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE is_admin = 0 AND premium_until IS NOT NULL AND premium_until >= date('now')").get().cnt;
    const freeUsers = totalUsers - premiumUsers;
    const maxUsers = getMaxUsers();
    const slotsLeft = Math.max(0, maxUsers - totalUsers);

    const totalPayments = db.prepare("SELECT COUNT(*) as cnt FROM payments WHERE status = 'confirmed'").get().cnt;
    const revenueEur = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'confirmed' AND currency = 'EUR'").get().total;
    const revenueBrl = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'confirmed' AND currency = 'BRL'").get().total;

    const totalCampaigns = db.prepare('SELECT COUNT(*) as cnt FROM campaigns').get().cnt;
    const totalGuilds = db.prepare('SELECT COUNT(*) as cnt FROM guilds').get().cnt;

    // Recent signups (last 7 days)
    const recentSignups = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE is_admin = 0 AND created_at >= datetime('now', '-7 days')").get().cnt;

    // Recent payments (last 30 days)
    const recentPayments = db.prepare("SELECT id, user_id, plan, amount, currency, status, created_at, confirmed_at FROM payments ORDER BY created_at DESC LIMIT 10").all();
    // Attach usernames to recent payments
    const userStmt = db.prepare('SELECT username FROM users WHERE id = ?');
    recentPayments.forEach(p => {
        const u = userStmt.get(p.user_id);
        p.username = u ? u.username : '?';
    });

    res.json({
        totalUsers, premiumUsers, freeUsers, slotsLeft, maxUsers,
        totalPayments, revenueEur, revenueBrl,
        totalCampaigns, totalGuilds, recentSignups,
        recentPayments
    });
});

// ==================== ADMIN SETTINGS ====================

app.put('/api/admin/settings/max-users', authMiddleware, adminMiddleware, (req, res) => {
    const { value } = req.body;
    const num = parseInt(value);
    if (!num || num < 1 || num > 10000) return res.status(400).json({ error: 'Valor inválido (1-10000)' });
    db.prepare("UPDATE settings SET value = ? WHERE key = 'max_users'").run(String(num));
    res.json({ ok: true, maxUsers: num });
});

// ==================== CLEANUP EXPIRED TOKENS ====================

function cleanupExpiredTokens() {
    db.prepare("DELETE FROM password_resets WHERE expires_at < datetime('now') OR used = 1").run();
}
cleanupExpiredTokens(); // run on startup
setInterval(cleanupExpiredTokens, 60 * 60 * 1000); // every hour

// ==================== FORGOT PASSWORD ====================

app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Informe o email' });

    const user = db.prepare('SELECT id, username, email FROM users WHERE email = ?').get(email.toLowerCase());
    // Always return success to prevent email enumeration
    if (!user) return res.json({ ok: true });

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    // Invalidate previous tokens
    db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ?').run(user.id);
    db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

    const resetLink = `${APP_URL}/?reset=${token}`;
    sendEmail(user.email, '🔑 Redefinir senha — MU Timer Dream', buildResetPasswordHtml(user.username, resetLink)).catch(() => {});

    res.json({ ok: true });
});

app.post('/api/auth/reset-password', (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Dados incompletos' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });

    const reset = db.prepare("SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')").get(token);
    if (!reset) return res.status(400).json({ error: 'Link expirado ou inválido. Solicite um novo.' });

    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, reset.user_id);
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(reset.id);

    res.json({ ok: true });
});

// ==================== EMAIL TEMPLATES ====================

function buildWelcomeHtml(username) {
    const safeUser = escapeHtml(username);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a1a;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;padding:24px;background:linear-gradient(135deg,#1a1a35,#0d0d20);border-radius:12px 12px 0 0;">
            <h1 style="color:#f5a623;margin:0;font-size:26px;">⚔️ MU Timer Dream</h1>
            <p style="color:#8888aa;margin:6px 0 0;font-size:12px;">RAMPAGE X-20 • Event Notifier</p>
        </div>
        <div style="background:#1a1a35;padding:28px;border-radius:0 0 12px 12px;border:1px solid #2a2a4a;border-top:none;">
            <h2 style="color:#e8e8f0;margin:0 0 12px;">Bem-vindo, ${safeUser}! 🎉</h2>
            <p style="color:#c0c0d0;font-size:14px;line-height:1.7;">Seu cadastro foi realizado com sucesso no <strong style="color:#f5a623;">MU Timer Dream</strong>.</p>
            <p style="color:#c0c0d0;font-size:14px;line-height:1.7;">Agora você pode:</p>
            <ul style="color:#c0c0d0;font-size:14px;line-height:2;">
                <li>⏰ Configurar alarmes de eventos</li>
                <li>⚔️ Criar ou participar de uma Guild</li>
                <li>📦 Gerenciar sua Coleção Excellent</li>
                <li>🤖 Usar o MUCHAT - Assistente IA</li>
            </ul>
            <div style="text-align:center;margin-top:24px;">
                <a href="${APP_URL}" style="display:inline-block;background:#f5a623;color:#0a0a1a;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">ACESSAR O APP</a>
            </div>
        </div>
        <p style="text-align:center;color:#555577;font-size:11px;margin-top:16px;">MU Timer Dream — mudream.online</p>
    </div></body></html>`;
}

function buildResetPasswordHtml(username, resetLink) {
    const safeUser = escapeHtml(username);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a1a;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;padding:24px;background:linear-gradient(135deg,#1a1a35,#0d0d20);border-radius:12px 12px 0 0;">
            <h1 style="color:#f5a623;margin:0;font-size:26px;">⚔️ MU Timer Dream</h1>
            <p style="color:#8888aa;margin:6px 0 0;font-size:12px;">RAMPAGE X-20 • Event Notifier</p>
        </div>
        <div style="background:#1a1a35;padding:28px;border-radius:0 0 12px 12px;border:1px solid #2a2a4a;border-top:none;">
            <h2 style="color:#e8e8f0;margin:0 0 12px;">🔑 Redefinir Senha</h2>
            <p style="color:#c0c0d0;font-size:14px;line-height:1.7;">Olá <strong style="color:#f5a623;">${safeUser}</strong>,</p>
            <p style="color:#c0c0d0;font-size:14px;line-height:1.7;">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="${resetLink}" style="display:inline-block;background:#f5a623;color:#0a0a1a;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">REDEFINIR SENHA</a>
            </div>
            <p style="color:#888;font-size:12px;line-height:1.5;">Este link expira em <strong>30 minutos</strong>.</p>
            <p style="color:#888;font-size:12px;line-height:1.5;">Se você não solicitou esta redefinição, ignore este email.</p>
        </div>
        <p style="text-align:center;color:#555577;font-size:11px;margin-top:16px;">MU Timer Dream — mudream.online</p>
    </div></body></html>`;
}

function buildEmailHtml(subject, body) {
    const safeSubject = escapeHtml(subject);
    const safeBody = escapeHtml(body).replace(/\n/g, '<br>');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a1a;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#1a1a35,#0d0d20);border-radius:12px 12px 0 0;">
            <h1 style="color:#f5a623;margin:0;font-size:24px;">⚔️ MU Timer Dream</h1>
            <p style="color:#8888aa;margin:4px 0 0;font-size:12px;">RAMPAGE X-20 • Event Notifier</p>
        </div>
        <div style="background:#1a1a35;padding:24px;border-radius:0 0 12px 12px;border:1px solid #2a2a4a;border-top:none;">
            <h2 style="color:#e8e8f0;margin:0 0 16px;">${safeSubject}</h2>
            <div style="color:#c0c0d0;font-size:14px;line-height:1.6;">${safeBody}</div>
        </div>
        <p style="text-align:center;color:#555577;font-size:11px;margin-top:16px;">MU Timer Dream — mudream.online</p>
    </div></body></html>`;
}

// ==================== PIN SECURITY ====================

app.get('/api/auth/pin-status', authMiddleware, (req, res) => {
    const pin = db.prepare('SELECT enabled FROM user_pins WHERE user_id = ?').get(req.user.id);
    res.json({ hasPin: !!pin, enabled: pin ? !!pin.enabled : false });
});

app.post('/api/auth/pin-set', authMiddleware, (req, res) => {
    const { pin, currentPassword } = req.body;
    if (!pin || !currentPassword) return res.status(400).json({ error: 'PIN e senha são obrigatórios' });
    if (!/^\d{6}$/.test(pin)) return res.status(400).json({ error: 'PIN deve ter exatamente 6 dígitos numéricos' });

    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(401).json({ error: 'Senha incorreta' });
    }

    const pinHash = bcrypt.hashSync(pin, 10);
    db.prepare('INSERT OR REPLACE INTO user_pins (user_id, pin_hash, enabled) VALUES (?, ?, 1)').run(req.user.id, pinHash);
    res.json({ ok: true });
});

app.post('/api/auth/pin-disable', authMiddleware, (req, res) => {
    const { currentPassword } = req.body;
    if (!currentPassword) return res.status(400).json({ error: 'Senha é obrigatória' });

    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(401).json({ error: 'Senha incorreta' });
    }

    db.prepare('DELETE FROM user_pins WHERE user_id = ?').run(req.user.id);
    res.json({ ok: true });
});

app.post('/api/auth/pin-verify', authMiddleware, (req, res) => {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN é obrigatório' });

    const stored = db.prepare('SELECT pin_hash FROM user_pins WHERE user_id = ? AND enabled = 1').get(req.user.id);
    if (!stored) return res.status(400).json({ error: 'PIN não configurado' });

    if (!bcrypt.compareSync(pin, stored.pin_hash)) {
        return res.status(401).json({ error: 'PIN incorreto' });
    }

    // Generate a short-lived PIN token (15 min)
    const pinToken = jwt.sign({ id: req.user.id, pinVerified: true }, JWT_SECRET, { expiresIn: '15m' });
    res.cookie('pin_token', pinToken, cookieOpts(15 * 60 * 1000));
    res.json({ ok: true });
});

function pinMiddleware(req, res, next) {
    const pinRecord = db.prepare('SELECT enabled FROM user_pins WHERE user_id = ? AND enabled = 1').get(req.user.id);
    if (!pinRecord) return next(); // No PIN set, allow access

    const pinToken = req.cookies.pin_token;
    if (!pinToken) return res.status(403).json({ error: 'PIN necessário', pinRequired: true });

    try {
        const decoded = jwt.verify(pinToken, JWT_SECRET);
        if (decoded.id !== req.user.id || !decoded.pinVerified) {
            return res.status(403).json({ error: 'PIN necessário', pinRequired: true });
        }
        next();
    } catch {
        return res.status(403).json({ error: 'PIN expirado, digite novamente', pinRequired: true });
    }
}

// ==================== GUILD ROUTES ====================

function isGuildLeader(member) {
    return member.role === 'master' || member.role === 'assistant' || member.role === 'party_assistant';
}

app.post('/api/guild/create', authMiddleware, (req, res) => {
    const { name, charName } = req.body;
    if (!name || !charName) return res.status(400).json({ error: 'Nome da guild e nick são obrigatórios' });
    if (name.length < 2 || name.length > 30) return res.status(400).json({ error: 'Nome da guild deve ter 2-30 caracteres' });

    const existing = db.prepare('SELECT id FROM guild_members WHERE user_id = ?').get(req.user.id);
    if (existing) return res.status(400).json({ error: 'Você já está em uma guild' });

    try {
        const joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        const result = db.prepare('INSERT INTO guilds (name, master_id, join_code) VALUES (?, ?, ?)').run(name, req.user.id, joinCode);
        db.prepare('INSERT INTO guild_members (guild_id, user_id, char_name, role) VALUES (?, ?, ?, ?)').run(result.lastInsertRowid, req.user.id, charName, 'master');
        res.json({ ok: true, guild: { id: result.lastInsertRowid, name, joinCode } });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Nome de guild já existe' });
        res.status(500).json({ error: 'Erro ao criar guild' });
    }
});

app.post('/api/guild/add-member', authMiddleware, (req, res) => {
    const { username, charName } = req.body;
    if (!username || !charName) return res.status(400).json({ error: 'Usuário e nick são obrigatórios' });

    const myMember = db.prepare('SELECT gm.*, g.id as gid FROM guild_members gm JOIN guilds g ON gm.guild_id = g.id WHERE gm.user_id = ?').get(req.user.id);
    if (!myMember || !isGuildLeader(myMember)) return res.status(403).json({ error: 'Apenas o mestre ou assistente pode adicionar membros' });

    const targetUser = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado no sistema' });

    const alreadyInGuild = db.prepare('SELECT id FROM guild_members WHERE user_id = ?').get(targetUser.id);
    if (alreadyInGuild) return res.status(400).json({ error: 'Este usuário já está em uma guild' });

    try {
        db.prepare('INSERT INTO guild_members (guild_id, user_id, char_name, role) VALUES (?, ?, ?, ?)').run(myMember.guild_id, targetUser.id, charName, 'member');
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao adicionar membro' });
    }
});

app.post('/api/guild/set-role', authMiddleware, (req, res) => {
    const { memberId, role } = req.body;
    if (!memberId || !role) return res.status(400).json({ error: 'Dados incompletos' });
    if (!['member', 'assistant', 'party_assistant'].includes(role)) return res.status(400).json({ error: 'Cargo inválido' });

    const myMember = db.prepare('SELECT gm.*, g.master_id FROM guild_members gm JOIN guilds g ON gm.guild_id = g.id WHERE gm.user_id = ?').get(req.user.id);
    if (!myMember) return res.status(403).json({ error: 'Você não está em uma guild' });

    const isMaster = myMember.role === 'master';
    const isAssistant = myMember.role === 'assistant';

    if (role === 'assistant' && !isMaster) return res.status(403).json({ error: 'Apenas o mestre pode promover a assistente' });
    if (!isMaster && !isAssistant) return res.status(403).json({ error: 'Apenas o mestre ou assistente pode alterar cargos' });

    const target = db.prepare('SELECT * FROM guild_members WHERE id = ? AND guild_id = ?').get(memberId, myMember.guild_id);
    if (!target) return res.status(404).json({ error: 'Membro não encontrado' });
    if (target.role === 'master') return res.status(400).json({ error: 'Não pode alterar o cargo do mestre' });
    if (target.role === 'assistant' && !isMaster) return res.status(403).json({ error: 'Apenas o mestre pode alterar o cargo de assistentes' });

    db.prepare('UPDATE guild_members SET role = ? WHERE id = ?').run(role, memberId);
    res.json({ ok: true });
});

app.get('/api/guild/my', authMiddleware, pinMiddleware, (req, res) => {
    const member = db.prepare(`
        SELECT gm.*, g.name as guild_name, g.join_code, g.master_id, g.created_at as guild_created
        FROM guild_members gm
        JOIN guilds g ON gm.guild_id = g.id
        WHERE gm.user_id = ?
    `).get(req.user.id);

    if (!member) return res.json({ guild: null });

    const members = db.prepare(`
        SELECT gm.id, gm.char_name, gm.role, gm.joined_at, u.username
        FROM guild_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.guild_id = ?
        ORDER BY CASE gm.role WHEN 'master' THEN 0 WHEN 'assistant' THEN 1 WHEN 'party_assistant' THEN 2 ELSE 3 END, gm.joined_at
    `).all(member.guild_id);

    res.json({
        guild: {
            id: member.guild_id,
            name: member.guild_name,
            join_code: member.join_code,
            master_id: member.master_id,
            created_at: member.guild_created
        },
        member: { id: member.id, char_name: member.char_name, role: member.role },
        members
    });
});

app.post('/api/guild/leave', authMiddleware, (req, res) => {
    const member = db.prepare('SELECT gm.*, g.master_id FROM guild_members gm JOIN guilds g ON gm.guild_id = g.id WHERE gm.user_id = ?').get(req.user.id);
    if (!member) return res.status(404).json({ error: 'Você não está em uma guild' });

    if (member.master_id === req.user.id) {
        const memberCount = db.prepare('SELECT COUNT(*) as cnt FROM guild_members WHERE guild_id = ?').get(member.guild_id).cnt;
        if (memberCount > 1) return res.status(400).json({ error: 'Transfira a liderança antes de sair ou remova todos os membros' });
        db.prepare('DELETE FROM guild_event_signups WHERE guild_id = ?').run(member.guild_id);
        db.prepare('DELETE FROM guild_members WHERE guild_id = ?').run(member.guild_id);
        db.prepare('DELETE FROM guilds WHERE id = ?').run(member.guild_id);
    } else {
        db.prepare('DELETE FROM guild_event_signups WHERE member_id = ?').run(member.id);
        db.prepare('DELETE FROM guild_members WHERE id = ?').run(member.id);
    }
    res.json({ ok: true });
});

app.delete('/api/guild/members/:id', authMiddleware, (req, res) => {
    const memberId = parseInt(req.params.id);
    const myMember = db.prepare('SELECT gm.*, g.master_id FROM guild_members gm JOIN guilds g ON gm.guild_id = g.id WHERE gm.user_id = ?').get(req.user.id);
    if (!myMember || !isGuildLeader(myMember)) return res.status(403).json({ error: 'Apenas o mestre ou assistente pode remover membros' });

    const target = db.prepare('SELECT * FROM guild_members WHERE id = ? AND guild_id = ?').get(memberId, myMember.guild_id);
    if (!target) return res.status(404).json({ error: 'Membro não encontrado' });
    if (target.role === 'master') return res.status(400).json({ error: 'Não pode remover o mestre' });
    if (target.role === 'assistant' && myMember.role !== 'master') return res.status(403).json({ error: 'Apenas o mestre pode remover assistentes' });
    if (target.role === 'party_assistant' && myMember.role === 'party_assistant') return res.status(403).json({ error: 'Assistente de party não pode remover outro assistente de party' });

    db.prepare('DELETE FROM guild_event_signups WHERE member_id = ?').run(memberId);
    db.prepare('DELETE FROM guild_members WHERE id = ?').run(memberId);
    res.json({ ok: true });
});

app.post('/api/guild/events/signup', authMiddleware, (req, res) => {
    const { eventId, eventDate } = req.body;
    if (!eventId || !eventDate) return res.status(400).json({ error: 'Dados incompletos' });

    const member = db.prepare('SELECT * FROM guild_members WHERE user_id = ?').get(req.user.id);
    if (!member) return res.status(404).json({ error: 'Você não está em uma guild' });

    try {
        db.prepare('INSERT OR REPLACE INTO guild_event_signups (guild_id, member_id, event_id, event_date, status) VALUES (?, ?, ?, ?, ?)').run(member.guild_id, member.id, eventId, eventDate, 'going');
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao inscrever' });
    }
});

app.delete('/api/guild/events/signup', authMiddleware, (req, res) => {
    const { eventId, eventDate } = req.body;
    const member = db.prepare('SELECT * FROM guild_members WHERE user_id = ?').get(req.user.id);
    if (!member) return res.status(404).json({ error: 'Você não está em uma guild' });

    db.prepare('DELETE FROM guild_event_signups WHERE guild_id = ? AND member_id = ? AND event_id = ? AND event_date = ?').run(member.guild_id, member.id, eventId, eventDate);
    res.json({ ok: true });
});

app.get('/api/guild/events/signups', authMiddleware, (req, res) => {
    const member = db.prepare('SELECT * FROM guild_members WHERE user_id = ?').get(req.user.id);
    if (!member) return res.status(404).json({ error: 'Você não está em uma guild' });

    const signups = db.prepare(`
        SELECT ges.*, gm.char_name, u.username
        FROM guild_event_signups ges
        JOIN guild_members gm ON ges.member_id = gm.id
        JOIN users u ON gm.user_id = u.id
        WHERE ges.guild_id = ?
        ORDER BY ges.event_date DESC, ges.event_id
    `).all(member.guild_id);

    res.json({ signups, myMemberId: member.id });
});

app.get('/api/guild/events/report', authMiddleware, (req, res) => {
    const member = db.prepare('SELECT gm.*, g.master_id FROM guild_members gm JOIN guilds g ON gm.guild_id = g.id WHERE gm.user_id = ?').get(req.user.id);
    if (!member || !isGuildLeader(member)) return res.status(403).json({ error: 'Apenas o mestre ou assistente pode ver relatórios' });

    const report = db.prepare(`
        SELECT ges.event_id, ges.event_date, gm.char_name, u.username, ges.signed_at
        FROM guild_event_signups ges
        JOIN guild_members gm ON ges.member_id = gm.id
        JOIN users u ON gm.user_id = u.id
        WHERE ges.guild_id = ?
        ORDER BY ges.event_date DESC, ges.event_id, gm.char_name
    `).all(member.guild_id);

    res.json({ report });
});

// ==================== COLLECTION ROUTES ====================

app.get('/api/collection', authMiddleware, (req, res) => {
    const items = db.prepare('SELECT item_id, obtained, obtained_at, adds FROM user_items WHERE user_id = ?').all(req.user.id);
    res.json({ items: items.map(i => ({ ...i, obtained: i.obtained === 1, adds: JSON.parse(i.adds || '[]') })) });
});

app.post('/api/collection/toggle', authMiddleware, (req, res) => {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'Item inválido' });

    const existing = db.prepare('SELECT id, obtained, adds FROM user_items WHERE user_id = ? AND item_id = ?').get(req.user.id, itemId);
    if (existing) {
        if (existing.obtained === 1) {
            // Toggling OFF: if has adds, keep row but mark not obtained; otherwise delete
            const hasAdds = existing.adds && existing.adds !== '[]' && existing.adds !== '';
            if (hasAdds) {
                db.prepare('UPDATE user_items SET obtained = 0, obtained_at = NULL WHERE id = ?').run(existing.id);
            } else {
                db.prepare('DELETE FROM user_items WHERE id = ?').run(existing.id);
            }
            res.json({ ok: true, obtained: false });
        } else {
            // Row exists (from adds) but not obtained — mark as obtained
            db.prepare("UPDATE user_items SET obtained = 1, obtained_at = datetime('now') WHERE id = ?").run(existing.id);
            res.json({ ok: true, obtained: true });
        }
    } else {
        db.prepare("INSERT INTO user_items (user_id, item_id, obtained) VALUES (?, ?, 1)").run(req.user.id, itemId);
        res.json({ ok: true, obtained: true });
    }
});

app.put('/api/collection/adds', authMiddleware, (req, res) => {
    const { itemId, adds } = req.body;
    if (!itemId) return res.status(400).json({ error: 'Item inválido' });
    const validAdds = ['luck', 'skill', 'additional', 'life', 'mana', 'zen'];
    const filtered = (adds || []).filter(a => validAdds.includes(a));
    const existing = db.prepare('SELECT id, obtained FROM user_items WHERE user_id = ? AND item_id = ?').get(req.user.id, itemId);
    if (existing) {
        if (filtered.length === 0 && existing.obtained === 0) {
            // No adds and not obtained — remove the row entirely
            db.prepare('DELETE FROM user_items WHERE id = ?').run(existing.id);
        } else {
            db.prepare('UPDATE user_items SET adds = ? WHERE id = ?').run(JSON.stringify(filtered), existing.id);
        }
    } else {
        // Item not in collection yet — create row with obtained=0 for adds only
        if (filtered.length > 0) {
            db.prepare("INSERT INTO user_items (user_id, item_id, obtained, obtained_at, adds) VALUES (?, ?, 0, NULL, ?)").run(req.user.id, itemId, JSON.stringify(filtered));
        }
    }
    res.json({ ok: true, adds: filtered });
});

app.get('/api/collection/:username', (req, res) => {
    const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(req.params.username);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const items = db.prepare('SELECT item_id, obtained, obtained_at, adds FROM user_items WHERE user_id = ?').all(user.id);
    res.json({ username: user.username, items: items.map(i => ({ ...i, obtained: i.obtained === 1, adds: JSON.parse(i.adds || '[]') })) });
});

// Guild collection view — only guild members can see each other's collections
app.get('/api/guild/collection/:username', authMiddleware, (req, res) => {
    const myMember = db.prepare('SELECT guild_id FROM guild_members WHERE user_id = ?').get(req.user.id);
    if (!myMember) return res.status(403).json({ error: 'Você não está em uma guild' });
    const targetUser = db.prepare('SELECT id, username FROM users WHERE username = ?').get(req.params.username);
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado' });
    const targetMember = db.prepare('SELECT guild_id FROM guild_members WHERE user_id = ?').get(targetUser.id);
    if (!targetMember || targetMember.guild_id !== myMember.guild_id) {
        return res.status(403).json({ error: 'Este usuário não é da sua guild' });
    }
    const items = db.prepare('SELECT item_id, obtained, obtained_at, adds FROM user_items WHERE user_id = ?').all(targetUser.id);
    res.json({ username: targetUser.username, items: items.map(i => ({ ...i, obtained: i.obtained === 1, adds: JSON.parse(i.adds || '[]') })) });
});

// ==================== DONATION ROUTES ====================

const REVOLUT_ME_LINK = process.env.REVOLUT_ME_LINK || '';
const PIX_KEY = process.env.PIX_KEY || '';
const PIX_NAME = process.env.PIX_NAME || 'MU Timer Dream';
const PIX_CITY = process.env.PIX_CITY || 'SaoPaulo';

app.get('/api/donate/revolut-link', (req, res) => {
    if (!REVOLUT_ME_LINK) {
        return res.json({ error: 'Link Revolut não configurado' });
    }
    const amount = parseFloat(req.query.amount) || 5;
    const currency = req.query.currency || 'EUR';
    const url = `${REVOLUT_ME_LINK}?amount=${amount}&currency=${currency}`;
    res.json({ url });
});

app.post('/api/donate/pix', (req, res) => {
    if (!PIX_KEY) {
        return res.json({ error: 'Chave PIX não configurada' });
    }
    const amount = parseFloat(req.body.amount);
    if (!amount || amount < 1 || amount > 50000) {
        return res.status(400).json({ error: 'Valor inválido' });
    }
    const payload = buildPixPayload(PIX_KEY, PIX_NAME, PIX_CITY, amount);
    res.json({ payload });
});

function buildPixPayload(key, name, city, amount) {
    function tlv(id, value) {
        const len = String(value.length).padStart(2, '0');
        return id + len + value;
    }

    const gui = tlv('00', 'br.gov.bcb.pix');
    const pixKey = tlv('01', key);
    const mai = tlv('26', gui + pixKey);

    let payload = '';
    payload += tlv('00', '01');
    payload += mai;
    payload += tlv('52', '0000');
    payload += tlv('53', '986');
    payload += tlv('54', amount.toFixed(2));
    payload += tlv('58', 'BR');
    payload += tlv('59', name.substring(0, 25));
    payload += tlv('60', city.substring(0, 15));
    payload += tlv('62', tlv('05', '***'));

    payload += '6304';
    const crc = crc16ccitt(payload);
    payload += crc;

    return payload;
}

function crc16ccitt(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ==================== SPA CATCH-ALL ====================

app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== ERROR HANDLER ====================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: IS_PROD ? 'Erro interno do servidor' : err.message });
});

// ==================== GRACEFUL SHUTDOWN ====================

function shutdown() {
    console.log('Shutting down gracefully...');
    db.close();
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(PORT, () => {
    console.log(`⚔️ MU Timer Dream rodando na porta ${PORT} [${IS_PROD ? 'PRODUCTION' : 'DEV'}]`);
});
