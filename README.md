# 🌐 NusaAI Studio - AI Web Chat terintegrasi NusaRouter API

Website AI Chat responsif dan modern dengan backend Express.js, sistem kuota/saldo percakapan, top up manual dengan verifikasi admin, serta multi-user authentication.

## 🚀 Fitur Utama:
1. **AI Chat Engine (NusaRouter Integration):**
   - Terhubung langsung ke endpoint REST API NusaRouter (`https://api.nusarouter.com/v1/chat/completions`).
   - Default model: `nusarouter/auto` (bisa diubah di pengaturan admin).
   - Sistem pemotongan saldo otomatis per pesan chat (misal: Rp 500/chat).
2. **Sistem Autentikasi User & Saldo:**
   - Register akun baru (otomatis mendapat bonus saldo awal Rp 5.000).
   - Login, logout, dan real-time balance tracking.
3. **Fitur Top Up Saldo Manual:**
   - Pilihan paket top up (Rp 10.000, Rp 25.000, Rp 50.000, Rp 100.000).
   - Panduan info rekening transfer/QRIS admin.
   - Form kirim bukti transfer & riwayat transaksi dengan status `PENDING`, `APPROVED`, atau `REJECTED`.
4. **Halaman Admin Panel:**
   - Input dan simpan API Key NusaRouter secara dinamis dari dashboard.
   - Atur model AI & biaya per chat.
   - Verifikasi transaksi top up (tombol Terima otomatis menambah saldo akun user terkait).
   - Monitoring daftar semua pengguna terdaftar.

---

## 💻 Cara Menjalankan

1. Masuk ke folder proyek:
   ```bash
   cd /data/data/com.termux/files/home/nusarouter-ai-web
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Jalankan server:
   ```bash
   npm start
   ```
4. Buka di browser: `http://localhost:3000`

### Akun Bawaan:
- **Akun Admin:** `admin` / `admin123` (Bisa akses menu Admin Panel & atur API Key)
- **Akun Demo User:** `demo_user` / `123`
