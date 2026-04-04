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
    const [showPassword, setShowPassword] = useState(false);

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
        <div className="min-h-screen bg-[var(--bg-deep)] flex items-center justify-center p-6 selection:bg-[#00d293]/30 selection:text-[#00d293] font-sans overflow-hidden relative">
            {/* Advanced Mesh Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-[#00d293]/10 rounded-full blur-[160px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[140px] animate-pulse animation-delay-3000"></div>
                <div className="absolute top-[30%] left-[20%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse animation-delay-5000"></div>

                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            </div>

            <div className="w-full max-w-[400px] relative z-20">
                {/* Branding Section */}
                <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="w-20 h-20 rounded-2xl bg-[var(--bg-card)] flex items-center justify-center mb-6 mx-auto border border-[var(--border-subtle)] shadow-2xl backdrop-blur-md">
                        <img src="/pwa-192x192.png" alt="ArtosKu" className="w-11 h-11" />
                    </div>

                    <h1 className="text-5xl font-black tracking-tighter text-[var(--text-primary)] mb-2">
                        ArtosKu
                    </h1>
                    <p className="text-[10px] font-bold text-[#00d293] tracking-[0.4em] uppercase opacity-70">
                        {isForgot ? 'Secure Recovery' : isReset ? 'Set Security Key' : 'Financial Intelligence'}
                    </p>
                </div>

                <div className="bg-[rgba(var(--bg-card-rgb),0.6)] border border-[var(--border-subtle)] rounded-2xl p-9 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                    {(isLogin || isSignup) && (
                        <div className="flex gap-1.5 mb-10 p-1.5 bg-[rgba(var(--bg-inner-rgb),0.4)] rounded-2xl border border-[var(--border-subtle)] shadow-inner">
                            <button
                                onClick={() => setMode('login')}
                                className={`flex-1 py-3.5 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 ${isLogin ? 'bg-[#00d293] text-black shadow-lg shadow-[#00d293]/20' : 'text-[var(--text-muted)] opacity-50 hover:text-[var(--text-primary)]'}`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setMode('signup')}
                                className={`flex-1 py-3.5 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 ${isSignup ? 'bg-[#00d293] text-black shadow-lg shadow-[#00d293]/20' : 'text-[var(--text-muted)] opacity-50 hover:text-[var(--text-primary)]'}`}
                            >
                                Sign Up
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {isSignup && (
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 group-focus-within:text-[#00d293] transition-colors opacity-60">Full Name</label>
                                <div className="relative">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 flex items-center justify-center pointer-events-none">
                                        <i className="fa-solid fa-user text-[11px] text-[var(--text-muted)] opacity-30 group-focus-within:text-[#00d293] transition-colors"></i>
                                    </div>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full h-12 bg-transparent border-b border-[var(--border-subtle)] focus:border-[#00d293] outline-none pl-11 text-[15px] text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)] placeholder:opacity-20"
                                        placeholder="Full Name"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {!isReset && (
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 group-focus-within:text-[#00d293] transition-colors opacity-60">Email Address</label>
                                <div className="relative">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 flex items-center justify-center pointer-events-none">
                                        <i className="fa-solid fa-envelope text-[11px] text-zinc-600 group-focus-within:text-[#00d293] transition-colors"></i>
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-12 bg-transparent border-b border-[var(--border-subtle)] focus:border-[#00d293] outline-none pl-11 text-[15px] text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)] placeholder:opacity-20"
                                        placeholder="email@example.com"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {(isLogin || isSignup || isReset) && (
                            <div className="space-y-2 group">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest group-focus-within:text-[#00d293] transition-colors">
                                        {isReset ? 'New Password' : 'Password'}
                                    </label>
                                    {isLogin && (
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot')}
                                            className="text-[10px] font-bold text-[#00d293] hover:opacity-70 transition-opacity"
                                        >
                                            Forgot?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 flex items-center justify-center pointer-events-none">
                                        <i className="fa-solid fa-lock text-[11px] text-zinc-600 group-focus-within:text-[#00d293] transition-colors"></i>
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 bg-transparent border-b border-[var(--border-subtle)] focus:border-[#00d293] outline-none pl-11 pr-11 text-[15px] text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)] placeholder:opacity-20"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-zinc-600 hover:text-[#00d293] transition-colors"
                                    >
                                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-[11px]`}></i>
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-2xl bg-rose-500/5 text-rose-500 border border-rose-500/10 text-[11px] font-bold animate-shake">
                                <i className="fa-solid fa-triangle-exclamation mr-2"></i> {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-4 rounded-2xl bg-[#00d293]/5 text-[#00d293] border border-[#00d293]/10 text-[11px] font-bold animate-bounce-subtle">
                                <i className="fa-solid fa-circle-check mr-2"></i> {successMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-[60px] bg-[var(--text-primary)] text-[var(--bg-deep)] hover:opacity-90 rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] mt-8 active:scale-[0.98] transition-all disabled:opacity-50 relative overflow-hidden group/btn shadow-xl"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {loading ? (
                                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                                ) : (
                                    <>
                                        {isForgot ? 'Reset Access' : isReset ? 'Set Password' : isLogin ? 'Enter' : 'Start Now'}
                                        <i className="fa-solid fa-arrow-right text-[10px] opacity-30 group-hover/btn:translate-x-1 transition-transform"></i>
                                    </>
                                )}
                            </span>
                        </button>
                    </form>
                </div>

                {isForgot && (
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="w-full mt-8 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-primary)] transition-all py-2 opacity-50"
                    >
                        <i className="fa-solid fa-chevron-left text-[8px] mr-2"></i> Back to Login
                    </button>
                )}

                {/* Minimal Footer */}
                <div className="mt-20 text-center">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-[0.5em] uppercase mb-4 opacity-20">Secure Financial Layer</p>
                    <p className="text-[11px] font-medium text-[var(--text-muted)] opacity-50">
                        Crafted by <span className="text-[var(--text-primary)]">Rudi Siarudin</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
