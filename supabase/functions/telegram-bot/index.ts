// @ts-nocheck — This file runs on Deno (Supabase Edge Functions), not Node.js
/**
 * ============================================================
 *  ArtosKu Telegram Bot — Supabase Edge Function Webhook
 * ============================================================
 *
 * ARSITEKTUR
 * ----------
 * Telegram → [webhook POST] → Supabase Edge Function (ini)
 *                                    ↓
 *                             Supabase Database
 *                          (profiles, wallets, transactions)
 *
 * ENV VARIABLES YANG DIBUTUHKAN (set di Supabase → Secrets)
 * ----------------------------------------------------------
 *   TELEGRAM_BOT_TOKEN      — token dari @BotFather
 *   SUPABASE_SERVICE_ROLE_KEY — untuk bypass RLS di edge function
 *   OCR_SPACE_KEY           — (opsional) dari ocr.space untuk scan foto
 *   SUPABASE_URL            — otomatis tersedia di edge function
 *
 * CARA DAFTAR WEBHOOK
 * -------------------
 *   GET https://api.telegram.org/bot<TOKEN>/setWebhook
 *       ?url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot
 *   Deploy HARUS pakai: --no-verify-jwt  (agar Telegram bisa akses tanpa auth)
 *
 * ============================================================
 *  FLOW: HUBUNGKAN AKUN
 * ============================================================
 *  1. User klik "Hubungkan" di app → app generate UUID token
 *  2. Token disimpan ke profiles.telegram_connect_token
 *  3. App buka link: t.me/ArtoskuBot?start=<token>
 *  4. User klik START di Telegram → bot terima /start <token>
 *  5. Bot cari profile dengan token tsb → simpan telegram_chat_id
 *  6. Token dihapus, connected_at dicatat
 *
 * ============================================================
 *  PERINTAH BOT
 * ============================================================
 *
 *  /start [token]
 *    - Tanpa token: tampilkan panduan cara hubungkan akun
 *    - Dengan token: verifikasi token & simpan chat_id → akun terhubung
 *
 *  /saldo
 *    - Ambil semua wallet user dari DB, tampilkan saldo + total
 *
 *  /laporan
 *    - Hitung income & expense dari awal bulan ini sampai sekarang
 *    - Tampilkan ringkasan (income, expense, selisih, jumlah transaksi)
 *
 *  /analisis
 *    - Analisis keuangan rule-based (TANPA AI, 100% gratis):
 *      • Saving rate = (income - expense) / income * 100
 *      • Breakdown kategori pengeluaran (top 3)
 *      • Bandingkan dengan bulan lalu (trend income & expense)
 *      • Peringatan jika kategori melebihi batas wajar:
 *          Makan >25%, Hiburan >15%, Shop >20%, Transport >20%
 *      • Hal positif (saving rate bagus, pengeluaran turun, dll)
 *      • Saran: potong pengeluaran terbesar 20% → hemat per tahun
 *      • Proyeksi tabungan: jika pola ini berlanjut 3/6/12 bulan
 *
 *  keluar <jumlah> [keterangan]
 *    - Catat EXPENSE ke wallet pertama (non-investment) milik user
 *    - Kategori otomatis dideteksi dari keterangan (makan→Makan, dll)
 *    - Saldo wallet langsung diupdate
 *
 *  masuk <jumlah> [keterangan]
 *    - Catat INCOME ke wallet pertama (non-investment) milik user
 *    - Kategori otomatis dideteksi dari keterangan
 *    - Saldo wallet langsung diupdate
 *
 *  update <nama_wallet> <saldo_baru>
 *    - Cari wallet berdasarkan nama (partial match, case-insensitive)
 *    - Update saldo wallet ke nilai baru
 *    - Selisih dicatat otomatis sebagai transaksi adjustment
 *
 * ============================================================
 *  FLOW: SCAN FOTO / SCREENSHOT (OCR)
 * ============================================================
 *  1. User kirim foto ke bot (dengan/tanpa caption)
 *  2. Bot ambil fileId foto resolusi tertinggi
 *  3. Bot minta file path dari Telegram API (getFile)
 *  4. Kirim URL foto ke OCR.space API
 *  5. Parse teks hasil OCR → cari nominal IDR:
 *     - Prioritas: baris yang ada keyword (saldo, total, nominal, dll)
 *     - Fallback: angka terbesar >= 1000
 *  6. Bot balas dengan nominal yang ditemukan + saran perintah
 *     (user tinggal copy-paste & kirim)
 *
 * ============================================================
 *  DATABASE TABLES YANG DIGUNAKAN
 * ============================================================
 *   profiles      — telegram_chat_id, telegram_connect_token, telegram_connected_at
 *   wallets       — id, name, balance, type, user_id
 *   transactions  — id, amount, type (INCOME/EXPENSE), category, description, date, user_id, wallet_id
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('OCR_SPACE_KEY') ?? '' // Fallback ke OCR_SPACE_KEY jika user belum ganti nama env

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function sendMessage(chatId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
}

function formatIDR(amount: number): string {
    return 'Rp ' + amount.toLocaleString('id-ID')
}

function parseCategory(text: string): string {
    const t = text.toLowerCase()
    if (t.includes('makan') || t.includes('minum') || t.includes('food')) return 'Makan'
    if (t.includes('transport') || t.includes('bensin') || t.includes('ojek') || t.includes('grab') || t.includes('gojek')) return 'Transport'
    if (t.includes('belanja') || t.includes('shop') || t.includes('beli')) return 'Shop'
    if (t.includes('listrik') || t.includes('tagihan') || t.includes('wifi') || t.includes('air') || t.includes('pulsa')) return 'Tagihan'
    if (t.includes('hiburan') || t.includes('nonton') || t.includes('game') || t.includes('netflix')) return 'Hiburan'
    if (t.includes('sehat') || t.includes('obat') || t.includes('dokter') || t.includes('apotek')) return 'Kesehatan'
    if (t.includes('gaji') || t.includes('salary') || t.includes('upah')) return 'Gaji'
    if (t.includes('investasi') || t.includes('saham') || t.includes('crypto')) return 'Investasi'
    if (t.includes('hadiah') || t.includes('bonus') || t.includes('gift')) return 'Hadiah'
    return 'Others'
}

/**
 * Menggunakan Gemini 1.5 Flash untuk OCR & Analisis Gambar
 */
