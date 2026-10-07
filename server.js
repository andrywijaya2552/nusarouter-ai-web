const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Model Pricing Config (Biaya Saldo per pesan per model)
const MODEL_PRICING = {
  'deepseek-flash-v4.1': { name: 'DeepSeek Flash V4.1', price: 200, tier: 'Hemat' },
  'glm-5.3-flash': { name: 'GLM 5.3 Flash', price: 250, tier: 'Hemat' },
  'qwen3.8-omni-flash': { name: 'Qwen 3.8 Omni Flash', price: 300, tier: 'Hemat' },
  'gemini-3.7-flash-high': { name: 'Gemini 3.7 Flash High', price: 500, tier: 'Standar' },
  'kimi-k2.7-code': { name: 'Kimi K2.7 Code', price: 600, tier: 'Spesialis' },
  'glm-5.2': { name: 'GLM 5.2 Reasoning', price: 650, tier: 'Standar' },
  'deepseek-v4.1-flash-Jailbreak': { name: 'DeepSeek Flash Jailbreak', price: 750, tier: 'Uncensored' },
  'gpt-5.6-luna': { name: 'GPT 5.6 Luna', price: 900, tier: 'Premium' },
  'gpt-5.6-terra': { name: 'GPT 5.6 Terra', price: 1200, tier: 'Premium' },
  'claude-sonnet-4.6': { name: 'Claude Sonnet 4.6', price: 1500, tier: 'Ultra' }
};

// Inisialisasi Database JSON Lokal
function getDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      users: [
        {
          id: 'u1',
          username: 'demo_user',
          password: '123',
          balance: 15000,
          chats: []
        },
        {
          id: 'admin_1',
          username: process.env.ADMIN_USERNAME || 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin123',
          role: 'admin',
          balance: 999999,
          chats: []
        }
      ],
      topups: [
        {
          id: 'TOPUP-1001',
          userId: 'u1',
          username: 'demo_user',
          amount: 25000,
          senderName: 'Budi Santoso',
          paymentMethod: 'BCA Transfer',
          refNumber: 'TRX-9821739',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ],
      settings: {
        costPerChat: 500,
        modelPricing: MODEL_PRICING,
        apiKey: process.env.NUSAROUTER_API_KEY || '',
        baseUrl: process.env.NUSAROUTER_BASE_URL || 'https://api.nusarouter.web.id/v1',
        defaultModel: 'deepseek-flash-v4.1',
        bankInfo: '💳 BCA: 1234-5678-90 a/n NusaAI\n📱 QRIS/DANA/GoPay: 0812-3456-7890'
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!db.settings.modelPricing) {
    db.settings.modelPricing = MODEL_PRICING;
    saveDB(db);
  }
  return db;
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* ==================== AUTH APIS ==================== */
// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi!' });
  }

  const db = getDB();
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Username sudah digunakan!' });
  }

  const newUser = {
    id: 'u_' + Date.now(),
    username,
    password,
    role: 'user',
    balance: 5000, // Bonus saldo pendaftaran Rp 5.000
    chats: []
  };

  db.users.push(newUser);
  saveDB(db);

  res.json({
    success: true,
    message: 'Pendaftaran berhasil! Saldo bonus awal Rp 5.000',
    user: { id: newUser.id, username: newUser.username, role: newUser.role, balance: newUser.balance }
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDB();

  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Username atau password salah!' });
  }

  res.json({
    success: true,
    message: 'Login berhasil!',
    user: { id: user.id, username: user.username, role: user.role || 'user', balance: user.balance }
  });
});

// User Profile & Balance
app.get('/api/user/:id', (req, res) => {
  const db = getDB();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

  res.json({
    success: true,
    user: { id: user.id, username: user.username, role: user.role || 'user', balance: user.balance }
  });
});

/* ==================== AI CHAT (NUSAROUTER API) ==================== */
app.post('/api/chat', async (req, res) => {
  const { userId, message, history, model } = req.body;
  const db = getDB();

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ success: false, message: 'User tidak terautentikasi' });

  const selectedModel = model || db.settings.defaultModel || 'deepseek-flash-v4.1';
  const pricingConfig = db.settings.modelPricing?.[selectedModel] || { price: db.settings.costPerChat || 500 };
  const cost = pricingConfig.price;

  if (user.role !== 'admin' && user.balance < cost) {
    return res.status(402).json({
      success: false,
      message: `Saldo tidak mencukupi! Model ${selectedModel} membutuhkan saldo Rp ${cost.toLocaleString()} per pesan. Silakan lakukan Top Up.`
    });
  }

  const apiKey = db.settings.apiKey || process.env.NUSAROUTER_API_KEY;
  const baseUrl = db.settings.baseUrl || 'https://api.nusarouter.web.id/v1';

  const messagesPayload = [
    { role: 'system', content: 'Anda adalah AI Assistant profesional, cerdas, ramah, dan siap membantu dalam berbagai kebutuhan coding, penulisan, analisis, dan ide kreatif.' },
    ...(history || []),
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messagesPayload,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('NusaRouter API Error:', errBody);
      // Fallback jika API key belum diset atau error
      return res.status(response.status).json({
        success: false,
        message: 'Gagal menghubungi NusaRouter API. Pastikan API Key di halaman Admin sudah valid.',
        errorDetail: errBody
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Maaf, tidak ada respon dari AI.';

    // Potong Saldo User jika bukan admin
    if (user.role !== 'admin') {
      user.balance -= cost;
      saveDB(db);
    }

    res.json({
      success: true,
      reply,
      cost,
      newBalance: user.balance,
      modelUsed: selectedModel
    });

  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan koneksi server ke NusaRouter API: ' + error.message
    });
  }
});

