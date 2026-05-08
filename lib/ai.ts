import { Transaction, TransactionType, Wallet, Debt } from '../types';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Build a financial context summary from the user's data
 * so the AI can give personalized, data-driven advice.
 */
function buildFinancialContext(
  transactions: Transaction[],
  wallets: Wallet[],
  debts: Debt[],
  userName: string,
  lang: 'id' | 'en'
): string {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // Total balances
  const totalBalance = wallets.reduce((s, w) => s + Number(w.balance), 0);

  // This month's transactions
  const monthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const monthIncome = monthTx
    .filter(t => t.type === TransactionType.INCOME || t.type === TransactionType.DEBT)
    .reduce((s, t) => s + Number(t.amount), 0);

  const monthExpense = monthTx
    .filter(t => t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE)
    .reduce((s, t) => s + Number(t.amount), 0);

  // Category breakdown this month
  const catMap: Record<string, number> = {};
  monthTx
    .filter(t => t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE)
    .forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
    });
  const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  // Last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekTx = transactions.filter(t => new Date(t.date) >= weekAgo);
  const weekExpense = weekTx
    .filter(t => t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE)
    .reduce((s, t) => s + Number(t.amount), 0);

  // Debts summary
  const activeDebts = (debts || []).filter(d => !d.isPaid);
  const totalDebt = activeDebts
    .filter(d => d.type === TransactionType.DEBT)
    .reduce((s, d) => s + Number(d.amount), 0);
  const totalReceivable = activeDebts
    .filter(d => d.type === TransactionType.RECEIVABLE)
    .reduce((s, d) => s + Number(d.amount), 0);

  // Wallet list
  const walletList = wallets
    .map(w => `- ${w.name} (${w.type}): Rp${Number(w.balance).toLocaleString('id-ID')}`)
    .join('\n');

  // Recent 10 transactions
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(t => {
      const sign = (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT) ? '+' : '-';
      return `  ${new Date(t.date).toLocaleDateString('id-ID')} | ${sign}Rp${Number(t.amount).toLocaleString('id-ID')} | ${t.category} | ${t.description}`;
    })
    .join('\n');

  const formatIDR = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

  return `
=== DATA KEUANGAN PENGGUNA: ${userName} ===
Tanggal: ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

📊 RINGKASAN:
- Total Saldo: ${formatIDR(totalBalance)}
- Pemasukan Bulan Ini: ${formatIDR(monthIncome)}
- Pengeluaran Bulan Ini: ${formatIDR(monthExpense)}
- Selisih: ${formatIDR(monthIncome - monthExpense)} (${monthIncome > monthExpense ? 'SURPLUS' : 'DEFISIT'})
- Pengeluaran 7 Hari Terakhir: ${formatIDR(weekExpense)}

💳 DOMPET/ASET:
${walletList || '(Belum ada dompet)'}

📂 PENGELUARAN PER KATEGORI (Bulan Ini):
${sortedCats.map(([cat, amt]) => `- ${cat}: ${formatIDR(amt)} (${monthExpense > 0 ? ((amt / monthExpense) * 100).toFixed(1) : 0}%)`).join('\n') || '(Belum ada data)'}

💰 HUTANG & PIUTANG:
- Total Hutang Aktif: ${formatIDR(totalDebt)}
- Total Piutang Aktif: ${formatIDR(totalReceivable)}
- Jumlah Posisi Aktif: ${activeDebts.length}

📋 10 TRANSAKSI TERAKHIR:
${recent || '(Belum ada transaksi)'}

📈 STATISTIK:
- Total Transaksi: ${transactions.length}
- Rata-rata Pengeluaran Harian (7 hari): ${formatIDR(weekExpense / 7)}
- Jumlah Aset: ${wallets.length}
`.trim();
}

/**
 * Send a message to the AI assistant via OpenRouter
 */