async function analyzeImageWithGemini(fileId: string, chatId: number): Promise<{ amount: number | null; rawText: string }> {
    try {
        if (!GEMINI_API_KEY) return { amount: null, rawText: 'API Key is missing' };

        console.log(`[OCR] Starting analysis for fileId: ${fileId}`);

        // Coba deteksi model yang tersedia
        let availableModels: string[] = [];
        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`)
            const listData = await listRes.json()
            availableModels = (listData.models || []).map((m: any) => m.name.replace('models/', ''));
            console.log('[OCR] Detected models:', availableModels.join(', '));
        } catch (e) {
            console.error('[OCR] Failed to list models:', e);
        }

        // Tentukan model yang akan digunakan (prioritas flash)
        const modelTarget = availableModels.find(m => m.includes('1.5-flash')) ||
            availableModels.find(m => m.includes('flash')) ||
            'gemini-1.5-flash';

        console.log(`[OCR] Using model: ${modelTarget}`);

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelTarget });

        // 1. Dapatkan path file dari Telegram
        const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
        const fileData = await fileRes.json()
        const filePath = fileData?.result?.file_path
        if (!filePath) return { amount: null, rawText: 'Failed to telegram file path' };

        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`

        // 2. Download file gambar
        const imgRes = await fetch(fileUrl)
        if (!imgRes.ok) return { amount: null, rawText: 'Failed to download image' };

        const imgBuffer = await imgRes.arrayBuffer()
        const uint8 = new Uint8Array(imgBuffer)
        const base64Image = btoa(Array.from(uint8).map(b => String.fromCharCode(b)).join(''));

        // 3. Panggil Gemini SDK
        try {
            const prompt = "Identify the transaction total amount or final balance from this Indonesian receipt/screenshot. Only return the final balance or total amount as a single plain number without currency or dots/commas. If not found, return 0.";

            const result = await model.generateContent([
                { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
                { text: prompt }
            ]);

            const response = await result.response;
            const fullText = response.text().trim();
            const amountMatch = fullText.replace(/[.,]/g, '').match(/\d{4,}/);
            const amount = amountMatch ? parseInt(amountMatch[0], 10) : null;

            return { amount: (amount && amount > 0) ? amount : null, rawText: fullText }
        } catch (sdkError: any) {
            // Jika gagal, kirimkan daftar model ke user untuk bantuan debug
            const modelInfo = availableModels.length > 0 ? `Available: ${availableModels.join(', ')}` : 'No models found in list.';
            return { amount: null, rawText: `SDK Error: ${sdkError.message}. ${modelInfo}` };
        }
    } catch (e: any) {
        return { amount: null, rawText: `System Error: ${e.message}` }
    }
}

async function handlePhoto(message: any) {
    const chatId: number = message.chat.id
    const caption: string = (message.caption ?? '').trim()

    // Cari profil berdasarkan chat_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('telegram_chat_id', chatId)
        .single()

    if (!profile) {
        await sendMessage(chatId, '⚠️ Akun belum terhubung. Buka aplikasi FinSmart → Profil → Integrasi Telegram.')
        return
    }

    if (!GEMINI_API_KEY) {
        await sendMessage(chatId, '❌ Fitur OCR (Gemini) belum dikonfigurasi. Hubungi admin.')
        return
    }

    await sendMessage(chatId, '🔍 Sedang menganalisis gambar dengan AI...')

    // Ambil foto resolusi tertinggi
    const photos = message.photo
    const bestPhoto = photos[photos.length - 1]

    const { amount, rawText } = await analyzeImageWithGemini(bestPhoto.file_id, chatId)

    if (!amount) {
        await sendMessage(chatId,
            '❌ Nominal tidak ditemukan di gambar.\n\n' +
            `Detail: ${rawText || 'AI tidak memberikan respon.'}\n\n` +
            'Tips: Pastikan angka saldo/total terlihat jelas di screenshot.'
        )
        return
    }

    // Tampilkan hasil dan saran perintah
    const walletSaran = caption ? caption : 'bca'
    await sendMessage(chatId,
        `📸 <b>Gambar berhasil dianalisis!</b>\n\n` +
        `💰 Nominal ditemukan: <b>${formatIDR(amount)}</b>\n\n` +
        `Pilih aksi:\n` +
        `• Update saldo wallet:\n  <code>update ${walletSaran} ${amount}</code>\n\n` +
        `• Catat pengeluaran:\n  <code>keluar ${amount} ${caption || 'makan'}</code>\n\n` +
        `• Catat pemasukan:\n  <code>masuk ${amount} ${caption || 'gaji'}</code>\n\n` +
        `<i>Copy dan edit salah satu perintah di atas, lalu kirim.</i>`
    )
}

async function handleMessage(message: any) {
    const chatId: number = message.chat.id
    const text: string = (message.text ?? '').trim()

    // /start — koneksi akun atau welcome
    if (text.startsWith('/start')) {
        const parts = text.split(' ')
        const token = parts[1] ?? ''

        if (token) {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('telegram_connect_token', token)
                .single()

            if (error || !profile) {
                await sendMessage(chatId, '❌ Token tidak valid atau sudah kadaluarsa. Coba generate token baru dari aplikasi.')
                return
            }

            await supabase.from('profiles').update({
                telegram_chat_id: chatId,
                telegram_connect_token: null,
                telegram_connected_at: new Date().toISOString(),
            }).eq('id', profile.id)

            await sendMessage(chatId,
                `✅ Halo <b>${profile.full_name}</b>! Akun FinSmart berhasil terhubung!\n\n` +
                `<b>Perintah tersedia:</b>\n` +
                `💰 /saldo — Lihat semua saldo wallet\n` +
                `📊 /laporan — Ringkasan bulan ini\n\n` +
                `<b>Catat transaksi:</b>\n` +
                `• <code>keluar 50000 makan</code>\n` +
                `• <code>masuk 3000000 gaji</code>\n\n` +
                `<b>Update saldo:</b>\n` +
                `• <code>update bca 4156334</code>\n\n` +
                `📸 <b>Atau kirim screenshot/foto struk</b> langsung ke sini untuk scan otomatis!`
            )
            return
        }

        await sendMessage(chatId,
            `👋 Halo! Saya <b>ArtosKu Bot</b>.\n\n` +
            `Untuk menghubungkan akun, buka aplikasi FinSmart → Profil → Integrasi Telegram → Hubungkan.`
        )
        return
    }

    // Cari profil berdasarkan chat_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('telegram_chat_id', chatId)
        .single()

    if (!profile) {
        await sendMessage(chatId, '⚠️ Akun belum terhubung. Buka aplikasi FinSmart → Profil → Integrasi Telegram.')
        return
    }

    const userId = profile.id

    // /saldo
    if (text === '/saldo') {
        const { data: wallets } = await supabase
            .from('wallets')
            .select('name, balance, type')
            .eq('user_id', userId)
            .order('balance', { ascending: false })

        if (!wallets || wallets.length === 0) {
            await sendMessage(chatId, '💼 Belum ada wallet.')
            return
        }

        const total = wallets.reduce((sum: number, w: any) => sum + Number(w.balance), 0)
        const lines = wallets.map((w: any, i: number) => `${i + 1}. <b>${w.name}</b>: ${formatIDR(Number(w.balance))}`).join('\n')
        await sendMessage(chatId, `💰 <b>Saldo Wallet</b>\n\n${lines}\n\n<b>Total: ${formatIDR(total)}</b>`)
        return
    }

    // /laporan
    if (text === '/laporan') {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const { data: txns } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', userId)
            .gte('date', startOfMonth)

        if (!txns || txns.length === 0) {
            await sendMessage(chatId, '📊 Belum ada transaksi bulan ini.')
            return
        }

        const income = txns.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + Number(t.amount), 0)
        const expense = txns.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + Number(t.amount), 0)
        const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
        await sendMessage(chatId,
            `📊 <b>Laporan ${monthName}</b>\n\n` +
            `✅ Pemasukan: <b>${formatIDR(income)}</b>\n` +
            `❌ Pengeluaran: <b>${formatIDR(expense)}</b>\n` +
            `📈 Selisih: <b>${formatIDR(income - expense)}</b>\n\n` +
            `Total transaksi: ${txns.length}`
        )
        return
    }

    // /analisis — analisis keuangan cerdas tanpa AI
    if (text === '/analisis') {
        const now = new Date()

        // Bulan ini
        const startCurr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        // Bulan lalu
        const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
        const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

        const [{ data: currTxns }, { data: prevTxns }, { data: wallets }] = await Promise.all([
            supabase.from('transactions').select('amount, type, category').eq('user_id', userId).gte('date', startCurr),
            supabase.from('transactions').select('amount, type').eq('user_id', userId).gte('date', startPrev).lte('date', endPrev),
            supabase.from('wallets').select('balance').eq('user_id', userId),
        ])

        if (!currTxns || currTxns.length === 0) {
            await sendMessage(chatId, '📊 Belum ada transaksi bulan ini untuk dianalisis.')
            return
        }

        // Hitung total bulan ini
        const income = currTxns.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + Number(t.amount), 0)
        const expense = currTxns.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + Number(t.amount), 0)
        const totalBalance = (wallets ?? []).reduce((s: number, w: any) => s + Number(w.balance), 0)
        const savingRate = income > 0 ? ((income - expense) / income) * 100 : 0
        const spendRatio = income > 0 ? (expense / income) * 100 : 0

        // Hitung bulan lalu
        const prevIncome = (prevTxns ?? []).filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + Number(t.amount), 0)
        const prevExpense = (prevTxns ?? []).filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + Number(t.amount), 0)

        // Kategori breakdown
        const catMap: Record<string, number> = {}
        currTxns.filter((t: any) => t.type === 'EXPENSE').forEach((t: any) => {
            catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount)
        })
        const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1])
        const topCat = sortedCats[0]

        // Trend vs bulan lalu
        const expenseTrend = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : 0
        const incomeTrend = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0

        // Bulan ini — nama
        const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })

        // Peringatan
        const warnings: string[] = []
        const catThresholds: Record<string, number> = {
            'Makan': 25, 'Hiburan': 15, 'Shop': 20, 'Transport': 20
        }
        if (income > 0) {
            for (const [cat, pct] of Object.entries(catThresholds)) {
                const catAmt = catMap[cat] ?? 0
                const catPct = (catAmt / income) * 100
                if (catPct > pct) {
                    warnings.push(`• ${cat}: ${catPct.toFixed(0)}% income (batas wajar ${pct}%)`)
                }
            }
        }
        if (spendRatio > 80) warnings.push('• Pengeluaran > 80% income — perlu dikurangi')
        if (expenseTrend > 15) warnings.push(`• Pengeluaran naik ${expenseTrend.toFixed(0)}% vs bulan lalu`)

        // Hal positif
        const positives: string[] = []
        if (savingRate >= 30) positives.push(`• Saving rate ${savingRate.toFixed(0)}% — Sangat baik! 🔥`)
        else if (savingRate >= 10) positives.push(`• Saving rate ${savingRate.toFixed(0)}% — Cukup baik`)
        if (expenseTrend < -5) positives.push(`• Pengeluaran turun ${Math.abs(expenseTrend).toFixed(0)}% vs bulan lalu 👍`)
        if (incomeTrend > 0) positives.push(`• Income naik ${incomeTrend.toFixed(0)}% vs bulan lalu 📈`)
        if (!(catMap['Hiburan'])) positives.push('• 0 pengeluaran Hiburan bulan ini 🎯')

        // Proyeksi tabungan
        const monthlySaving = income - expense
        const savingLines = monthlySaving > 0
            ? `\n💾 <b>Proyeksi tabungan:</b>\n` +
            `• 3 bulan: <b>${formatIDR(monthlySaving * 3)}</b>\n` +
            `• 6 bulan: <b>${formatIDR(monthlySaving * 6)}</b>\n` +
            `• 1 tahun: <b>${formatIDR(monthlySaving * 12)}</b>`
            : `\n⚠️ Pengeluaran melebihi income bulan ini.`

        // Kategori top 3
        const catLines = sortedCats.slice(0, 3)
            .map(([cat, amt], i) => {
                const pct = income > 0 ? ((amt / income) * 100).toFixed(0) : '?'
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'
                return `${medal} ${cat}: ${formatIDR(amt)} (${pct}% income)`
            }).join('\n')

        const savingEmoji = savingRate >= 30 ? '🚀' : savingRate >= 10 ? '✅' : '⚠️'

        let msg = `📊 <b>Analisis Keuangan — ${monthName}</b>\n\n`
        msg += `💰 Income:  <b>${formatIDR(income)}</b>\n`
        msg += `💸 Expense: <b>${formatIDR(expense)}</b>\n`
        msg += `${savingEmoji} Saving rate: <b>${savingRate.toFixed(1)}%</b>\n`
        msg += `🏦 Total aset: <b>${formatIDR(totalBalance)}</b>\n`

        if (catLines) {
            msg += `\n🔥 <b>Top pengeluaran:</b>\n${catLines}\n`
        }

        if (warnings.length > 0) {
            msg += `\n🔴 <b>Perhatian:</b>\n${warnings.join('\n')}\n`
        }

        if (positives.length > 0) {
            msg += `\n✅ <b>Hal positif:</b>\n${positives.join('\n')}\n`
        }

        // Tips berdasarkan kategori terboros
        if (topCat && income > 0) {
            const topPct = (topCat[1] / income * 100).toFixed(0)
            msg += `\n💡 <b>Saran:</b>\n`
            msg += `• ${topCat[0]} adalah pengeluaran terbesar (${topPct}% income)\n`
            if (Number(topPct) > 20) {
                const target = Math.round(topCat[1] * 0.8)
                const saving = topCat[1] - target
                msg += `  Kurangi 20% → hemat ${formatIDR(saving)}/bln = ${formatIDR(saving * 12)}/thn\n`
            }
        }

        msg += savingLines

        await sendMessage(chatId, msg)
        return
    }

    // /undo — batalkan transaksi terakhir
    if (text === '/undo') {
        // 1. Cari transaksi terakhir user
        const { data: lastTx, error: txError } = await supabase
            .from('transactions')
            .select('id, amount, type, wallet_id, description')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(1)
            .single()

        if (txError || !lastTx) {
            await sendMessage(chatId, '📭 Tidak ada transaksi yang bisa dibatalkan.')
            return
        }

        // 2. Ambil data wallet terkait
        const { data: wallet, error: wError } = await supabase
            .from('wallets')
            .select('id, name, balance')
            .eq('id', lastTx.wallet_id)
            .single()

        if (wError || !wallet) {
            await sendMessage(chatId, '❌ Wallet terkait tidak ditemukan. Gagal membatalkan.')
            return
        }

        // 3. Hitung balik saldo
        const isExpense = lastTx.type === 'EXPENSE'
        const revertedBalance = isExpense
            ? Number(wallet.balance) + Number(lastTx.amount)
            : Number(wallet.balance) - Number(lastTx.amount)

        // 4. Update DB (Hapus transaksi & Update saldo)
        const { error: delError } = await supabase.from('transactions').delete().eq('id', lastTx.id)
        if (delError) {
            await sendMessage(chatId, '❌ Gagal menghapus transaksi dari database.')
            return
        }

        await supabase.from('wallets').update({ balance: revertedBalance }).eq('id', wallet.id)

        await sendMessage(chatId,
            `✅ <b>Berhasil dibatalkan!</b>\n\n` +
            `🗑 <s>${lastTx.description}</s>\n` +
            `💰 ${formatIDR(Number(lastTx.amount))} dihapus dari catatan.\n\n` +
            `💼 Saldo ${wallet.name} dikembalikan ke <b>${formatIDR(revertedBalance)}</b>`
        )
        return
    }

    // update WALLET AMOUNT — update saldo wallet
    const updateMatch = text.match(/^update\s+(.+?)\s+(\d[\d.,]*)$/i)
    if (updateMatch) {
        const walletName = updateMatch[1].trim()
        const newBalance = parseInt(updateMatch[2].replace(/[.,]/g, ''), 10)

        const { data: wallets } = await supabase
            .from('wallets')
            .select('id, name, balance')
            .eq('user_id', userId)

        const wallet = wallets?.find((w: any) =>
            w.name.toLowerCase().includes(walletName.toLowerCase())
        )

        if (!wallet) {
            const names = wallets?.map((w: any) => w.name).join(', ') ?? '-'
            await sendMessage(chatId, `❌ Wallet "<b>${walletName}</b>" tidak ditemukan.\n\nWallet kamu: ${names}`)
            return
        }

        const diff = newBalance - Number(wallet.balance)
        await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)

        // Catat selisih sebagai adjustment transaction
        if (diff !== 0) {
            await supabase.from('transactions').insert({
                user_id: userId,
                wallet_id: wallet.id,
                amount: Math.abs(diff),
                type: diff > 0 ? 'INCOME' : 'EXPENSE',
                category: 'Others',
                description: 'Penyesuaian saldo via Telegram',
                date: new Date().toISOString(),
            })
        }

        await sendMessage(chatId,
            `✅ <b>Saldo ${wallet.name} diupdate!</b>\n\n` +
            `Saldo lama: ${formatIDR(Number(wallet.balance))}\n` +
            `Saldo baru: <b>${formatIDR(newBalance)}</b>\n` +
            `Selisih: ${diff >= 0 ? '+' : ''}${formatIDR(diff)}`
        )
        return
    }

    // keluar/masuk AMOUNT KETERANGAN [di/pake WALLET] — catat transaksi
    const txMatch = text.match(/^(keluar|masuk|out|in)\s+(\d[\d.,]*)\s*(.*)?$/i)
    if (txMatch) {
        const isExpense = ['keluar', 'out'].includes(txMatch[1].toLowerCase())
        const amount = parseInt(txMatch[2].replace(/[.,]/g, ''), 10)
        let descFull = (txMatch[3] ?? '').trim()

        if (amount <= 0) { await sendMessage(chatId, '❌ Jumlah tidak valid.'); return }

        // Cari keyword wallet: "di [name]", "pake [name]", atau "@[name]" di akhir kalimat
        let targetWalletName = ''
        const walletKeywords = [' di ', ' pake ', ' @']
        for (const kw of walletKeywords) {
            const index = descFull.toLowerCase().lastIndexOf(kw)
            if (index !== -1) {
                targetWalletName = descFull.substring(index + kw.length).trim()
                descFull = descFull.substring(0, index).trim()
                break
            }
        }

        const category = parseCategory(descFull)
        const description = descFull || (isExpense ? 'Pengeluaran' : 'Pemasukan')

        // Ambil semua wallet non-investasi
        const { data: userWallets } = await supabase
            .from('wallets')
            .select('id, name, balance')
            .eq('user_id', userId)
            .neq('type', 'INVESTMENT')
            .order('created_at', { ascending: true })

        if (!userWallets || userWallets.length === 0) {
            await sendMessage(chatId, '❌ Kamu belum punya wallet non-investasi.')
            return
        }

        // Cari wallet yang cocok
        let wallet = userWallets[0] // Default ke Wallet pertama
        let usedDefault = true

        if (targetWalletName) {
            const match = userWallets.find(w =>
                w.name.toLowerCase().includes(targetWalletName.toLowerCase())
            )
            if (match) {
                wallet = match
                usedDefault = false
            } else {
                const names = userWallets.map(w => w.name).join(', ')
                await sendMessage(chatId, `⚠️ Wallet "<b>${targetWalletName}</b>" tidak ditemukan.\n\nPilihan: ${names}\n\n<i>Mencatat di wallet default (${wallet.name})...</i>`)
            }
        }

        // Simpan transaksi
        await supabase.from('transactions').insert({
            user_id: userId, wallet_id: wallet.id, amount,
            type: isExpense ? 'EXPENSE' : 'INCOME',
            category, description, date: new Date().toISOString(),
        })

        // Update saldo
        const newBalance = Number(wallet.balance) + (isExpense ? -amount : amount)
        await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)

        await sendMessage(chatId,
            `${isExpense ? '❌' : '✅'} <b>${isExpense ? 'Pengeluaran' : 'Pemasukan'} dicatat!</b>\n\n` +
            `💵 ${formatIDR(amount)} — ${category}\n` +
            `📝 ${description}\n` +
            `💼 ${wallet.name} → <b>${formatIDR(newBalance)}</b>` +
            (usedDefault ? `\n\n<i>Tips: Tambahkan "di [nama dompet]" di akhir pesan untuk memilih dompet lain.</i>` : '')
        )
        return
    }

    // Tidak dikenali
    await sendMessage(chatId,
        `🤖 Perintah tidak dikenali.\n\n` +
        `/saldo — Saldo wallet\n` +
        `/laporan — Laporan bulan ini\n` +
        `/analisis — Analisis keuangan cerdas 🧠\n` +
        `/undo — Batalkan transaksi terakhir ↩️\n\n` +
        `<b>Contoh catat transaksi:</b>\n` +
        `• <code>keluar 5000 es teh di cash</code>\n` +
        `• <code>masuk 2jt gaji di bca</code>\n` +
        `• <code>update bca 4156334</code>\n\n` +
        `📸 Atau kirim <b>screenshot</b> untuk scan otomatis`
    )
}

serve(async (req) => {
    if (req.method !== 'POST') return new Response('OK')

    try {
        const body = await req.json()
        if (body.message?.photo) {
            await handlePhoto(body.message)
        } else if (body.message) {
            await handleMessage(body.message)
        }
    } catch (e) {
        console.error(e)
    }

    return new Response('OK', { status: 200 })
})
