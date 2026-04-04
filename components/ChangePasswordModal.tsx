import React, { useState } from 'react';
import { updateUserPassword } from '../lib/supabase';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await updateUserPassword(password);
            if (updateError) throw updateError;

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setPassword('');
                setConfirmPassword('');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1200] bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-[340px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-8 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/5">
                        <i className="fa-solid fa-key text-2xl text-emerald-500"></i>
                    </div>
                    <h3 className="text-lg font-black text-[var(--text-primary)] mb-1">Update Password</h3>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase opacity-50">Secure your account</p>
                </div>

                {success ? (
                    <div className="text-center py-4 space-y-3 animate-in fade-in zoom-in-95">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                            <i className="fa-solid fa-check text-emerald-500"></i>
                        </div>
                        <p className="text-[12px] font-bold text-emerald-500">Password updated successfully!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-[var(--text-muted)] tracking-widest uppercase px-1 opacity-60">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-12 bg-[rgba(var(--bg-inner-rgb),0.5)] rounded-xl px-4 text-sm font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-emerald-500/40 outline-none transition-all placeholder:text-[var(--text-muted)] placeholder:opacity-20"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-[var(--text-muted)] tracking-widest uppercase px-1 opacity-60">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-12 bg-[rgba(var(--bg-inner-rgb),0.5)] rounded-xl px-4 text-sm font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-emerald-500/40 outline-none transition-all placeholder:text-[var(--text-muted)] placeholder:opacity-20"
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-[10px] font-bold text-rose-500 text-center px-2">{error}</p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 h-12 rounded-xl text-[10px] font-black text-[var(--text-muted)] tracking-widest hover:text-[var(--text-primary)] transition-colors opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 h-12 bg-emerald-500 text-black rounded-xl text-[10px] font-black tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95"
                            >
                                {loading ? 'Updating...' : 'Save Change'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ChangePasswordModal;
