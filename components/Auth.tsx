import React, { useState, useEffect } from 'react';
import { signIn, signUp, resetPasswordForEmail, updateUserPassword } from '../lib/supabase';

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

    useEffect(() => {
        // Detect if we're coming from a password reset link
        if (window.location.hash && window.location.hash.includes('type=recovery')) {
            setMode('reset');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (mode === 'login') {
                const { error } = await signIn(email, password);
                if (error) throw error;
                onSuccess();
            } else if (mode === 'signup') {
                const { error } = await signUp(email, password, fullName);
                if (error) throw error;
                setSuccessMsg('Check your email for verification link!');
            } else if (mode === 'forgot') {
                const { error } = await resetPasswordForEmail(email);
                if (error) throw error;
                setSuccessMsg('Reset link sent to your email!');
            } else if (mode === 'reset') {
                const { error } = await updateUserPassword(password);
                if (error) throw error;
                setSuccessMsg('Password updated successfully! Redirecting...');
                setTimeout(() => {
                    setMode('login');
                    setSuccessMsg('');
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const isLogin = mode === 'login';
    const isSignup = mode === 'signup';
    const isForgot = mode === 'forgot';
    const isReset = mode === 'reset';

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 font-['Inter'] selection:bg-[#00d293]/20 selection:text-[#00d293]">
            {/* Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#00d293]/10 rounded-full blur-[140px] animate-blob"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
            </div>

            <div className="w-full max-w-[420px] relative z-10 animate-in fade-in zoom-in-95 duration-1000">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-emerald-600 border border-emerald-400/20 mb-6 relative group shadow-2xl shadow-emerald-500/20">
                        <div className="absolute inset-0 bg-emerald-400/30 blur-2xl rounded-full opacity-50"></div>
                        <i className="fa-solid fa-wallet text-3xl text-black z-10"></i>
                    </div>
                    <h1 className="text-[20px] font-black tracking-tight text-white mb-1">
                        {isForgot ? 'Reset Password' : isReset ? 'New Password' : 'ArtosKu'}
                    </h1>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
                        {isForgot ? 'Enter email to receive reset link' : isReset ? 'Choose a strong key' : 'Personal Finance Manager'}
                    </p>
                </div>

                <div className="bg-zinc-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-[32px] shadow-2xl">
                    {(isLogin || isSignup) && (
                        <div className="flex gap-1.5 mb-8 p-1.5 bg-black/40 rounded-[1.25rem] border border-white/5">
                            <button
                                onClick={() => setMode('login')}
                                className={`flex-1 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-500 ${isLogin ? 'bg-[#00d293] text-black' : 'text-zinc-500 hover:text-white'}`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setMode('signup')}
                                className={`flex-1 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-500 ${isSignup ? 'bg-[#00d293] text-black' : 'text-zinc-500 hover:text-white'}`}
                            >
                                Join Now
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignup && (
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-2">Full Name</label>
                                <div className="relative">
                                    <i className="fa-solid fa-user absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs"></i>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full h-14 bg-black/60 rounded-2xl pl-12 text-[14px] text-white border border-white/5 outline-none"
                                        placeholder="Full Name"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {!isReset && (
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-2">Email Address</label>
                                <div className="relative">
                                    <i className="fa-solid fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs"></i>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-14 bg-black/60 rounded-2xl pl-12 text-[14px] text-white border border-white/5 outline-none"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {(isLogin || isSignup || isReset) && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-end px-2">
                                    <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">
                                        {isReset ? 'New Password' : 'Password'}
                                    </label>
                                    {isLogin && (
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot')}
                                            className="text-[9px] font-medium text-[#00d293] hover:text-[#00d293]/80 transition-colors"
                                        >
                                            Lupa Password?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <i className="fa-solid fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs"></i>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-14 bg-black/60 rounded-2xl pl-12 text-[14px] text-white border border-white/5 outline-none"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[11px] font-bold">
                                <i className="fa-solid fa-circle-exclamation mr-2"></i> {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-4 rounded-2xl bg-[#00d293]/10 text-[#00d293] border border-[#00d293]/20 text-[11px] font-bold">
                                <i className="fa-solid fa-circle-check mr-2"></i> {successMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-[#00d293] text-black rounded-full text-[12px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#00d293]/20 mt-6 active:scale-95 transition-all"
                        >
                            {loading ? 'Memproses...' :
                                isForgot ? 'Send Reset Link' :
                                    isReset ? 'Update Password' :
                                        isLogin ? 'Sign In' : 'Create Account'}
                        </button>

                        {isForgot && (
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="w-full mt-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
                            >
                                <i className="fa-solid fa-arrow-left mr-2"></i> Back to Login
                            </button>
                        )}
                    </form>
                </div>

                <div className="mt-8 text-center space-y-2">
                    <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.2em]">Secured by Supabase</p>
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-px w-12 bg-zinc-800"></div>
                        <p className="text-[10px] font-medium text-zinc-600">
                            ArtosKu Made by <span className="text-emerald-500 font-bold">Rudi Siarudin</span>
                        </p>
                        <div className="h-px w-12 bg-zinc-800"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