export async function sendAiMessage(
  messages: ChatMessage[],
  transactions: Transaction[],
  wallets: Wallet[],
  debts: Debt[],
  userName: string,
  lang: 'id' | 'en'
): Promise<string> {
  const financialContext = buildFinancialContext(transactions, wallets, debts, userName, lang);

  if (!OPENROUTER_API_KEY) {
    console.error('Missing OpenRouter API Key in environment variables.');
    return lang === 'id' 
      ? 'Konfigurasi AI belum lengkap. Harap cek API Key.'
      : 'AI Configuration incomplete. Please check API Key.';
  }

  const systemPrompt = `Kamu adalah "Artos AI", asisten keuangan pribadi yang asik, santai, tapi tetep pinter di dalam aplikasi ArtosKu.

KEPRIBADIAN:
- Gaya bahasa SANTAI, GAUL, dan FRIENDLY (pake kata-kata kaya "oke", "siap", "mantap", "nih", "yuk").
- Jangan terlalu kaku atau formal kaya bot bank. Jadilah seperti teman curhat keuangan yang suportif.
- Berikan insight spesifik berdasarkan DATA NYATA pengguna dengan cara yang ringan.
- Gunakan emoji yang relevan supaya chatnya hidup.
- UTAMAKAN menjawab dalam Bahasa Indonesia yang santai dan akrab (meskipun user nanya pake bahasa Inggris, jawabnya tetep pake bahasa Indonesia yang asik).
- Berikan saran yang actionable dan konkret.

KEMAMPUAN KHUSUS: PENCATATAN TRANSAKSI
Kamu bisa bantu catat transaksi lewat chat.
1. Kalau user mau catat transaksi (misal: "tadi makan bakso 20rb"):
   - Tanya/Identifikasi: Amount, Description, Category, Wallet, dan Type.
   - Kalau DOMPET (Wallet) nggak disebutin, KAMU WAJIB TANYA: "Pake dompet yang mana nih?" atau "Duitnya dari mana?". JANGAN asal tebak dompet.
   - Kalau data udah lengkap, kasih blok JSON ini di PALING BAWAH jawabanmu:
     :::RECORD_TRANSACTION:::
     {
       "amount": number,
       "description": "string",
       "category": "Makan" | "Transport" | "Tagihan" | "Hiburan" | "Shop" | "Kesehatan" | "Gaji" | "Investasi" | "Hadiah" | "Bonus" | "Others",
       "walletId": "string (ID dompet yang cocok)",
       "type": "EXPENSE" | "INCOME"
     }
     :::END_RECORD:::

2. DAFTAR DOMPET YANG TERSEDIA (Hanya gunakan ID dari daftar ini):
${wallets.map(w => `- ID: ${w.id} | Nama: ${w.name} | Tipe: ${w.type}`).join('\n')}

3. ATURAN PENTING:
- Jika dompet yang disebutkan pengguna tidak mirip dengan daftar di atas, tanyakan konfirmasi.
- Selalu berikan respon teks yang ramah sebelum blok JSON.
- Jangan tampilkan blok JSON jika data belum lengkap (terutama Wallet).

${financialContext}`;

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://artosku.vercel.app',
        'X-Title': 'ArtosKu Finance'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
        messages: fullMessages,
        max_tokens: 1024,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error text:', errorText);
      const keySnippet = OPENROUTER_API_KEY ? `(...${OPENROUTER_API_KEY.slice(-4)})` : '(no key)';
      throw new Error(`API Error: ${response.status} ${keySnippet}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.warn('AI Response empty or missing choices:', data);
      return lang === 'id' 
        ? 'Maaf, saya tidak menerima jawaban dari server AI. Silakan coba lagi.'
        : 'Sorry, I did not receive a response from the AI server. Please try again.';
    }

    return content;
  } catch (error) {
    console.error('AI request failed with error:', error);
    throw error;
  }
}

/**
 * Quick analysis prompts — pre-built prompts for common insights
 */
export const QUICK_PROMPTS = {
  id: [
    { icon: '📊', label: 'Analisis Keuangan', prompt: 'Berikan analisis kesehatan keuangan saya secara menyeluruh dengan health score.' },
    { icon: '📝', label: 'Catat Transaksi', prompt: 'Saya mau catat pengeluaran makan siang 15rb pake dompet [Sebutkan Nama Dompet].' },
    { icon: '💡', label: 'Tips Hemat', prompt: 'Berdasarkan pola pengeluaran saya, berikan 3 tips hemat yang paling relevan.' },
    { icon: '🎯', label: 'Target Menabung', prompt: 'Buatkan rencana menabung yang realistis berdasarkan kondisi keuangan saya saat ini.' },
    { icon: '⚠️', label: 'Cek Pemborosan', prompt: 'Analisis apakah ada kategori pengeluaran yang berlebihan dan perlu dikurangi.' },
  ],
  en: [
    { icon: '📊', label: 'Financial Analysis', prompt: 'Give me a comprehensive financial health analysis with a health score.' },
    { icon: '📝', label: 'Record Transaction', prompt: 'I want to record an expense for lunch 15k using my [Wallet Name].' },
    { icon: '💡', label: 'Saving Tips', prompt: 'Based on my spending patterns, give me the 3 most relevant saving tips.' },
    { icon: '🎯', label: 'Savings Goal', prompt: 'Create a realistic savings plan based on my current financial condition.' },
    { icon: '⚠️', label: 'Overspending Check', prompt: 'Analyze if there are spending categories that are excessive and need to be reduced.' },
  ]
};
