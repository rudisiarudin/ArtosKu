
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { CheckCircle2, RefreshCw, ChevronRight, ExternalLink, Zap } from 'lucide-react';

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
            const token = crypto.randomUUID();
            const { error } = await supabase
                .from('profiles')
                .update({ telegram_connect_token: token })
                .eq('id', profile.id);

            if (error) throw error;
            const url = `https://t.me/${botUsername}?start=${token}`;
            setConnectUrl(url);
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
        <section className="space-y-1">
            <div className="flex items-center justify-between px-6 mb-6">
                <h3 className="text-[10px] font-black text-muted-foreground/20 tracking-[0.5em] uppercase">Integrations</h3>
                {isConnected && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10">
                        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[9px] font-black text-emerald-500 tracking-widest uppercase">Sync Active</span>
                    </div>
                )}
            </div>

            <div className="space-y-0.5">
                <div className="px-6 py-4 flex items-center justify-between active:bg-white/[0.03] transition-colors group">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="size-12 rounded-2xl bg-[#0088cc] flex items-center justify-center shadow-[0_12px_24px_-8px_rgba(0,136,204,0.6)] group-hover:scale-105 transition-all duration-500">
                                <svg viewBox="0 0 24 24" className="size-6 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.721-2.43 10.32-2.43 10.32-.12.48-.3.6-.54.6-.3 0-.54-.12-.84-.36l-3.3-2.43-1.62 1.56c-.18.18-.3.3-.48.3s-.18-.06-.18-.24v-4.32l6.36-5.76c.3-.24-.06-.36-.42-.12l-7.86 4.92-3.9-1.26c-.84-.24-.84-.84.18-1.2l15.18-5.82c.72-.24 1.32.18 1.14 1.38z"/>
                                </svg>
                            </div>
                            {isConnected && (
                                <div className="absolute -top-1 -right-1 size-5 rounded-full bg-emerald-500 border-[2px] border-[#09090b] flex items-center justify-center text-white shadow-xl">
                                    <CheckCircle2 size={10} strokeWidth={4} />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-[14px] font-black text-foreground tracking-tight mb-0.5">Telegram Bot</p>
                            <p className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.1em]">
                                {isConnected ? 'Active Command Center' : 'Remote Entry Link'}
                            </p>
                        </div>
                    </div>

                    {isConnected ? (
                        <button
                            onClick={handleDisconnect}
                            disabled={loading}
                            className="h-9 px-4 rounded-xl bg-rose-500/5 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                            Disconnect
                        </button>
                    ) : (
                        <button
                            onClick={handleConnect}
                            disabled={loading}
                            className="h-10 px-6 rounded-xl bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                        >
                            {loading ? <RefreshCw size={12} className="animate-spin" /> : 'Connect'}
                        </button>
                    )}
                </div>

                {isConnected && (
                    <div className="mx-6 mt-4 p-8 rounded-[40px] bg-zinc-900/40 space-y-8 animate-in slide-in-from-top-4 duration-700">
                        <div className="grid grid-cols-1 gap-6">
                            {[
                                { text: 'Automated income tracking', icon: Zap },
                                { text: 'Voice command recognition', icon: Zap },
                                { text: 'Realtime balance updates', icon: Zap },
                            ].map((f, i) => (
                                <div key={i} className="flex items-center gap-5">
                                    <div className="size-6 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <f.icon size={12} className="text-emerald-500" />
                                    </div>
                                    <span className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.1em]">{f.text}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-8 border-t border-white/[0.02]">
                            <p className="text-[9px] font-black text-muted-foreground/20 tracking-[0.4em] mb-5 uppercase">System Commands</p>
                            <div className="grid grid-cols-2 gap-3">
                                {['/saldo', '/laporan', 'out 50k', 'in 1m'].map((cmd, i) => (
                                    <div key={i} className="px-4 py-3 rounded-2xl bg-black/40 flex items-center justify-center">
                                        <code className="text-[12px] font-mono text-emerald-500/60 font-bold">{cmd}</code>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {!isConnected && connectUrl && (
                    <div className="mx-6 mt-4 p-8 rounded-[48px] bg-primary/5 space-y-6 animate-in zoom-in-95 duration-700 relative overflow-hidden border border-primary/10">
                        <div className="flex items-center gap-5">
                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <ExternalLink size={24} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-[14px] font-black text-foreground uppercase tracking-tight">Handshake Pending</p>
                                <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest">Awaiting Verification</p>
                            </div>
                        </div>
                        <p className="text-[12px] font-black text-muted-foreground/40 uppercase leading-relaxed tracking-tight">
                            Open the bot and tap <span className="text-primary">START</span> to complete the link.
                        </p>
                        <button
                            onClick={checkConnection}
                            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/40 active:scale-95 transition-all"
                        >
                            Verify Link ✓
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default TelegramConnect;
