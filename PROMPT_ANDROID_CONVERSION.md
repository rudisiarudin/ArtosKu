# Prompt untuk Google AI Studio: Konversi React/Vite ke Pure Native Android

*Panduan: Unggah seluruh folder project web Anda (atau hubungkan via Google Drive) ke Google AI Studio. Kemudian salin dan tempel prompt di bawah ini ke kolom chat Google AI Studio.*

---

**Konteks Project:**
Saya memiliki sebuah project aplikasi manajemen keuangan pribadi bernama **ArtosKu**. Saat ini, aplikasi ini dibangun menggunakan teknologi web: **React 19, Vite, TypeScript**, dan **Supabase** (sebagai database dan autentikasi). Desain UI-nya menggunakan pendekatan *Glassmorphism* dengan tema *Premium Emerald Dark* (kombinasi warna gelap elegan dengan aksen hijau emerald).

**Tujuan Saya:**
Saya ingin me-*rewrite* (menulis ulang) seluruh aplikasi ini dari awal menjadi aplikasi **Pure Native Android**. Saya **TIDAK INGIN** menggunakan *web-wrapper* seperti Capacitor atau WebView. Saya ingin aplikasi ini dibangun sepenuhnya menggunakan:
1. **Bahasa:** Kotlin
2. **UI Framework:** Jetpack Compose
3. **Arsitektur:** MVVM (Model-View-ViewModel)
4. **Backend:** Supabase Kotlin SDK (untuk Auth dan Database)

Karena Anda memiliki akses ke seluruh *codebase* web saya, tolong analisis struktur data, *state management*, dan UI komponennya, lalu pandu saya langkah demi langkah untuk membangun versi Native Android-nya.

Tolong berikan panduan komprehensif yang dibagi menjadi 3 tahap pengerjaan berikut:

### Tahap 1: Setup Project & Arsitektur
1. Beritahu saya struktur *package* dan folder yang ideal untuk arsitektur MVVM di project Android Studio.
2. Berikan kode lengkap untuk `build.gradle.kts` (app-level dan project-level) yang menyertakan semua *dependency* yang dibutuhkan: Jetpack Compose, ViewModel, Coroutines, Navigation Compose, dan **Supabase Kotlin SDK** (GoTrue/Auth & Postgrest).
3. Berdasarkan struktur tabel di Supabase saya (lihat file `supabase-schema.sql` atau penggunaan di `lib/supabase.ts`), buatkan **Data Classes** (Model) di Kotlin.
4. Buatkan file konfigurasi awal Supabase Client di Kotlin.

### Tahap 2: Autentikasi & Logika Data (ViewModel)
1. Analisis alur autentikasi saya (Login, Register, PIN layar kunci).
2. Buatkan `AuthRepository` dan `AuthViewModel` di Kotlin yang menangani login email/password via Supabase, serta logika penyimpanan status sesi (menggunakan DataStore/SharedPreferences untuk PIN).
3. Buatkan `TransactionRepository` dan `TransactionViewModel` yang menyalin logika dari hook React saya untuk mengambil (*fetch*), menambah (*insert*), dan menghitung total saldo (*balance*). Pastikan menggunakan `StateFlow` agar data reaktif.

### Tahap 3: Konversi UI (Jetpack Compose)
1. Tolong buatkan *theme* (Tema) Compose (`Color.kt`, `Theme.kt`) yang mereplikasi gaya *Premium Emerald Dark* saya (latar belakang gelap, aksen hijau hex `#10b981`, dan efek *glassmorphism/translucent*).
2. Konversi halaman **Dashboard** (`Dashboard.tsx` / `Stats.tsx`) menjadi fungsi `@Composable`. Tunjukkan cara menampilkan daftar transaksi dan saldo secara reaktif dari ViewModel.
3. Konversi komponen form input (seperti form tambah transaksi atau transfer) menjadi komponen Compose yang rapi.

Mohon berikan jawaban untuk **Tahap 1** terlebih dahulu dengan detail kode yang lengkap. Setelah Tahap 1 selesai saya terapkan, saya akan meminta Anda melanjutkan ke Tahap 2.