/* ==================== MANUAL TOP UP APIS ==================== */
// Submit Permintaan Topup
app.post('/api/topup/request', (req, res) => {
  const { userId, amount, senderName, paymentMethod, refNumber } = req.body;
  if (!userId || !amount || !senderName || !refNumber) {
    return res.status(400).json({ success: false, message: 'Semua kolom bukti top up wajib diisi!' });
  }

  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

  const newTopup = {
    id: 'TOPUP-' + Math.floor(100000 + Math.random() * 900000),
    userId: user.id,
    username: user.username,
    amount: parseInt(amount),
    senderName,
    paymentMethod: paymentMethod || 'Bank / E-Wallet',
    refNumber,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.topups.unshift(newTopup);
  saveDB(db);

  res.json({
    success: true,
    message: 'Pengajuan Top Up berhasil dikirim! Menunggu konfirmasi admin.',
    topup: newTopup
  });
});

// User Topup History
app.get('/api/topup/history/:userId', (req, res) => {
  const db = getDB();
  const history = db.topups.filter(t => t.userId === req.params.userId);
  res.json({ success: true, history });
});

// Public Settings (Payment Info & Pricing)
app.get('/api/settings/public', (req, res) => {
  const db = getDB();
  res.json({
    success: true,
    costPerChat: db.settings.costPerChat,
    modelPricing: db.settings.modelPricing || MODEL_PRICING,
    bankInfo: db.settings.bankInfo,
    defaultModel: db.settings.defaultModel
  });
});

/* ==================== ADMIN APIS ==================== */
// Get All Data for Admin Dashboard
app.get('/api/admin/dashboard', (req, res) => {
  const db = getDB();
  res.json({
    success: true,
    users: db.users.map(u => ({ id: u.id, username: u.username, role: u.role || 'user', balance: u.balance })),
    topups: db.topups,
    settings: db.settings
  });
});

// Approve Topup
app.post('/api/admin/topup/approve', (req, res) => {
  const { topupId } = req.body;
  const db = getDB();

  const item = db.topups.find(t => t.id === topupId);
  if (!item) return res.status(404).json({ success: false, message: 'Data topup tidak ditemukan' });
  if (item.status !== 'pending') return res.status(400).json({ success: false, message: 'Topup sudah diproses sebelumnya' });

  item.status = 'approved';
  item.approvedAt = new Date().toISOString();

  // Tambah Saldo ke User
  const targetUser = db.users.find(u => u.id === item.userId);
  if (targetUser) {
    targetUser.balance += item.amount;
  }

  saveDB(db);
  res.json({ success: true, message: `Top Up ${topupId} disetujui! Saldo berhasil ditambahkan.` });
});

// Reject Topup
app.post('/api/admin/topup/reject', (req, res) => {
  const { topupId } = req.body;
  const db = getDB();

  const item = db.topups.find(t => t.id === topupId);
  if (!item) return res.status(404).json({ success: false, message: 'Data topup tidak ditemukan' });
  if (item.status !== 'pending') return res.status(400).json({ success: false, message: 'Topup sudah diproses sebelumnya' });

  item.status = 'rejected';
  item.rejectedAt = new Date().toISOString();

  saveDB(db);
  res.json({ success: true, message: `Top Up ${topupId} telah ditolak.` });
});

// Update Settings & API Key
app.post('/api/admin/settings/update', (req, res) => {
  const { apiKey, baseUrl, costPerChat, defaultModel, bankInfo } = req.body;
  const db = getDB();

  if (apiKey !== undefined) db.settings.apiKey = apiKey;
  if (baseUrl !== undefined) db.settings.baseUrl = baseUrl;
  if (costPerChat !== undefined) db.settings.costPerChat = parseInt(costPerChat);
  if (defaultModel !== undefined) db.settings.defaultModel = defaultModel;
  if (bankInfo !== undefined) db.settings.bankInfo = bankInfo;

  saveDB(db);
  res.json({ success: true, message: 'Pengaturan sistem & API Key berhasil diperbarui!' });
});

app.listen(PORT, () => {
  console.log(`🚀 NusaRouter AI Web Server running on http://localhost:${PORT}`);
});
