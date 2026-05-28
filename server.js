const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const IS_VERCEL = process.env.VERCEL === '1';
const JWT_SECRET = process.env.JWT_SECRET || 'mudream-secret-key-change-in-production';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wjapusdyewhysitcamyy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Security warnings
if (!IS_PROD && JWT_SECRET === 'mudream-secret-key-change-in-production') {
    console.warn('⚠️  AVISO: JWT_SECRET padrão em uso. Defina um segredo forte em produção!');
}
if (IS_PROD && !process.env.JWT_SECRET && !IS_VERCEL) {
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

// Initialize admin on startup
async function initAdmin() {
    const ADMIN_PASS = process.env.ADMIN_PASS || 'Admin2026*!@#';
    const { data: adminExists } = await supabase
        .from('users')
        .select('id')
        .eq('is_admin', 1)
        .limit(1)
        .single();

    if (!adminExists) {
        const hash = bcrypt.hashSync(ADMIN_PASS, 10);
        await supabase.from('users').upsert({
            username: 'superadmin',
            email: 'admin@mudream.local',
            password: hash,
            is_admin: 1
        }, { onConflict: 'username' });
        console.log('Super admin created: superadmin');
    } else {
        const hash = bcrypt.hashSync(ADMIN_PASS, 10);
        await supabase
            .from('users')
            .update({ password: hash })
            .eq('username', 'superadmin')
            .eq('is_admin', 1);
    }
}

// Initialize settings
async function initSettings() {
    const { data } = await supabase
        .from('settings')
        .select('key')
        .eq('key', 'max_users')
        .single();
    if (!data) {
        await supabase.from('settings').insert({ key: 'max_users', value: '40' });
    }
}

// Run init
(async () => {
    try {
        await initSettings();
        await initAdmin();
    } catch (err) {
        console.error('Init error:', err.message);
    }
})();

// Trust proxy (Vercel, Cloudflare, etc.)
if (IS_VERCEL || IS_PROD) {
    app.set('trust proxy', 1);
}

// Security headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
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

async function getMaxUsers() {
    const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'max_users')
        .single();
    return data ? parseInt(data.value) : 40;
}

