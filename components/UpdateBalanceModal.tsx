import React, { useState, useEffect } from 'react';
import { TransactionType, Category, Wallet } from '../types';
import { formatIDR } from '../lib/utils';

interface UpdateBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    wallet: Wallet | null;
    onUpdate: (walletId: string, newBalance: number, diff: number) => void;
}

const UpdateBalanceModal: React.FC<UpdateBalanceModalProps> = ({ isOpen, onClose, wallet, onUpdate }) => {
    const [newBalance, setNewBalance] = useState('0');

    useEffect(() => {
        if (isOpen && wallet) {
            setNewBalance(wallet.balance.toString());
        }
    }, [isOpen, wallet]);

    const handleSubmit = () => {
        if (!wallet) return;
        const numericBalance = parseFloat(newBalance);
        const currentBalance = Number(wallet.balance);
        const diff = numericBalance - currentBalance;

        if (diff === 0) {
            onClose();
            return;
        }

        onUpdate(wallet.id, numericBalance, diff);
        onClose();
    };

    if (!isOpen || !wallet) return null;

    const diff = parseFloat(newBalance || '0') - Number(wallet.balance);

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <div
                className="absolute inset-0 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-700"
                onClick={onClose}
            ></div>

            <div className="relative bg-[var(--bg-card)] w-full max-w-md rounded-t-[3.5rem] shadow-2xl flex flex-col overflow-hidden border-t border-[var(--border-subtle)] animate-in slide-in-from-bottom duration-700 elite-glow">
                <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -ml-32 -mt-32 pointer-events-none"></div>

                <div className="w-full flex justify-center pt-5 pb-2 relative z-10">
                    <div className="w-12 h-1.5 bg-[var(--border-subtle)] rounded-full opacity-40"></div>
                </div>

                <div className="px-6 py-4 flex justify-between items-center relative z-10 gap-3">
                    <button onClick={onClose} className="w-11 h-11 shrink-0 rounded-2xl glass-morphism border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500 transition-all active:scale-90">
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>

                    <div className="flex-1 flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-2.5 rounded-2xl min-w-0">
                        <i className="fa-solid fa-pen-to-square text-blue-500 text-[10px] shrink-0"></i>
                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-blue-500 truncate">Update Total Balance</span>
                    </div>

                    <button onClick={handleSubmit} className="w-11 h-11 shrink-0 rounded-2xl bg-emerald-500 text-[#09090b] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center">
                        <i className="fa-solid fa-check font-bold text-sm"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-6 space-y-8 pb-10 relative z-10">
                    <div className="text-center py-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">{wallet.name} Current Balance</p>
                        <h2 className="text-[18px] font-bold text-white mb-2">{formatIDR(wallet.balance)}</h2>

                        <div className="h-px bg-white/5 w-1/2 mx-auto mb-6"></div>

                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2">New Total Balance</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-sm font-bold text-zinc-500">IDR</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={newBalance === '0' ? '' : newBalance.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\./g, '');
                                    if (/^\d*$/.test(val)) {
                                        setNewBalance(val || '0');
                                    }
                                }}
                                className="bg-transparent border-none outline-none text-5xl font-black tracking-tighter text-white w-full text-center tabular-nums placeholder:text-zinc-800"
                                placeholder="0"
                                autoFocus
                            />
                        </div>

                        {diff !== 0 && (
                            <div className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl border animate-in zoom-in duration-300 ${diff > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                <i className={`fa-solid ${diff > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-xs`}></i>
                                <span className="text-[10px] font-black uppercase tracking-wider">
                                    {diff > 0 ? 'GAIN' : 'LOSS'}: {formatIDR(Math.abs(diff))}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateBalanceModal;
