import React, { useState, useEffect, useRef } from 'react';
import { TransactionType, Category, Wallet } from '../types';
import { formatIDR } from '../lib/utils';
import { extractAmountFromImage } from '../services/ocrService';

interface UpdateBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    wallet: Wallet | null;
    onUpdate: (walletId: string, newBalance: number, diff: number) => void;
}

const UpdateBalanceModal: React.FC<UpdateBalanceModalProps> = ({ isOpen, onClose, wallet, onUpdate }) => {
    const [newBalance, setNewBalance] = useState('0');
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrMessage, setOcrMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && wallet) {
            setNewBalance(wallet.balance.toString());
            setOcrMessage(null);
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

    const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setOcrLoading(true);
        setOcrMessage(null);

        try {
            const result = await extractAmountFromImage(file);
            if (result.amount !== null && result.amount > 0) {
                setNewBalance(result.amount.toString());
                setOcrMessage({
                    text: `✓ Ketemu: ${formatIDR(result.amount)}${result.rawText ? ` (${result.rawText})` : ''}`,
                    type: 'success'
                });
            } else {
                setOcrMessage({ text: 'Nominal tidak ditemukan, coba gambar lain', type: 'error' });
            }
        } catch (err: any) {
            setOcrMessage({ text: err.message || 'Gagal scan gambar', type: 'error' });
        } finally {
            setOcrLoading(false);
            // Reset file input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (!isOpen || !wallet) return null;

    const diff = parseFloat(newBalance || '0') - Number(wallet.balance);

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <div
                className="fixed inset-0 bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-md z-40 transition-opacity duration-700 animate-in fade-in"
                onClick={onClose}
            ></div>

            <div className="relative bg-[var(--bg-deep)] w-full max-w-md h-[92vh] rounded-t-[3.5rem] shadow-2xl flex flex-col overflow-hidden border-t border-[var(--border-subtle)] animate-in slide-in-from-bottom-[60%] duration-700 elite-glow z-50">
                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 blur-[120px] rounded-full -ml-32 -mt-32 pointer-events-none"></div>

                {/* Modal Handle */}
                <div className="w-12 h-1.5 bg-[var(--bg-card)] rounded-full mx-auto mt-4 mb-1 relative z-10"></div>

                <div className="px-6 py-4 flex justify-between items-center relative z-10">
                    <button onClick={onClose} className="w-11 h-11 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all active:scale-90 press-scale">
                        <i className="fa-solid fa-chevron-down text-sm"></i>
                    </button>

                    <div className="flex bg-blue-500/5 px-6 py-2.5 rounded-full border border-blue-500/20 shadow-inner">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Adjustment</span>
                    </div>

                    <button onClick={handleSubmit} className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 active:scale-95 transition-all flex items-center justify-center press-scale">
                        <i className="fa-solid fa-check text-sm"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-10 relative z-10">
                    <div className="text-center py-8 animate-fade-up delay-100">
                        <p className="text-[9px] font-bold tracking-[0.2em] text-[var(--text-muted)] opacity-50 mb-2 uppercase">{wallet.name} Current State</p>
                        <h2 className="text-xl font-bold text-[var(--text-primary)] opacity-40 tracking-tighter tabular-nums mb-8">{formatIDR(wallet.balance)}</h2>

                        <div className="relative inline-block py-4">
                            <span className="absolute -left-12 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-[0.2em] text-blue-500/30">IDR</span>
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
                                className="bg-transparent border-none outline-none text-7xl font-black tracking-tighter text-[var(--text-primary)] w-full text-center tabular-nums placeholder:text-[var(--text-muted)] placeholder:opacity-10 drop-shadow-[0_0_30px_rgba(59,130,246,0.15)]"
                                placeholder="0"
                                autoFocus
                            />
                        </div>

                        <div className="h-10 mt-4">
                            {diff !== 0 && (
                                <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border animate-scale-in transition-all duration-700 ${diff > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                    <i className={`fa-solid ${diff > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-[10px]`}></i>
                                    <span className="text-[10px] font-bold tracking-widest uppercase">
                                        {diff > 0 ? 'Surplus' : 'Deficit'} {formatIDR(Math.abs(diff))}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* OCR Scan Section */}
                    <div className="px-6 animate-fade-up delay-200">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleScanImage}
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={ocrLoading}
                            className="w-full flex items-center justify-center gap-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl py-5 text-[var(--text-muted)] hover:text-cyan-400 hover:bg-cyan-500/5 hover:border-cyan-500/20 transition-all active:scale-95 disabled:opacity-50 press-scale group/ocr"
                        >
                            {ocrLoading ? (
                                <>
                                    <div className="w-4 h-4 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin"></div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Analyzing...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-scan text-sm group-hover/ocr:scale-110 transition-transform"></i>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Scan Statement</span>
                                </>
                            )}
                        </button>

                        {ocrMessage && (
                            <div className={`mt-4 flex items-start gap-3 px-5 py-4 rounded-2xl text-[10px] font-bold animate-fade-up ${ocrMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                                <i className={`fa-solid ${ocrMessage.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} mt-0.5 shrink-0`}></i>
                                <span className="text-[var(--text-muted)] leading-relaxed font-bold uppercase tracking-widest">{ocrMessage.text}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Action */}
                <div className="absolute bottom-0 left-0 right-0 px-8 pb-10 pt-6 bg-gradient-to-t from-[var(--bg-deep)] via-[var(--bg-deep)] to-transparent z-30 animate-fade-up delay-300">
                    <button
                        onClick={handleSubmit}
                        className="w-full h-16 rounded-2xl bg-blue-500 text-white shadow-2xl shadow-blue-500/20 text-[12px] font-bold tracking-[0.15em] flex items-center justify-center gap-4 active:scale-[0.97] transition-all press-scale border-none uppercase"
                    >
                        Save adjustment <i className="fa-solid fa-arrow-right-long"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateBalanceModal;
