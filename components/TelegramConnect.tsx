import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface TelegramConnectProps {
    profile: UserProfile | null;
    onUpdateProfile: () => void;
    botUsername: string; // e.g. "FinSmartBot"
}

const TelegramConnect: React.FC<TelegramConnectProps> = ({ profile, onUpdateProfile, botUsername }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [connectUrl, setConnectUrl] = useState<string | null>(null);

    useEffect(() => {
        // Check if connected via telegram_chat_id in profiles
        if (profile) {
            checkConnection();
        }
    }, [profile]);

    const checkConnection = async () => {
        if (!profile) return;
        const { data } = await supabase
            .from('profiles')
            .select('telegram_chat_id, telegram_connected_at')
            .eq('id', profile.id)
            .single();
        setIsConnected(!!data?.telegram_chat_id);
    };

    const handleConnect = async () => {
        if (!profile) return;
        setLoading(true);
        setConnectUrl(null);

        try {
            // Generate unique token
            const token = crypto.randomUUID();

            // Save token to profile
            const { error } = await supabase
                .from('profiles')
                .update({ telegram_connect_token: token })
                .eq('id', profile.id);

            if (error) throw error;

            // Build deep link to bot
            const url = `https://t.me/${botUsername}?start=${token}`;
            setConnectUrl(url);

            // Open the link
            window.open(url, '_blank');
        } catch (err) {
            console.error('Error generating connect token:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!profile) return;
        setLoading(true);
        try {
            await supabase
                .from('profiles')
                .update({
                    telegram_chat_id: null,
                    telegram_connect_token: null,
                    telegram_connected_at: null,
                })
                .eq('id', profile.id);
            setIsConnected(false);
            setConnectUrl(null);
            onUpdateProfile();
        } catch (err) {
            console.error('Error disconnecting:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden glass-morphism">
            {/* Header */}
            <div className="px-5 py-3 border-b border-[var(--border-subtle)] bg-[rgba(var(--text-primary-rgb),0.01)] flex items-center justify-between">
                <h3 className="text-[8px] font-black text-[var(--text-muted)] tracking-[0.2em] uppercase opacity-50">Integrasi</h3>
                {isConnected && (
                    <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Terhubung
                    </span>
                )}
            </div>

            {/* Telegram Row */}
            <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        {/* Telegram Icon */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] shrink-0"
                            style={{ background: 'linear-gradient(135deg, #29b6f6, #0288d1)' }}>
                            <i className="fa-brands fa-telegram text-white text-sm"></i>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-[var(--text-primary)] tracking-tight">Telegram</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] opacity-50">
                                {isConnected ? 'Catat transaksi via chat' : 'Belum terhubung'}
                            </p>
                        </div>
                    </div>

                    {isConnected ? (
                        <button
                            onClick={handleDisconnect}
                            disabled={loading}
                            className="text-[9px] font-black text-rose-500/70 hover:text-rose-500 transition-colors disabled:opacity-50"
                        >
                            Putuskan
                        </button>
                    ) : (
                        <button
                            onClick={handleConnect}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-xl bg-[#0288d1]/10 border border-[#0288d1]/20 text-[9px] font-black text-[#29b6f6] hover:bg-[#0288d1]/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? '...' : 'Hubungkan'}
                        </button>
                    )}
                </div>

                {/* Fitur list jika sudah connect */}
                {isConnected && (
                    <div className="mt-4 space-y-2">
                        {[
                            { icon: 'fa-circle-check', text: 'Catat pengeluaran & pemasukan' },
                            { icon: 'fa-circle-check', text: 'Cek saldo bulanan (/saldo)' },
                            { icon: 'fa-circle-check', text: 'Laporan keuangan (/laporan)' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <i className={`fa-solid ${f.icon} text-[9px] text-emerald-500`}></i>
                                <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-70">{f.text}</span>
                            </div>
                        ))}

                        <div className="mt-3 p-3 rounded-xl bg-[rgba(var(--bg-inner-rgb),0.5)] border border-[var(--border-subtle)]">
                            <p className="text-[9px] font-black text-[var(--text-muted)] tracking-wider mb-1.5 uppercase opacity-40">Contoh perintah</p>
                            <div className="space-y-1">
                                {[
                                    'keluar 50000 makan',
                                    'masuk 3000000 gaji',
                                    '/saldo',
                                    '/laporan',
                                ].map((cmd, i) => (
                                    <code key={i} className="block text-[10px] font-mono text-emerald-400">
                                        {cmd}
                                    </code>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending connect state */}
                {!isConnected && connectUrl && (
                    <div className="mt-3 p-3 rounded-xl bg-[#0288d1]/5 border border-[#0288d1]/20">
                        <p className="text-[9px] font-bold text-[var(--text-muted)] mb-2 opacity-70">
                            Klik link di bawah untuk buka Telegram, lalu tekan <b className="text-[var(--text-primary)]">START</b>:
                        </p>
                        <a
                            href={connectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-[#29b6f6] underline break-all"
                        >
                            {connectUrl}
                        </a>
                        <button
                            onClick={checkConnection}
                            className="mt-3 w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 tracking-wider"
                        >
                            Saya sudah klik START ✓
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TelegramConnect;
