import React, { useState, useEffect } from 'react';
import { signIn, signUp, resetPasswordForEmail, updateUserPassword } from '../lib/supabase';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ChevronLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { vibrate } from '@/lib/utils';

interface AuthProps {
    onSuccess: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (window.location.hash && window.location.hash.includes('type=recovery')) {
            setMode('reset');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);
        vibrate(5);

        try {
            if (mode === 'login') {
                const { error } = await signIn(email, password);
                if (error) throw error;
                onSuccess();
            } else if (mode === 'signup') {
                const { error } = await signUp(email, password, fullName);
                if (error) throw error;
                setSuccessMsg('Verification link sent.');
            } else if (mode === 'forgot') {
                const { error } = await resetPasswordForEmail(email);
                if (error) throw error;
                setSuccessMsg('Instructions sent.');
            } else if (mode === 'reset') {
                const { error } = await updateUserPassword(password);
                if (error) throw error;
                setSuccessMsg('Security key updated.');
                setTimeout(() => setMode('login'), 2000);
            }
        } catch (err: any) {
            setError(err.message || 'Access denied.');
            vibrate([10, 50, 10]);
        } finally {
            setLoading(false);
        }
    };

    const isLogin = mode === 'login';
    const isSignup = mode === 'signup';

    return (
        <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 selection:bg-emerald-500/20 font-sans">
            <div className="w-full max-w-[360px] space-y-10">
                {/* Branding */}
                <div className="text-center space-y-3">
                    <div className="size-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto mb-4 shadow-2xl">
                        <img src="/pwa-192x192.png" alt="ArtosKu" className="size-8" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white uppercase italic text-center w-full">ArtosKu</h1>
                    <p className="text-[10px] font-bold text-zinc-500 tracking-[0.4em] uppercase text-center w-full">Private Asset Node</p>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 rounded-[2rem] p-8 shadow-2xl space-y-8">
                    {/* Consistent Segmented Toggle */}
                    <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-white/5 relative h-12">
                        <div 
                            className={`absolute inset-y-1.5 rounded-lg bg-zinc-800 transition-all duration-300 ease-in-out shadow-lg ${
                                isLogin ? 'left-1.5 w-[calc(50%-4px)]' : 'left-[calc(50%+3px)] w-[calc(50%-9px)]'
                            }`}
                            style={{ width: 'calc(50% - 6px)' }}
                        />
                        <button
                            onClick={() => { setMode('login'); vibrate(2); }}
                            className={`relative z-10 flex-1 flex items-center justify-center text-[11px] font-bold tracking-widest uppercase transition-colors ${isLogin ? 'text-white' : 'text-zinc-500'}`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setMode('signup'); vibrate(2); }}
                            className={`relative z-10 flex-1 flex items-center justify-center text-[11px] font-bold tracking-widest uppercase transition-colors ${isSignup ? 'text-white' : 'text-zinc-500'}`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {isSignup && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Identity</label>
                                <div className="flex items-center bg-zinc-950 border border-white/5 rounded-xl px-4 h-12 focus-within:border-emerald-500/20 transition-all">
                                    <User className="size-4 text-zinc-500 shrink-0" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-transparent pl-3 text-sm text-white placeholder:text-zinc-800 outline-none"
                                        placeholder="Full Name"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Access Point</label>
                            <div className="flex items-center bg-zinc-950 border border-white/5 rounded-xl px-4 h-12 focus-within:border-emerald-500/20 transition-all">
                                <Mail className="size-4 text-zinc-500 shrink-0" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-transparent pl-3 text-sm text-white placeholder:text-zinc-800 outline-none"
                                    placeholder="name@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Security Key</label>
                                {isLogin && (
                                    <button
                                        type="button"
                                        onClick={() => setMode('forgot')}
                                        className="text-[10px] font-bold text-emerald-500/50 hover:text-emerald-500 transition-colors uppercase"
                                    >
                                        Recover
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center bg-zinc-950 border border-white/5 rounded-xl px-4 h-12 focus-within:border-emerald-500/20 transition-all">
                                <Lock className="size-4 text-zinc-500 shrink-0" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-transparent pl-3 pr-2 text-sm text-white placeholder:text-zinc-800 outline-none tracking-widest"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-zinc-500 hover:text-emerald-500 transition-colors ml-auto shrink-0"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-[10px] font-bold text-rose-500 uppercase text-center tracking-tight">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-emerald-500 text-black rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] mt-6 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/10"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin size-5" />
                            ) : (
                                <>
                                    Confirm Access
                                    <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Secure Footer */}
                <div className="text-center pt-4 opacity-20">
                    <div className="flex items-center justify-center gap-2">
                        <ShieldCheck size={12} className="text-emerald-500" />
                        <span className="text-[8px] font-black uppercase tracking-[0.4em]">End-to-End Encryption Standard</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;