function cookieOpts(maxAge) {
    return { httpOnly: true, maxAge, sameSite: 'lax', secure: IS_PROD || IS_VERCEL, path: '/' };
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });

    if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username deve ter 3-20 caracteres' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username só pode conter letras, números e _' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Email inválido' });

    try {
        // Check user limit
        const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('is_admin', 0);
        const maxUsers = await getMaxUsers();
        if (count >= maxUsers) {
            return res.status(403).json({
                error: 'limitReached',
                limit: maxUsers,
                pricing: { eur: 10, brl: 59.90, eurMonth: 3, brlMonth: 10 }
            });
        }

        const hash = bcrypt.hashSync(password, 10);
        const { data, error } = await supabase
            .from('users')
            .insert({ username, email: email.toLowerCase(), password: hash })
            .select('id')
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Usuário ou email já cadastrado' });
            }
            throw error;
        }

        const token = jwt.sign({ id: data.id, username, is_admin: 0 }, JWT_SECRET, { expiresIn: '30d' });
        res.cookie('token', token, cookieOpts(30 * 24 * 3600000));
        res.json({ ok: true, user: { id: data.id, username, is_admin: 0 } });
        sendEmail(email.toLowerCase(), '⚔️ Bem-vindo ao MU Timer Dream!', buildWelcomeHtml(username)).catch(() => {});
    } catch (e) {
        console.error('Register error:', e.message);
        res.status(500).json({ error: 'Erro ao cadastrar' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ error: 'Preencha todos os campos' });

    const { data: user } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${login},email.eq.${login.toLowerCase()}`)
        .limit(1)
        .single();

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }

    await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, cookieOpts(30 * 24 * 3600000));
    res.json({ ok: true, user: { id: user.id, username: user.username, is_admin: user.is_admin } });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ ok: true });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    const { data: user, error } = await supabase
        .from('users')
        .select('id, username, email, is_admin, created_at, last_login, enabled_alarms, elite_timers')
        .eq('id', req.user.id)
        .single();
    if (error) {
        console.error('GET /api/auth/me query error:', error.message);
        return res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ user });
});

app.get('/api/user/alarms', authMiddleware, async (req, res) => {
    const { data } = await supabase
        .from('users')
        .select('enabled_alarms, elite_timers')
        .eq('id', req.user.id)
        .single();
    let alarms = [];
    let eliteTimers = {};
    try { alarms = JSON.parse(data?.enabled_alarms || '[]'); } catch {}
    try { eliteTimers = JSON.parse(data?.elite_timers || '{}'); } catch {}
    res.json({ alarms, eliteTimers });
});

app.put('/api/user/alarms', authMiddleware, async (req, res) => {
    const { alarms } = req.body;
    if (!Array.isArray(alarms)) return res.status(400).json({ error: 'Formato inválido' });
    await supabase
        .from('users')
        .update({ enabled_alarms: JSON.stringify(alarms) })
        .eq('id', req.user.id);
    res.json({ ok: true });
});

app.get('/api/user/elite-timers', authMiddleware, async (req, res) => {
    const { data } = await supabase
        .from('users')
        .select('elite_timers')
        .eq('id', req.user.id)
        .single();
    let timers = {};
    try { timers = JSON.parse(data?.elite_timers || '{}'); } catch {}
    res.json({ timers });
});

app.put('/api/user/elite-timers', authMiddleware, async (req, res) => {
    const { timers } = req.body;
    if (typeof timers !== 'object') return res.status(400).json({ error: 'Formato inválido' });
    await supabase
        .from('users')
        .update({ elite_timers: JSON.stringify(timers) })
        .eq('id', req.user.id);
    res.json({ ok: true });
});

// ==================== CUSTOM ALARM SOUND ====================

app.post('/api/user/alarm-sound', authMiddleware, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        const allowed = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a'];
        if (!allowed.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Formato de áudio não suportado' });
        }
        const base64 = req.file.buffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
        const name = req.body.name || req.file.originalname || 'custom-sound';
        await supabase
            .from('users')
            .update({ custom_sound: JSON.stringify({ name, dataUrl, mime: req.file.mimetype }) })
            .eq('id', req.user.id);
        res.json({ ok: true, sound: { name, dataUrl } });
    } catch (e) {
        console.error('Upload sound error:', e.message);
        res.status(500).json({ error: 'Erro ao salvar som' });
    }
});

app.get('/api/user/alarm-sound', authMiddleware, async (req, res) => {
    const { data } = await supabase
        .from('users')
        .select('custom_sound')
        .eq('id', req.user.id)
        .single();
    let sound = null;
    try { sound = JSON.parse(data?.custom_sound || 'null'); } catch {}
    res.json({ sound });
});

app.delete('/api/user/alarm-sound', authMiddleware, async (req, res) => {
    await supabase
        .from('users')
        .update({ custom_sound: null })
        .eq('id', req.user.id);
    res.json({ ok: true });
});

// ==================== ADMIN ROUTES ====================

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    const { data: users } = await supabase
        .from('users')
        .select('id, username, email, is_admin, created_at, last_login, premium_until, premium_plan')
        .order('created_at', { ascending: false });

    for (const u of users || []) {
        const { data: payments } = await supabase
            .from('payments')
            .select('id, type, plan, amount, currency, status, created_at, confirmed_at')
            .eq('user_id', u.id)
            .order('created_at', { ascending: false });
        u.payments = payments || [];
        u.is_premium = u.premium_until && new Date(u.premium_until + 'Z') > new Date();
    }
    res.json({ users: users || [], total: (users || []).length });
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) return res.status(400).json({ error: 'Não pode deletar a si mesmo' });

    const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .eq('is_admin', 0)
        .single();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Get member IDs for cascade delete
    const { data: members } = await supabase
        .from('guild_members')
        .select('id')
        .eq('user_id', userId);

    if (members && members.length > 0) {
        const memberIds = members.map(m => m.id);
        await supabase.from('guild_event_signups').delete().in('member_id', memberIds);
    }

    await supabase.from('guild_members').delete().eq('user_id', userId);
    await supabase.from('payments').delete().eq('user_id', userId);
    await supabase.from('user_pins').delete().eq('user_id', userId);
    await supabase.from('user_items').delete().eq('user_id', userId);
    await supabase.from('password_resets').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);
    res.json({ ok: true });
});

// Premium payment management
app.post('/api/admin/users/:id/premium', authMiddleware, adminMiddleware, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { plan, amount, currency, notes } = req.body;
    if (!plan || !amount || !currency) return res.status(400).json({ error: 'Preencha plano, valor e moeda' });

    const { data: user } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('id', userId)
        .single();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const now = new Date();
    let premiumUntil;
    if (plan === 'year') {
        premiumUntil = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
        premiumUntil = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    await supabase.from('payments').insert({
        user_id: userId,
        type: 'premium',
        plan,
        amount,
        currency,
        status: 'confirmed',
        notes: notes || null,
        confirmed_at: new Date().toISOString(),
        confirmed_by: req.user.id
    });

    await supabase
        .from('users')
        .update({ premium_until: premiumUntil.toISOString().split('T')[0], premium_plan: plan })
        .eq('id', userId);

    // Send VIP activation email
    if (user.email) {
        sendEmail(user.email, '👑 VIP Ativado — MU Timer Dream', buildVipActivatedHtml(user.username, plan, premiumUntil)).catch(() => {});
    }

    res.json({ ok: true, premium_until: premiumUntil.toISOString().split('T')[0] });
});

app.delete('/api/admin/users/:id/premium', authMiddleware, adminMiddleware, async (req, res) => {
    const userId = parseInt(req.params.id);
    await supabase
        .from('users')
        .update({ premium_until: null, premium_plan: null })
        .eq('id', userId);
    res.json({ ok: true });
});

app.post('/api/admin/campaign', authMiddleware, adminMiddleware, async (req, res) => {
    const { subject, body, targetEmails } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'Assunto e corpo são obrigatórios' });

    let emails;
    if (targetEmails && targetEmails.length > 0) {
        emails = targetEmails;
    } else {
        const { data: users } = await supabase
            .from('users')
            .select('email')
            .not('email', 'like', '%@mudream.local');
        emails = (users || []).map(u => u.email);
    }

    if (emails.length === 0) return res.status(400).json({ error: 'Nenhum destinatário encontrado' });

    await supabase.from('campaigns').insert({
        subject,
        body,
        sent_by: req.user.id,
        recipients_count: emails.length
    });

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

app.get('/api/admin/campaigns', authMiddleware, adminMiddleware, async (req, res) => {
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*, users!campaigns_sent_by_fkey(username)')
        .order('sent_at', { ascending: false });

    const result = (campaigns || []).map(c => ({
        ...c,
        sent_by_name: c.users?.username || null,
        users: undefined
    }));
    res.json({ campaigns: result });
});

// ==================== ADMIN GUILDS ====================

app.get('/api/admin/guilds', authMiddleware, adminMiddleware, async (req, res) => {
    const { data: guilds } = await supabase
        .from('guilds')
        .select('*, users!guilds_master_id_fkey(username)')
        .order('created_at', { ascending: false });

    const result = [];
    for (const g of guilds || []) {
        const { data: members } = await supabase
            .from('guild_members')
            .select('id, char_name, role, joined_at, users(username)')
            .eq('guild_id', g.id)
            .order('role', { ascending: true })
            .order('joined_at', { ascending: true });

        const rolePriority = { master: 0, assistant: 1, party_assistant: 2, member: 3 };
        const sortedMembers = (members || []).map(m => ({
            id: m.id,
            char_name: m.char_name,
            role: m.role,
            joined_at: m.joined_at,
            username: m.users?.username
        })).sort((a, b) => (rolePriority[a.role] || 3) - (rolePriority[b.role] || 3));

        result.push({
            id: g.id,
            name: g.name,
            join_code: g.join_code,
            master_username: g.users?.username || '?',
            created_at: g.created_at,
            members: sortedMembers,
            member_count: sortedMembers.length
        });
    }

    res.json({ guilds: result, total: result.length });
});

// ==================== ADMIN DASHBOARD ====================

app.get('/api/admin/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel for speed
    const [
        usersResult,
        premiumResult,
        paymentsCountResult,
        eurResult,
        brlResult,
        campaignsResult,
        guildsResult,
        recentSignupsResult,
        recentPaymentsResult,
        maxUsers
    ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_admin', 0),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_admin', 0).not('premium_until', 'is', null).gte('premium_until', today),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
        supabase.from('payments').select('amount').eq('status', 'confirmed').eq('currency', 'EUR'),
        supabase.from('payments').select('amount').eq('status', 'confirmed').eq('currency', 'BRL'),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }),
        supabase.from('guilds').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_admin', 0).gte('created_at', sevenDaysAgo),
        supabase.from('payments').select('id, user_id, plan, amount, currency, status, created_at, confirmed_at, users!payments_user_id_fkey(username)').order('created_at', { ascending: false }).limit(10),
        getMaxUsers()
    ]);

    const totalUsers = usersResult.count || 0;
    const premiumUsers = premiumResult.count || 0;
    const freeUsers = totalUsers - premiumUsers;
    const slotsLeft = Math.max(0, maxUsers - totalUsers);
    const totalPayments = paymentsCountResult.count || 0;
    const revenueEur = (eurResult.data || []).reduce((sum, p) => sum + p.amount, 0);
    const revenueBrl = (brlResult.data || []).reduce((sum, p) => sum + p.amount, 0);
    const totalCampaigns = campaignsResult.count || 0;
    const totalGuilds = guildsResult.count || 0;
    const recentSignups = recentSignupsResult.count || 0;

    const recentPayments = (recentPaymentsResult.data || []).map(p => ({
        ...p,
        username: p.users?.username || '?',
        users: undefined
    }));

    res.json({
        totalUsers, premiumUsers, freeUsers, slotsLeft, maxUsers,
        totalPayments, revenueEur, revenueBrl,
        totalCampaigns, totalGuilds, recentSignups,
        recentPayments
    });
});

// ==================== ADMIN SETTINGS ====================

app.put('/api/admin/settings/max-users', authMiddleware, adminMiddleware, async (req, res) => {
    const { value } = req.body;
    const num = parseInt(value);
    if (!num || num < 1 || num > 10000) return res.status(400).json({ error: 'Valor inválido (1-10000)' });
    await supabase
        .from('settings')
        .update({ value: String(num) })
        .eq('key', 'max_users');
    res.json({ ok: true, maxUsers: num });
});

// ==================== CLEANUP EXPIRED TOKENS ====================

async function cleanupExpiredTokens() {
    const now = new Date().toISOString();
    await supabase
        .from('password_resets')
        .delete()
        .or(`expires_at.lt.${now},used.eq.1`);
}
cleanupExpiredTokens();
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

// ==================== FORGOT PASSWORD ====================

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Informe o email' });

    const { data: user } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('email', email.toLowerCase())
        .single();

    if (!user) return res.json({ ok: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await supabase
        .from('password_resets')
        .update({ used: 1 })
        .eq('user_id', user.id);

    await supabase.from('password_resets').insert({
        user_id: user.id,
        token,
        expires_at: expiresAt
    });

    const resetLink = `${APP_URL}/?reset=${token}`;
    sendEmail(user.email, '🔑 Redefinir senha — MU Timer Dream', buildResetPasswordHtml(user.username, resetLink)).catch(() => {});

    res.json({ ok: true });
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Dados incompletos' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });

    const now = new Date().toISOString();
    const { data: reset } = await supabase
        .from('password_resets')
        .select('*')
        .eq('token', token)
        .eq('used', 0)
        .gt('expires_at', now)
        .single();

    if (!reset) return res.status(400).json({ error: 'Link expirado ou inválido. Solicite um novo.' });

    const hash = bcrypt.hashSync(password, 10);
    await supabase.from('users').update({ password: hash }).eq('id', reset.user_id);
    await supabase.from('password_resets').update({ used: 1 }).eq('id', reset.id);

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

function buildVipActivatedHtml(username, plan, premiumUntil) {
    const safeUser = escapeHtml(username);
    const planLabel = plan === 'year' ? 'Anual' : 'Mensal';
    const dateFormatted = new Date(premiumUntil).toLocaleDateString('pt-BR');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a1a;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;padding:24px;background:linear-gradient(135deg,#1a1a35,#0d0d20);border-radius:12px 12px 0 0;">
            <h1 style="color:#f5a623;margin:0;font-size:26px;">⚔️ MU Timer Dream</h1>
            <p style="color:#8888aa;margin:6px 0 0;font-size:12px;">RAMPAGE X-20 • Event Notifier</p>
        </div>
        <div style="background:#1a1a35;padding:28px;border-radius:0 0 12px 12px;border:1px solid #2a2a4a;border-top:none;">
            <h2 style="color:#f5a623;margin:0 0 12px;">👑 VIP Ativado!</h2>
            <p style="color:#c0c0d0;font-size:14px;line-height:1.7;">Olá <strong style="color:#f5a623;">${safeUser}</strong>,</p>
            <p style="color:#c0c0d0;font-size:14px;line-height:1.7;">Seu plano <strong style="color:#f5a623;">VIP ${planLabel}</strong> foi ativado com sucesso!</p>
            <div style="background:#0d0d20;border:1px solid #f5a623;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="color:#e8e8f0;margin:0 0 8px;font-size:14px;">📋 <strong>Detalhes do plano:</strong></p>
                <p style="color:#c0c0d0;margin:4px 0;font-size:13px;">• Plano: VIP ${planLabel}</p>
                <p style="color:#c0c0d0;margin:4px 0;font-size:13px;">• Válido até: <strong style="color:#f5a623;">${dateFormatted}</strong></p>
            </div>
            <p style="color:#c0c0d0;font-size:14px;line-height:1.7;">Benefícios VIP:</p>
            <ul style="color:#c0c0d0;font-size:14px;line-height:2;">
                <li>👑 Badge exclusivo VIP</li>
                <li>⏰ Alarmes ilimitados</li>
                <li>🤖 MUCHAT sem limites</li>
                <li>⚔️ Prioridade no suporte</li>
            </ul>
            <div style="text-align:center;margin-top:24px;">
                <a href="${APP_URL}" style="display:inline-block;background:#f5a623;color:#0a0a1a;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">ACESSAR O APP</a>
            </div>
        </div>
        <p style="text-align:center;color:#555577;font-size:11px;margin-top:16px;">MU Timer Dream — mutimerdream.com</p>
    </div></body></html>`;
}

