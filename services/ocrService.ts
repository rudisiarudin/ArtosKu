import { createWorker } from 'tesseract.js';

export interface OcrResult {
    amount: number | null;
    rawText: string;
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Parse teks hasil OCR untuk cari nominal uang terbesar dalam IDR.
 * Mendukung format: 1.234.567 | 1,234,567 | 1234567 | Rp1.234.567
 */
function parseAmountFromText(text: string): { amount: number | null; confidence: 'high' | 'medium' | 'low' } {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Keyword yang sering muncul di struk/screenshot keuangan
    const priorityKeywords = [
        'saldo akhir', 'saldo', 'total', 'nominal', 'jumlah', 'balance',
        'transfer', 'bayar', 'diterima', 'terima', 'amount'
    ];

    // Regex: angka >= 4 digit, bisa dipisah titik/koma sebagai thousands separator
    const moneyRegex = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,})/gi;

    // Cari di baris yang mengandung keyword prioritas
    for (const keyword of priorityKeywords) {
        for (const line of lines) {
            if (line.toLowerCase().includes(keyword)) {
                const matches = [...line.matchAll(moneyRegex)];
                if (matches.length > 0) {
                    const parsed = matches
                        .map(m => parseInt(m[1].replace(/[.,]/g, ''), 10))
                        .filter(n => n >= 1000)
                        .sort((a, b) => b - a);
                    if (parsed.length > 0) {
                        return { amount: parsed[0], confidence: 'high' };
                    }
                }
            }
        }
    }

    // Fallback: ambil semua angka >= 4 digit, ambil yang terbesar
    const allMatches = [...text.matchAll(moneyRegex)];
    const allNumbers = allMatches
        .map(m => parseInt(m[1].replace(/[.,]/g, ''), 10))
        .filter(n => n >= 1000)
        .sort((a, b) => b - a);

    if (allNumbers.length > 0) {
        return { amount: allNumbers[0], confidence: 'low' };
    }

    return { amount: null, confidence: 'low' };
}

export async function extractAmountFromImage(file: File): Promise<OcrResult> {
    const worker = await createWorker('ind+eng', 1, {
        logger: () => { }, // silence logs
    });

    try {
        const imageUrl = URL.createObjectURL(file);
        const { data } = await worker.recognize(imageUrl);
        URL.revokeObjectURL(imageUrl);

        const rawText = data.text || '';
        const { amount, confidence } = parseAmountFromText(rawText);

        return { amount, rawText: rawText.slice(0, 200), confidence };
    } finally {
        await worker.terminate();
    }
}
