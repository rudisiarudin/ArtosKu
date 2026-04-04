// @ts-nocheck — This file runs on Deno (Supabase Edge Functions), not Node.js
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function sendMessage(chatId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
}

serve(async (_req) => {
    try {
        // Ambil semua user yang sudah hubungkan Telegram
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, telegram_chat_id')
            .not('telegram_chat_id', 'is', null)

        if (!profiles || profiles.length === 0) {
            return new Response('No users with Telegram', { status: 200 })
        }

        // Tentukan range "hari ini" dalam UTC+7 (WIB)
        const now = new Date()
        // Offset WIB = UTC+7
        const wibOffset = 7 * 60 * 60 * 1000
        const todayWIB = new Date(now.getTime() + wibOffset)
        const startOfDayWIB = new Date(todayWIB)
        startOfDayWIB.setUTCHours(0, 0, 0, 0)
        const endOfDayWIB = new Date(todayWIB)
        endOfDayWIB.setUTCHours(23, 59, 59, 999)

        // Konversi balik ke UTC untuk query
        const startUTC = new Date(startOfDayWIB.getTime() - wibOffset).toISOString()
        const endUTC = new Date(endOfDayWIB.getTime() - wibOffset).toISOString()

        let notified = 0

        for (const profile of profiles) {
            // Cek apakah user punya transaksi hari ini
            const { count } = await supabase
                .from('transactions')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', profile.id)
                .gte('date', startUTC)
                .lte('date', endUTC)

            if (count === 0) {
                // Belum ada transaksi hari ini — kirim reminder
                const hour = todayWIB.getUTCHours()
                const greeting = hour < 12 ? '🌅 Selamat pagi' : hour < 17 ? '☀️ Selamat siang' : '🌙 Selamat malam'

                await sendMessage(profile.telegram_chat_id,
                    `${greeting}, <b>${profile.full_name}</b>! 👋\n\n` +
                    `📝 Kamu belum mencatat transaksi apapun hari ini.\n\n` +
                    `Jangan lupa catat pengeluaran & pemasukanmu ya! Contoh:\n` +
                    `• <code>keluar 50000 makan siang</code>\n` +
                    `• <code>masuk 500000 freelance</code>\n\n` +
                    `Atau kirim <b>screenshot struk/saldo</b> langsung ke sini 📸`
                )
                notified++
            }
        }

        return new Response(
            JSON.stringify({ message: `Reminder sent to ${notified} users` }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    } catch (e) {
        console.error(e)
        return new Response('Error', { status: 500 })
    }
})
