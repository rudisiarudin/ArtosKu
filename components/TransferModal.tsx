import React, { useState } from 'react';
import { Wallet, TransactionType } from '../types';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransfer: (fromWalletId: string, toWalletId: string, amount: number, description: string) => void;
    wallets: Wallet[];
    theme: 'light' | 'dark';
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onTransfer, wallets, theme }) => {
    const [fromWalletId, setFromWalletId] = useState<string>(wallets[0]?.id || '');
    const [toWalletId, setToWalletId] = useState<string>(wallets[1]?.id || '');
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState<string>('');

    // Update selection when wallets are loaded
    React.useEffect(() => {
        if (wallets.length > 0) {
            if (!fromWalletId) setFromWalletId(wallets[0].id);
            if (!toWalletId && wallets.length > 1) setToWalletId(wallets[1].id);
        }
    }, [wallets]);

    if (!isOpen) return null;

    const handleTransfer = () => {
        const numAmount = Number(amount.replace(/\D/g, ''));
        if (numAmount > 0 && fromWalletId && toWalletId && fromWalletId !== toWalletId) {
            onTransfer(fromWalletId, toWalletId, numAmount, description || 'Transfer antar aset');
            onClose();
            // Reset
            setAmount('');
            setDescription('');
        }
    };

    const formatIDR = (val: string) => {
        if (!val) return '';
        const num = val.replace(/\D/g, '');
        return new Intl.NumberFormat('id-ID').format(Number(num));
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
            <div className="bg-zinc-900 w-full max-w-[360px] p-6 rounded-[2.5rem] border border-white/5 relative z-10 animate-in slide-in-from-bottom-10 duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-emerald-500">Transfer Funds</h3>
                        <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-widest mt-1">Move money between accounts</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                        <i className="fa-solid fa-times text-xs"></i>
                    </button>
                </div>

                <div className="space-y-5">
                    {/* Source Wallet */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Source Wallet</label>
                        <div className="relative">
                            <select
                                value={fromWalletId}
                                onChange={(e) => setFromWalletId(e.target.value)}
                                className="w-full h-14 bg-black rounded-2xl px-5 text-[14px] font-black text-white border border-white/5 focus:border-emerald-500/50 outline-none appearance-none transition-all"
                            >
                                {wallets.map(w => (
                                    <option key={w.id} value={w.id}>{w.name} (Rp{new Intl.NumberFormat('id-ID').format(w.balance)})</option>
                                ))}
                            </select>
                            <i className="fa-solid fa-arrow-right-from-bracket absolute right-5 top-1/2 -translate-y-1/2 text-zinc-700 text-[10px]"></i>
                        </div>
                    </div>

                    {/* Icon Gap */}
                    <div className="flex justify-center -my-3 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] border-4 border-zinc-900">
                            <i className="fa-solid fa-arrow-down-long"></i>
                        </div>
                    </div>

                    {/* Destination Wallet */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Destination Wallet</label>
                        <div className="relative">
                            <select
                                value={toWalletId}
                                onChange={(e) => setToWalletId(e.target.value)}
                                className="w-full h-14 bg-black rounded-2xl px-5 text-[14px] font-black text-white border border-white/5 focus:border-emerald-500/50 outline-none appearance-none transition-all"
                            >
                                {wallets.map(w => (
                                    <option key={w.id} value={w.id}>{w.name} (Rp{new Intl.NumberFormat('id-ID').format(w.balance)})</option>
                                ))}
                            </select>
                            <i className="fa-solid fa-arrow-right-to-bracket absolute right-5 top-1/2 -translate-y-1/2 text-zinc-700 text-[10px]"></i>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2 mt-4">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Transfer Amount</label>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[12px] font-black text-zinc-700">IDR</span>
                            <input
                                type="text"
                                placeholder="0"
                                value={formatIDR(amount)}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full h-16 bg-black rounded-2xl pl-14 pr-5 text-[18px] font-black text-white border border-white/5 focus:border-emerald-500/50 outline-none transition-all placeholder:text-zinc-800 tabular-nums"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Note (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. Tarik Tunai Mandiri"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full h-12 bg-black rounded-xl px-5 text-[12px] font-medium text-white border border-white/5 focus:border-emerald-500/50 outline-none transition-all placeholder:text-zinc-800"
                        />
                    </div>

                    <button
                        onClick={handleTransfer}
                        disabled={!amount || fromWalletId === toWalletId}
                        className="w-full h-12 bg-emerald-500 disabled:opacity-30 disabled:grayscale text-black rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2.5 active:scale-[0.98] hover:bg-emerald-400 transition-all mt-4 border-none"
                    >
                        Confirm Transaction <i className="fa-solid fa-check text-[10px]"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferModal;
