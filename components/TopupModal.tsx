
import React, { useState, useEffect } from 'react';
import { TransactionType, Category, Wallet, WalletType } from '../types';
import { getLocalIsoDate, getCurrentTimestamp } from '../lib/utils';

interface TopupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (t: any) => void;
    wallets: Wallet[];
    prefilledWalletId?: string;
    onTransfer?: (fromId: string, toId: string, amount: number, description: string) => Promise<void>;
    theme: 'light' | 'dark';
    title?: string;
    defaultDescription?: string;
}

const TopupModal: React.FC<TopupModalProps> = React.memo(({ isOpen, onClose, onAdd, onTransfer, wallets, prefilledWalletId, theme, title, defaultDescription }) => {
    const [sourceWalletId, setSourceWalletId] = useState<string | 'EXTERNAL'>('EXTERNAL');
    const [formData, setFormData] = useState({
        amount: '0',
        type: TransactionType.INCOME,
        category: 'Topup' as Category,
        date: getCurrentTimestamp(),
        description: '',
        walletId: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                amount: '0',
                type: TransactionType.INCOME,
                category: 'Topup' as Category,
                date: getCurrentTimestamp(),
                description: defaultDescription || '',
                walletId: prefilledWalletId || wallets[0]?.id || ''
            });
            setSourceWalletId('EXTERNAL');
        }
    }, [isOpen, prefilledWalletId, wallets, defaultDescription]);

    const handleSubmit = () => {
        const numericAmount = parseFloat(formData.amount);
        if (numericAmount <= 0) {
            alert('Please enter an amount greater than 0');
            return;
        }
        if (!formData.walletId) {
            alert('Please select a wallet');
            return;
        }

        if (sourceWalletId !== 'EXTERNAL' && onTransfer && formData.walletId) {
            // Check if source and dest are same
            if (sourceWalletId === formData.walletId) {
                alert('Source and destination cannot be the same');
                return;
            }
            onTransfer(sourceWalletId, formData.walletId, numericAmount, formData.description || 'Quick Deposit');
        } else {
            onAdd({
                ...formData,
                amount: numericAmount,
                description: formData.description.trim() || 'Top Up'
            });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <div
                className="absolute inset-0 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-700"
                onClick={onClose}
            ></div>

            <div className="relative bg-[var(--bg-card)] w-full max-w-md h-[80vh] rounded-t-[3.5rem] shadow-2xl flex flex-col overflow-hidden border-t border-[var(--border-subtle)] animate-in slide-in-from-bottom duration-700 elite-glow">
                <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -ml-32 -mt-32 pointer-events-none"></div>

                <div className="w-full flex justify-center pt-5 pb-2 relative z-10">
                    <div className="w-12 h-1.5 bg-[var(--border-subtle)] rounded-full opacity-40"></div>
                </div>

                <div className="px-8 py-4 flex justify-between items-center relative z-10">
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl glass-morphism border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500 transition-all active:scale-90">
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>

                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-6 py-2.5 rounded-2xl">
                        <i className="fa-solid fa-circle-arrow-up text-emerald-500 text-xs"></i>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">{title || 'Quick Top Up'}</span>
                    </div>

                    <button onClick={handleSubmit} className="w-12 h-12 rounded-2xl bg-emerald-500 text-[#09090b] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center">
                        <i className="fa-solid fa-check font-bold"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-6 space-y-8 pb-8 relative z-10">
                    <div className="text-center py-6 group">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mb-3 opacity-100 dark:opacity-80">
                            Top Up Amount
                        </p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-sm font-bold text-emerald-500/40">IDR</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formData.amount === '0' ? '' : formData.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\./g, '');
                                    if (/^\d*$/.test(val)) {
                                        setFormData(prev => ({ ...prev, amount: val || '0' }));
                                    }
                                }}
                                className="bg-transparent border-none outline-none text-5xl font-bold tracking-tighter text-[var(--text-primary)] w-56 text-center tabular-nums placeholder:text-[var(--text-muted)] mt-[-6px]"
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                    </div>

                    <section className="px-2">
                        <h3 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4 ml-2">
                            Source of Funds
                        </h3>

                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {/* External Option */}
                            <button
                                onClick={() => setSourceWalletId('EXTERNAL')}
                                className={`min-w-[120px] p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${sourceWalletId === 'EXTERNAL' ? 'bg-[#18181b] border-emerald-500/50 text-white' : 'glass-morphism border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-emerald-500/30'}`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-2">
                                    <i className="fa-solid fa-cloud-arrow-down text-xs"></i>
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-tight">Income / External</p>
                                {sourceWalletId === 'EXTERNAL' && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
                            </button>

                            {/* Wallet Options */}
                            {wallets.filter(w => w.id !== formData.walletId).map(w => (
                                <button
                                    key={w.id}
                                    onClick={() => setSourceWalletId(w.id)}
                                    className={`min-w-[120px] p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${sourceWalletId === w.id ? 'bg-[#18181b] border-emerald-500/50 text-white' : 'glass-morphism border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-emerald-500/30'}`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2 group-hover:text-emerald-500 transition-colors">
                                        <i className={`fa-solid ${w.icon || (w.type === WalletType.BANK ? 'fa-building-columns' : 'fa-wallet')} text-xs`}></i>
                                    </div>
                                    <p className="text-[7.5px] font-bold uppercase tracking-widest opacity-60 mb-1">{w.type}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-tight truncate">{w.name}</p>
                                    <p className="text-[9px] font-medium text-zinc-500 truncate">Rp{new Intl.NumberFormat('id-ID').format(Number(w.balance))}</p>
                                    {sourceWalletId === w.id && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
                                </button>
                            ))}
                        </div>

                        {/* Optional Description Input if needed */}
                        {sourceWalletId === 'EXTERNAL' && (
                            <div className="mt-4 px-1">
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-transparent border-b border-[var(--border-subtle)] py-2 text-[12px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-emerald-500 transition-colors"
                                    placeholder="Add note (e.g. Salary)..."
                                />
                            </div>
                        )}
                    </section>

                    <section className="px-2 pb-6">
                        <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-3 ml-2">Payment Destination</h3>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {wallets.map(w => (
                                <button
                                    key={w.id}
                                    onClick={() => setFormData(d => ({ ...d, walletId: w.id }))}
                                    className={`min-w-[130px] p-4 rounded-xl border transition-all duration-500 text-left relative overflow-hidden group ${formData.walletId === w.id ? 'bg-[#18181b] border-emerald-500/50 text-white' : 'glass-morphism border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-emerald-500/30'}`}
                                >
                                    <p className="text-[7.5px] font-bold uppercase tracking-widest opacity-60 mb-1.5">{w.type}</p>
                                    <p className="text-[11px] font-bold uppercase tracking-tight truncate">{w.name}</p>
                                    {formData.walletId === w.id && (
                                        <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="px-8 pb-6 pt-3 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] relative z-20">
                    <button
                        onClick={handleSubmit}
                        className="w-full h-12 rounded-xl bg-emerald-500 text-[#09090b] shadow-xl shadow-emerald-500/20 text-[10px] font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2.5 active:scale-[0.98] hover:bg-emerald-400 transition-all border-none"
                    >
                        Confirm Transaction <i className="fa-solid fa-check text-[10px]"></i>
                    </button>
                </div>
            </div>
        </div>
    );
});

export default TopupModal;
