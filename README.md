# 💰 ArtosKu - Personal Finance Manager

ArtosKu adalah aplikasi manajemen keuangan pribadi yang dirancang dengan estetika **Premium Emerald Dark** and fitur keamanan tingkat tinggi. Simpan data keuangan Anda dengan aman menggunakan sinkronisasi Supabase dan lindungi akses dengan PIN 6-digit.

<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="ArtosKu Banner" width="100%">
</div>

## ✨ Fitur Unggulan

- 💎 **Premium Dark UI**: Antarmuka berbasis Glassmorphism dengan aksen warna Emerald yang mewah.
- 🔐 **Double Layer Security**:
  - Autentikasi Supabase (Email/Password).
  - PIN Keamanan 6-digit dengan *inactivity timeout* (30 menit).
  - Fitur Lupa Password terintegrasi.
- 📊 **Dynamic Dashboard**: 
  - Monitoring saldo real-time (IDR).
  - Grafik performa aset mingguan/bulanan (Running Balance).
  - Analisis tren persentase harian.
- 💼 **Manajemen Dompet (Wallet)**: Kelola banyak dompet sekaligus (Bank, Cash, E-wallet).
- 🧾 **Pencatatan Transaksi**:
  - Kategori lengkap (Makan, Transport, Tagihan, dsb).
  - Logika Hutang (Debt) & Piutang (Receivable) yang akurat.
- ☁️ **Cloud Sync**: Data tersinkronisasi secara otomatis ke Supabase Database.

## 🛠️ Tech Stack

- **Frontend**: Vite + React 19 + TypeScript
- **Styling**: Vanilla CSS + Tailwind-like Utility Classes
- **Database/Auth**: Supabase
- **Charts**: Recharts
- **Icons**: FontAwesome 6

## 🚀 Persiapan Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) (versi LTS direkomendasikan)
- Akun [Supabase](https://supabase.com/)

### Langkah Instalasi

1. **Clone Repository**
   ```bash
   git clone <link-repo-anda>
   cd artosku-personal-finance
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**
   Buat file `.env.local` di root folder dan tambahkan key berikut:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Setup Database**
   Jalankan file SQL yang tersedia di folder `sql/` (jika ada) atau gunakan skema berikut di SQL Editor Supabase:
   - `supabase-schema.sql` (Skema Utama)
   - `security-pin-update.sql` (Update Kolom PIN)

5. **Jalankan Aplikasi**
   ```bash
   npm run dev
   ```

## 🌐 Deployment

Aplikasi ini siap di-deploy ke **Vercel** atau **Netlify**. Lihat [vercel_deployment_guide.md](./vercel_deployment_guide.md) untuk instruksi detail mengenai konfigurasi environment variables di production.

---

## 📱 Build & Deploy ke Android

Aplikasi ini telah disiapkan untuk dikonversi menjadi aplikasi Android native menggunakan **Capacitor**.

### Langkah Build Dasar
1. Pastikan Anda sudah menginstal **Android Studio**.
2. Build aset web:
   ```bash
   npm run build
   ```
3. Sinkronisasi aset ke folder Android:
   ```bash
   npx cap sync android
   ```
4. Buka project di Android Studio untuk di-build menjadi APK/AAB:
   ```bash
   npx cap open android
   ```

### 🤖 Prompt AI Assistant untuk Konversi Pure Native Android (Kotlin)
Jika Anda ingin menggunakan **Google AI Studio** untuk mengkonversi *codebase* web (React/Vite) ini menjadi aplikasi **Pure Native Android** (menggunakan Kotlin dan Jetpack Compose) dan bukan sekadar *web-wrapper*, gunakan template prompt berikut:

**Prompt 1: Setup & Arsitektur Awal**
> "Berikut adalah seluruh folder project React + Vite + Supabase saya untuk aplikasi personal finance. Saya ingin merombak (rewrite) aplikasi ini menjadi aplikasi Pure Native Android sepenuhnya menggunakan **Kotlin** dan **Jetpack Compose**. Berdasarkan struktur database Supabase dan *state* yang ada di React ini, tolong buatkan kerangka arsitektur Android-nya (MVVM direkomendasikan). Mulailah dengan panduan setup project di Android Studio, konfigurasi `build.gradle` (termasuk Supabase Kotlin SDK), dan struktur folder yang disarankan."

**Prompt 2: Konversi UI & Komponen (Setelah Setup)**
> "Di project web saya, saya memiliki komponen UI dengan styling Tailwind-like dan Glassmorphism (lihat file di folder `/components`). Tolong konversi komponen UI utama seperti Dashboard, Wallet, dan Transaction List menjadi komponen **Jetpack Compose**. Berikan contoh implementasi kode Compose-nya agar tetap memiliki estetika *Premium Dark* yang serupa dengan versi web."

**Prompt 3: Integrasi Logic & Supabase**
> "Di versi web, saya menggunakan Supabase JS client untuk Auth dan CRUD data (lihat file `lib/supabase.ts` atau context). Tolong buatkan Repository dan ViewModel di Kotlin untuk menangani login, insert transaksi, dan mengambil (fetch) data saldo secara *real-time* menggunakan Supabase Kotlin SDK. Pastikan penanganan *state* di Compose berjalan reaktif (Flow/StateFlow)."

---

<div align="center">
  Dibuat dengan ❤️ untuk pengelolaan keuangan yang lebih baik.
</div>
