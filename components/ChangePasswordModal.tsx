
import React, { useState } from 'react';
import { updateUserPassword } from '../lib/supabase';
import { Key, Check, ShieldAlert, X } from 'lucide-react';

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
        <div className="fixed inset-0 z-[1200] bg-background/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="w-full max-w-[360px] bg-card rounded-[40px] p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 shadow-black/40">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 size-9 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-90"
                >
                    <X size={18} />
                </button>

                <div className="text-center mb-10">
                    <div className="size-20 rounded-[32px] bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/5">
                        <Key size={32} className="text-primary" />
                    </div>
                    <h3 className="text-2xl font-black text-foreground mb-2 uppercase tracking-tight">Access Key</h3>
                    <p className="text-[10px] font-black text-muted-foreground/30 tracking-[0.3em] uppercase">Update Auth Credentials</p>
                </div>

                {success ? (
                    <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="size-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                            <Check size={32} className="text-emerald-500" strokeWidth={3} />
                        </div>
                        <p className="text-[14px] font-black text-emerald-500 uppercase tracking-tight">Security Updated</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2.5">
                            <label className="text-[9px] font-black text-muted-foreground/40 tracking-[0.2em] uppercase px-1">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-14 bg-muted/20 rounded-2xl px-6 text-sm font-black text-foreground focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/10"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="space-y-2.5">
                            <label className="text-[9px] font-black text-muted-foreground/40 tracking-[0.2em] uppercase px-1">Confirm Signature</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-14 bg-muted/20 rounded-2xl px-6 text-sm font-black text-foreground focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/10"
                                required
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 justify-center px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-in shake-in duration-300">
                                <ShieldAlert size={14} className="text-rose-500 shrink-0" />
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-tight">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black tracking-widest shadow-2xl shadow-primary/20 disabled:opacity-30 transition-all active:scale-95 uppercase"
                            >
                                {loading ? 'Securing...' : 'Verify Change'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ChangePasswordModal;