function buildDonationThankYouHtml(username, amount, currency, method) {
    const safeUser = escapeHtml(username);
    const methodLabel = method === 'pix' ? 'PIX' : 'Revolut';
    const currencySymbol = currency === 'BRL' ? 'R$' : '€';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a1a;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;padding:24px;background:linear-gradient(135deg,#1a1a35,#0d0d20);border-radius:12px 12px 0 0;">
            <h1 style="color:#f5a623;margin:0;font-size:26px;">⚔️ MU Timer Dream</h1>
            <p style="color:#8888aa;margin:6px 0 0;font-size:12px;">RAMPAGE X-20 • Event Notifier</p>
        </div>
        <div style="background:#1a1a35;padding:28px;border-radius:0 0 12px 12px;border:1px solid #2a2a4a;border-top:none;">
            <h2 style="color:#f5a623;margin:0 0 12px;">💛 Obrigado pela doação!</h2>
            <p style="color:#c0c0d0;font-size:14px;line-height:1.7;">Olá <strong style="color:#f5a623;">${safeUser}</strong>,</p>
            <p style="color:#c0c0d0;font-size:14px;line-height:1.7;">Recebemos sua doação e agradecemos imensamente pelo apoio!</p>
            <div style="background:#0d0d20;border:1px solid #f5a623;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="color:#e8e8f0;margin:0 0 8px;font-size:14px;">📋 <strong>Comprovante:</strong></p>
                <p style="color:#c0c0d0;margin:4px 0;font-size:13px;">• Valor: <strong style="color:#f5a623;">${currencySymbol} ${amount}</strong></p>
                <p style="color:#c0c0d0;margin:4px 0;font-size:13px;">• Método: ${methodLabel}</p>
                <p style="color:#c0c0d0;margin:4px 0;font-size:13px;">• Data: ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            <p style="color:#c0c0d0;font-size:14px;line-height:1.7;">Sua contribuição nos ajuda a manter o servidor e criar novas funcionalidades. Muito obrigado! 🙏</p>
            <div style="text-align:center;margin-top:24px;">
                <a href="${APP_URL}" style="display:inline-block;background:#f5a623;color:#0a0a1a;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">VOLTAR AO APP</a>
            </div>
        </div>
        <p style="text-align:center;color:#555577;font-size:11px;margin-top:16px;">MU Timer Dream — mutimerdream.com</p>
    </div></body></html>`;
}

// ==================== PIN SECURITY ====================

app.get('/api/auth/pin-status', authMiddleware, async (req, res) => {
    const { data: pin } = await supabase
        .from('user_pins')
        .select('enabled')
        .eq('user_id', req.user.id)
        .single();
    res.json({ hasPin: !!pin, enabled: pin ? !!pin.enabled : false });
});

app.post('/api/auth/pin-set', authMiddleware, async (req, res) => {
    const { pin, currentPassword } = req.body;
    if (!pin || !currentPassword) return res.status(400).json({ error: 'PIN e senha são obrigatórios' });
    if (!/^\d{6}$/.test(pin)) return res.status(400).json({ error: 'PIN deve ter exatamente 6 dígitos numéricos' });

    const { data: user } = await supabase
        .from('users')
        .select('password')
        .eq('id', req.user.id)
        .single();
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(401).json({ error: 'Senha incorreta' });
    }

    const pinHash = bcrypt.hashSync(pin, 10);
    await supabase.from('user_pins').upsert({
        user_id: req.user.id,
        pin_hash: pinHash,
        enabled: 1
    }, { onConflict: 'user_id' });
    res.json({ ok: true });
});

app.post('/api/auth/pin-disable', authMiddleware, async (req, res) => {
    const { currentPassword } = req.body;
    if (!currentPassword) return res.status(400).json({ error: 'Senha é obrigatória' });

    const { data: user } = await supabase
        .from('users')
        .select('password')
        .eq('id', req.user.id)
        .single();
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(401).json({ error: 'Senha incorreta' });
    }

    await supabase.from('user_pins').delete().eq('user_id', req.user.id);
    res.json({ ok: true });
});

app.post('/api/auth/pin-verify', authMiddleware, async (req, res) => {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN é obrigatório' });

    const { data: stored } = await supabase
        .from('user_pins')
        .select('pin_hash')
        .eq('user_id', req.user.id)
        .eq('enabled', 1)
        .single();
    if (!stored) return res.status(400).json({ error: 'PIN não configurado' });

    if (!bcrypt.compareSync(pin, stored.pin_hash)) {
        return res.status(401).json({ error: 'PIN incorreto' });
    }

    const pinToken = jwt.sign({ id: req.user.id, pinVerified: true }, JWT_SECRET, { expiresIn: '15m' });
    res.cookie('pin_token', pinToken, cookieOpts(15 * 60 * 1000));
    res.json({ ok: true });
});

async function pinMiddleware(req, res, next) {
    const { data: pinRecord } = await supabase
        .from('user_pins')
        .select('enabled')
        .eq('user_id', req.user.id)
        .eq('enabled', 1)
        .single();
    if (!pinRecord) return next();

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

app.post('/api/guild/create', authMiddleware, async (req, res) => {
    const { name, charName } = req.body;
    if (!name || !charName) return res.status(400).json({ error: 'Nome da guild e nick são obrigatórios' });
    if (name.length < 2 || name.length > 30) return res.status(400).json({ error: 'Nome da guild deve ter 2-30 caracteres' });

    const { data: existing } = await supabase
        .from('guild_members')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
    if (existing) return res.status(400).json({ error: 'Você já está em uma guild' });

    try {
        const joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        const { data: guild, error } = await supabase
            .from('guilds')
            .insert({ name, master_id: req.user.id, join_code: joinCode })
            .select('id')
            .single();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Nome de guild já existe' });
            throw error;
        }

        await supabase.from('guild_members').insert({
            guild_id: guild.id,
            user_id: req.user.id,
            char_name: charName,
            role: 'master'
        });

        res.json({ ok: true, guild: { id: guild.id, name, joinCode } });
    } catch (e) {
        console.error('Guild create error:', e.message);
        res.status(500).json({ error: 'Erro ao criar guild' });
    }
});

app.post('/api/guild/add-member', authMiddleware, async (req, res) => {
    const { username, charName } = req.body;
    if (!username || !charName) return res.status(400).json({ error: 'Usuário e nick são obrigatórios' });

    const { data: myMember } = await supabase
        .from('guild_members')
        .select('*, guilds!inner(id)')
        .eq('user_id', req.user.id)
        .single();
    if (!myMember || !isGuildLeader(myMember)) return res.status(403).json({ error: 'Apenas o mestre ou assistente pode adicionar membros' });

    const { data: targetUser } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', username)
        .single();
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado no sistema' });

    const { data: alreadyInGuild } = await supabase
        .from('guild_members')
        .select('id')
        .eq('user_id', targetUser.id)
        .single();
    if (alreadyInGuild) return res.status(400).json({ error: 'Este usuário já está em uma guild' });

    try {
        await supabase.from('guild_members').insert({
            guild_id: myMember.guild_id,
            user_id: targetUser.id,
            char_name: charName,
            role: 'member'
        });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao adicionar membro' });
    }
});

app.post('/api/guild/set-role', authMiddleware, async (req, res) => {
    const { memberId, role } = req.body;
    if (!memberId || !role) return res.status(400).json({ error: 'Dados incompletos' });
    if (!['member', 'assistant', 'party_assistant'].includes(role)) return res.status(400).json({ error: 'Cargo inválido' });

    const { data: myMember } = await supabase
        .from('guild_members')
        .select('*, guilds!inner(master_id)')
        .eq('user_id', req.user.id)
        .single();
    if (!myMember) return res.status(403).json({ error: 'Você não está em uma guild' });

    const isMaster = myMember.role === 'master';
    const isAssistant = myMember.role === 'assistant';

    if (role === 'assistant' && !isMaster) return res.status(403).json({ error: 'Apenas o mestre pode promover a assistente' });
    if (!isMaster && !isAssistant) return res.status(403).json({ error: 'Apenas o mestre ou assistente pode alterar cargos' });

    const { data: target } = await supabase
        .from('guild_members')
        .select('*')
        .eq('id', memberId)
        .eq('guild_id', myMember.guild_id)
        .single();
    if (!target) return res.status(404).json({ error: 'Membro não encontrado' });
    if (target.role === 'master') return res.status(400).json({ error: 'Não pode alterar o cargo do mestre' });
    if (target.role === 'assistant' && !isMaster) return res.status(403).json({ error: 'Apenas o mestre pode alterar o cargo de assistentes' });

    await supabase.from('guild_members').update({ role }).eq('id', memberId);
    res.json({ ok: true });
});

app.get('/api/guild/my', authMiddleware, pinMiddleware, async (req, res) => {
    const { data: member } = await supabase
        .from('guild_members')
        .select('*, guilds(name, join_code, master_id, created_at)')
        .eq('user_id', req.user.id)
        .single();

    if (!member) {
        // User has no guild — return their pending join requests
        const { data: pendingReqs } = await supabase
            .from('guild_join_requests')
            .select('id, guild_id, char_name, status, created_at, guilds(name)')
            .eq('user_id', req.user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        const pendingRequests = (pendingReqs || []).map(r => ({
            id: r.id,
            guild_id: r.guild_id,
            guild_name: r.guilds?.name,
            char_name: r.char_name,
            status: r.status,
            created_at: r.created_at
        }));

        return res.json({ guild: null, pendingRequests });
    }

    const { data: members } = await supabase
        .from('guild_members')
        .select('id, char_name, role, joined_at, users(username)')
        .eq('guild_id', member.guild_id)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });

    const formattedMembers = (members || []).map(m => ({
        id: m.id,
        char_name: m.char_name,
        role: m.role,
        joined_at: m.joined_at,
        username: m.users?.username
    }));

    // Sort by role priority
    const rolePriority = { master: 0, assistant: 1, party_assistant: 2, member: 3 };
    formattedMembers.sort((a, b) => (rolePriority[a.role] || 3) - (rolePriority[b.role] || 3));

    // If user is a guild leader, include pending requests count
    let pendingRequestsCount = 0;
    if (isGuildLeader(member)) {
        const { count } = await supabase
            .from('guild_join_requests')
            .select('*', { count: 'exact', head: true })
            .eq('guild_id', member.guild_id)
            .eq('status', 'pending');
        pendingRequestsCount = count || 0;
    }

    res.json({
        guild: {
            id: member.guild_id,
            name: member.guilds.name,
            join_code: member.guilds.join_code,
            master_id: member.guilds.master_id,
            created_at: member.guilds.created_at
        },
        member: { id: member.id, char_name: member.char_name, role: member.role },
        members: formattedMembers,
        pendingRequestsCount
    });
});

app.post('/api/guild/leave', authMiddleware, async (req, res) => {
    const { data: member } = await supabase
        .from('guild_members')
        .select('*, guilds!inner(master_id)')
        .eq('user_id', req.user.id)
        .single();
    if (!member) return res.status(404).json({ error: 'Você não está em uma guild' });

    if (member.guilds.master_id === req.user.id) {
        const { count: memberCount } = await supabase
            .from('guild_members')
            .select('*', { count: 'exact', head: true })
            .eq('guild_id', member.guild_id);
        if (memberCount > 1) return res.status(400).json({ error: 'Transfira a liderança antes de sair ou remova todos os membros' });
        await supabase.from('guild_event_signups').delete().eq('guild_id', member.guild_id);
        await supabase.from('guild_members').delete().eq('guild_id', member.guild_id);
        await supabase.from('guilds').delete().eq('id', member.guild_id);
    } else {
        await supabase.from('guild_event_signups').delete().eq('member_id', member.id);
        await supabase.from('guild_members').delete().eq('id', member.id);
    }
    res.json({ ok: true });
});

// Admin: delete any guild
app.delete('/api/admin/guild/:id', authMiddleware, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Acesso negado' });
    const guildId = parseInt(req.params.id);
    try {
        await supabase.from('guild_event_signups').delete().eq('guild_id', guildId);
        await supabase.from('guild_members').delete().eq('guild_id', guildId);
        await supabase.from('guilds').delete().eq('id', guildId);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/guild/members/:id', authMiddleware, async (req, res) => {
    const memberId = parseInt(req.params.id);
    const { data: myMember } = await supabase
        .from('guild_members')
        .select('*, guilds!inner(master_id)')
        .eq('user_id', req.user.id)
        .single();
    if (!myMember || !isGuildLeader(myMember)) return res.status(403).json({ error: 'Apenas o mestre ou assistente pode remover membros' });

    const { data: target } = await supabase
        .from('guild_members')
        .select('*')
        .eq('id', memberId)
        .eq('guild_id', myMember.guild_id)
        .single();
    if (!target) return res.status(404).json({ error: 'Membro não encontrado' });
    if (target.role === 'master') return res.status(400).json({ error: 'Não pode remover o mestre' });
    if (target.role === 'assistant' && myMember.role !== 'master') return res.status(403).json({ error: 'Apenas o mestre pode remover assistentes' });
    if (target.role === 'party_assistant' && myMember.role === 'party_assistant') return res.status(403).json({ error: 'Assistente de party não pode remover outro assistente de party' });

    await supabase.from('guild_event_signups').delete().eq('member_id', memberId);
    await supabase.from('guild_members').delete().eq('id', memberId);
    res.json({ ok: true });
});

app.post('/api/guild/events/signup', authMiddleware, async (req, res) => {
    const { eventId, eventDate } = req.body;
    if (!eventId || !eventDate) return res.status(400).json({ error: 'Dados incompletos' });

    const { data: member } = await supabase
        .from('guild_members')
        .select('*')
        .eq('user_id', req.user.id)
        .single();
    if (!member) return res.status(404).json({ error: 'Você não está em uma guild' });

    try {
        await supabase.from('guild_event_signups').upsert({
            guild_id: member.guild_id,
            member_id: member.id,
            event_id: eventId,
            event_date: eventDate,
            status: 'going'
        }, { onConflict: 'guild_id,member_id,event_id,event_date' });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao inscrever' });
    }
});

app.delete('/api/guild/events/signup', authMiddleware, async (req, res) => {
    const { eventId, eventDate } = req.body;
    const { data: member } = await supabase
        .from('guild_members')
        .select('*')
        .eq('user_id', req.user.id)
        .single();
    if (!member) return res.status(404).json({ error: 'Você não está em uma guild' });

    await supabase
        .from('guild_event_signups')
        .delete()
        .eq('guild_id', member.guild_id)
        .eq('member_id', member.id)
        .eq('event_id', eventId)
        .eq('event_date', eventDate);
    res.json({ ok: true });
});

app.get('/api/guild/events/signups', authMiddleware, async (req, res) => {
    const { data: member } = await supabase
        .from('guild_members')
        .select('*')
        .eq('user_id', req.user.id)
        .single();
    if (!member) return res.status(404).json({ error: 'Você não está em uma guild' });

    const { data: signups } = await supabase
        .from('guild_event_signups')
        .select('*, guild_members(char_name, users(username))')
        .eq('guild_id', member.guild_id)
        .order('event_date', { ascending: false });

    const formatted = (signups || []).map(s => ({
        ...s,
        char_name: s.guild_members?.char_name,
        username: s.guild_members?.users?.username,
        guild_members: undefined
    }));

    res.json({ signups: formatted, myMemberId: member.id });
});

app.get('/api/guild/events/report', authMiddleware, async (req, res) => {
    const { data: member } = await supabase
        .from('guild_members')
        .select('*, guilds!inner(master_id)')
        .eq('user_id', req.user.id)
        .single();
    if (!member || !isGuildLeader(member)) return res.status(403).json({ error: 'Apenas o mestre ou assistente pode ver relatórios' });

    const { data: report } = await supabase
        .from('guild_event_signups')
        .select('event_id, event_date, signed_at, guild_members(char_name, users(username))')
        .eq('guild_id', member.guild_id)
        .order('event_date', { ascending: false });

    const formatted = (report || []).map(r => ({
        event_id: r.event_id,
        event_date: r.event_date,
        signed_at: r.signed_at,
        char_name: r.guild_members?.char_name,
        username: r.guild_members?.users?.username
    }));

    res.json({ report: formatted });
});

// ==================== GUILD JOIN REQUEST ROUTES ====================

app.get('/api/guild/search', authMiddleware, async (req, res) => {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.status(400).json({ error: 'Digite pelo menos 2 caracteres' });

    // User must NOT be in a guild already
    const { data: existing } = await supabase
        .from('guild_members')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
    if (existing) return res.status(400).json({ error: 'Você já está em uma guild' });

    try {
        const { data: guilds } = await supabase
            .from('guilds')
            .select('id, name, guild_members(count)')
            .ilike('name', `%${q}%`)
            .limit(10);

        const results = (guilds || []).map(g => ({
            id: g.id,
            name: g.name,
            member_count: g.guild_members?.[0]?.count || 0
        }));

        res.json({ guilds: results });
    } catch (e) {
        console.error('Guild search error:', e.message);
        res.status(500).json({ error: 'Erro ao buscar guilds' });
    }
});

app.post('/api/guild/join-request', authMiddleware, async (req, res) => {
    const { guildId, charName } = req.body;
    if (!guildId || !charName) return res.status(400).json({ error: 'Guild e nick são obrigatórios' });
    if (charName.length < 1 || charName.length > 20) return res.status(400).json({ error: 'Nick deve ter 1-20 caracteres' });

    // User must not be in a guild
    const { data: existing } = await supabase
        .from('guild_members')
        .select('id')
        .eq('user_id', req.user.id)
        .single();
    if (existing) return res.status(400).json({ error: 'Você já está em uma guild' });

    // Guild must exist
    const { data: guild } = await supabase
        .from('guilds')
        .select('id')
        .eq('id', guildId)
        .single();
    if (!guild) return res.status(404).json({ error: 'Guild não encontrada' });

    // No existing pending request for this guild
    const { data: pendingReq } = await supabase
        .from('guild_join_requests')
        .select('id')
        .eq('guild_id', guildId)
        .eq('user_id', req.user.id)
        .eq('status', 'pending')
        .single();
    if (pendingReq) return res.status(400).json({ error: 'Você já tem uma solicitação pendente para esta guild' });

    try {
        const { error } = await supabase.from('guild_join_requests').insert({
            guild_id: guildId,
            user_id: req.user.id,
            char_name: charName,
            status: 'pending'
        });
        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Solicitação já enviada para esta guild' });
            throw error;
        }
        res.json({ ok: true });
    } catch (e) {
        console.error('Join request error:', e.message);
        res.status(500).json({ error: 'Erro ao enviar solicitação' });
    }
});

app.get('/api/guild/join-requests', authMiddleware, async (req, res) => {
    const { data: myMember } = await supabase
        .from('guild_members')
        .select('*, guilds!inner(master_id)')
        .eq('user_id', req.user.id)
        .single();
    if (!myMember || !isGuildLeader(myMember)) return res.status(403).json({ error: 'Apenas líderes podem ver solicitações' });

    const { data: requests } = await supabase
        .from('guild_join_requests')
        .select('id, user_id, char_name, status, created_at, users(username)')
        .eq('guild_id', myMember.guild_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    const formatted = (requests || []).map(r => ({
        id: r.id,
        user_id: r.user_id,
        char_name: r.char_name,
        status: r.status,
        created_at: r.created_at,
        username: r.users?.username
    }));

    res.json({ requests: formatted });
});

app.post('/api/guild/join-request/:id/accept', authMiddleware, async (req, res) => {
    const requestId = parseInt(req.params.id);

    const { data: myMember } = await supabase
        .from('guild_members')
        .select('*, guilds!inner(master_id)')
        .eq('user_id', req.user.id)
        .single();
    if (!myMember || !isGuildLeader(myMember)) return res.status(403).json({ error: 'Apenas líderes podem aceitar solicitações' });

    const { data: request } = await supabase
        .from('guild_join_requests')
        .select('*')
        .eq('id', requestId)
        .eq('guild_id', myMember.guild_id)
        .eq('status', 'pending')
        .single();
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada ou já processada' });

    // Check if user is already in another guild
    const { data: alreadyInGuild } = await supabase
        .from('guild_members')
        .select('id')
        .eq('user_id', request.user_id)
        .single();
    if (alreadyInGuild) return res.status(400).json({ error: 'Usuário já está em outra guild' });

    try {
        // Add user to guild
        await supabase.from('guild_members').insert({
            guild_id: myMember.guild_id,
            user_id: request.user_id,
            char_name: request.char_name,
            role: 'member'
        });

        // Update this request to accepted
        await supabase.from('guild_join_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId);

        // Delete all other pending requests from this user
        await supabase.from('guild_join_requests')
            .delete()
            .eq('user_id', request.user_id)
            .eq('status', 'pending');

        res.json({ ok: true });
    } catch (e) {
        console.error('Accept join request error:', e.message);
        res.status(500).json({ error: 'Erro ao aceitar solicitação' });
    }
});

app.post('/api/guild/join-request/:id/reject', authMiddleware, async (req, res) => {
    const requestId = parseInt(req.params.id);

    const { data: myMember } = await supabase
        .from('guild_members')
        .select('*, guilds!inner(master_id)')
        .eq('user_id', req.user.id)
        .single();
    if (!myMember || !isGuildLeader(myMember)) return res.status(403).json({ error: 'Apenas líderes podem rejeitar solicitações' });

    const { data: request } = await supabase
        .from('guild_join_requests')
        .select('id')
        .eq('id', requestId)
        .eq('guild_id', myMember.guild_id)
        .eq('status', 'pending')
        .single();
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada ou já processada' });

    await supabase.from('guild_join_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

    res.json({ ok: true });
});

// ==================== COLLECTION ROUTES ====================

app.get('/api/collection', authMiddleware, async (req, res) => {
    const { data: items } = await supabase
        .from('user_items')
        .select('item_id, obtained, obtained_at, adds')
        .eq('user_id', req.user.id);
    res.json({ items: (items || []).map(i => ({ ...i, obtained: i.obtained === 1, adds: JSON.parse(i.adds || '[]') })) });
});

app.post('/api/collection/toggle', authMiddleware, async (req, res) => {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'Item inválido' });

    const { data: existing } = await supabase
        .from('user_items')
        .select('id, obtained, adds')
        .eq('user_id', req.user.id)
        .eq('item_id', itemId)
        .single();

    if (existing) {
        if (existing.obtained === 1) {
            const hasAdds = existing.adds && existing.adds !== '[]' && existing.adds !== '';
            if (hasAdds) {
                await supabase.from('user_items').update({ obtained: 0, obtained_at: null }).eq('id', existing.id);
            } else {
                await supabase.from('user_items').delete().eq('id', existing.id);
            }
            res.json({ ok: true, obtained: false });
        } else {
            await supabase.from('user_items').update({ obtained: 1, obtained_at: new Date().toISOString() }).eq('id', existing.id);
            res.json({ ok: true, obtained: true });
        }
    } else {
        await supabase.from('user_items').insert({ user_id: req.user.id, item_id: itemId, obtained: 1 });
        res.json({ ok: true, obtained: true });
    }
});

app.put('/api/collection/adds', authMiddleware, async (req, res) => {
    const { itemId, adds } = req.body;
    if (!itemId) return res.status(400).json({ error: 'Item inválido' });
    const validAdds = ['luck', 'skill', 'additional', 'life', 'mana', 'zen'];
    const filtered = (adds || []).filter(a => validAdds.includes(a));

    const { data: existing } = await supabase
        .from('user_items')
        .select('id, obtained')
        .eq('user_id', req.user.id)
        .eq('item_id', itemId)
        .single();

    if (existing) {
        if (filtered.length === 0 && existing.obtained === 0) {
            await supabase.from('user_items').delete().eq('id', existing.id);
        } else {
            await supabase.from('user_items').update({ adds: JSON.stringify(filtered) }).eq('id', existing.id);
        }
    } else {
        if (filtered.length > 0) {
            await supabase.from('user_items').insert({
                user_id: req.user.id,
                item_id: itemId,
                obtained: 0,
                obtained_at: null,
                adds: JSON.stringify(filtered)
            });
        }
    }
    res.json({ ok: true, adds: filtered });
});

app.get('/api/collection/:username', async (req, res) => {
    const { data: user } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', req.params.username)
        .single();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { data: items } = await supabase
        .from('user_items')
        .select('item_id, obtained, obtained_at, adds')
        .eq('user_id', user.id);
    res.json({ username: user.username, items: (items || []).map(i => ({ ...i, obtained: i.obtained === 1, adds: JSON.parse(i.adds || '[]') })) });
});

// Guild collections overview — all members' collection summaries
app.get('/api/guild/collections', authMiddleware, async (req, res) => {
    try {
        const { data: myMember } = await supabase
            .from('guild_members')
            .select('guild_id')
            .eq('user_id', req.user.id)
            .single();
        if (!myMember) return res.status(403).json({ error: 'Você não está em uma guild' });

        const { data: members } = await supabase
            .from('guild_members')
            .select('user_id, char_name, role')
            .eq('guild_id', myMember.guild_id);

        const userIds = members.map(m => m.user_id);
        const { data: allItems } = await supabase
            .from('user_items')
            .select('user_id, item_id, obtained, adds')
            .in('user_id', userIds)
            .eq('obtained', 1);

        // Get usernames
        const { data: users } = await supabase
            .from('users')
            .select('id, username')
            .in('id', userIds);
        const userMap = {};
        (users || []).forEach(u => { userMap[u.id] = u.username; });

        // Build per-member summaries
        const itemsByUser = {};
        (allItems || []).forEach(i => {
            if (!itemsByUser[i.user_id]) itemsByUser[i.user_id] = [];
            itemsByUser[i.user_id].push({ item_id: i.item_id, adds: JSON.parse(i.adds || '[]') });
        });

        const summaries = members.map(m => ({
            username: userMap[m.user_id] || '',
            char_name: m.char_name,
            role: m.role,
            obtained: (itemsByUser[m.user_id] || []).length,
            items: (itemsByUser[m.user_id] || [])
        }));

        // Sort: most items first
        summaries.sort((a, b) => b.obtained - a.obtained);
        res.json({ summaries });
    } catch (e) {
        console.error('Guild collections error:', e.message);
        res.status(500).json({ error: 'Erro ao buscar coleções' });
    }
});

app.get('/api/guild/collection/:username', authMiddleware, async (req, res) => {
    const { data: myMember } = await supabase
        .from('guild_members')
        .select('guild_id')
        .eq('user_id', req.user.id)
        .single();
    if (!myMember) return res.status(403).json({ error: 'Você não está em uma guild' });

    const { data: targetUser } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', req.params.username)
        .single();
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { data: targetMember } = await supabase
        .from('guild_members')
        .select('guild_id')
        .eq('user_id', targetUser.id)
        .single();
    if (!targetMember || targetMember.guild_id !== myMember.guild_id) {
        return res.status(403).json({ error: 'Este usuário não é da sua guild' });
    }

    const { data: items } = await supabase
        .from('user_items')
        .select('item_id, obtained, obtained_at, adds')
        .eq('user_id', targetUser.id);
    res.json({ username: targetUser.username, items: (items || []).map(i => ({ ...i, obtained: i.obtained === 1, adds: JSON.parse(i.adds || '[]') })) });
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

// Admin confirms a donation and sends thank-you email
app.post('/api/admin/users/:id/donation', authMiddleware, adminMiddleware, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { amount, currency, method, notes } = req.body;
    if (!amount || !currency) return res.status(400).json({ error: 'Preencha valor e moeda' });

    const { data: user } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('id', userId)
        .single();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    await supabase.from('payments').insert({
        user_id: userId,
        type: 'donation',
        plan: null,
        amount: parseFloat(amount),
        currency,
        status: 'confirmed',
        notes: notes || null,
        confirmed_at: new Date().toISOString(),
        confirmed_by: req.user.id
    });

    // Send thank-you email
    if (user.email) {
        sendEmail(user.email, '💛 Obrigado pela doação — MU Timer Dream', buildDonationThankYouHtml(user.username, amount, currency, method || 'pix')).catch(() => {});
    }

    res.json({ ok: true });
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
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

if (!IS_VERCEL) {
    app.listen(PORT, () => {
        console.log(`⚔️ MU Timer Dream rodando na porta ${PORT} [${IS_PROD ? 'PRODUCTION' : 'DEV'}]`);
    });
}

module.exports = app;
