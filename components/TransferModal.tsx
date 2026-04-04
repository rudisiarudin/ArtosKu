import React, { useState } from 'react';
import { Wallet, TransactionType, WalletType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransfer: (fromWalletId: string, toWalletId: string, amount: number, description: string) => void;
    wallets: Wallet[];
    theme: 'light' | 'dark';
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onTransfer, wallets, theme }) => {
    const { t } = useLanguage();
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
            onTransfer(fromWalletId, toWalletId, numAmount, description || t('transfer.internal_description'));
            onClose();
            // Reset
            setAmount('');
            setDescription('');
        }
    };

    const formatIDR = (val: string) => {
        if (!val) return '0';
        const num = val.replace(/\D/g, '');
        return new Intl.NumberFormat('id-ID').format(Number(num));
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <div
                className="fixed inset-0 bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-md z-40 transition-opacity duration-700 fade-in"
                onClick={onClose}
            ></div>

            <div className="relative bg-[var(--bg-deep)] w-full h-[100dvh] shadow-2xl flex flex-col overflow-hidden z-50 modal-sheet">
                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 blur-[120px] rounded-full -ml-32 -mt-32 pointer-events-none"></div>

                {/* Top Navigation */}
                <div className="flex items-center px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 justify-between relative z-10">
                    <button onClick={onClose} className="text-[var(--text-primary)] flex size-9 shrink-0 items-center justify-center rounded-full bg-[rgba(var(--bg-card-rgb),0.2)] transition-all active:scale-90">
                        <i className="fa-solid fa-xmark text-base"></i>
                    </button>
                    <h2 className="text-[var(--text-secondary)] text-sm font-medium leading-tight flex-1 text-center">{t('transfer.self_transfer')}</h2>
                    <div className="flex items-center">
                        <i className="fa-solid fa-circle-question text-[var(--text-muted)] opacity-30 text-base"></i>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
                    {/* Amount Input Section */}
                    <div className="flex flex-col items-center justify-center py-6 px-6">
                        <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-[0.2em] mb-4 opacity-50">{t('common.amount')}</p>
                        <div className="flex items-center justify-center gap-1.5">
                            <span className="text-rose-500/60 font-semibold" style={{ fontSize: '18px' }}>Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={amount === '0' ? '' : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\./g, '');
                                    if (/^\d*$/.test(val)) setAmount(val || '0');
                                }}
                                style={{
                                    fontSize: amount.length > 9 ? '36px' : amount.length > 7 ? '44px' : '52px',
                                    lineHeight: '1',
                                    fontWeight: 700,
                                    color: '#f43f5e',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    minWidth: '1ch',
                                    width: `${(amount === '0' ? 1 : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".").length) + 0.5}ch`,
                                    fontFamily: 'inherit',
                                    letterSpacing: '-0.02em',
                                    textAlign: 'left',
                                }}
                                className="tabular-nums transition-all duration-300 placeholder:text-[var(--text-muted)] opacity-30"
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                        <div className="mt-4 h-px w-12 bg-rose-500 rounded-full opacity-20" />
                    </div>

                    {/* Wallet Selectors */}
                    <section className="px-6 py-4">
                        <h3 className="text-[var(--text-primary)] text-sm font-bold uppercase tracking-wider mb-4 opacity-30">{t('transfer.from_wallet')}</h3>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4">
                            {wallets.map((w, i) => (
                                <button
                                    key={w.id}
                                    onClick={() => setFromWalletId(w.id)}
                                    className={`min-w-[120px] p-3 rounded-xl border transition-all duration-300 text-left relative group active:scale-95 ${fromWalletId === w.id ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/10' : 'bg-[rgba(var(--bg-card-rgb),0.4)] border-[var(--border-subtle)] opacity-50'}`}
                                >
                                    <div className={`size-8 rounded-lg flex items-center justify-center mb-3 transition-all ${fromWalletId === w.id ? 'bg-white/20 text-white' : 'bg-[rgba(var(--bg-inner-rgb),0.5)] text-[var(--text-muted)]'}`}>
                                        <i className={`fa-solid ${w.icon || (w.type === WalletType.BANK ? 'fa-building-columns' : 'fa-wallet')} text-xs`}></i>
                                    </div>
                                    <p className={`text-[9px] font-bold uppercase mb-0.5 ${fromWalletId === w.id ? 'text-white/60' : 'text-[var(--text-muted)] opacity-30'}`}>{t(`wallet.${w.type.toLowerCase()}`) || w.type}</p>
                                    <p className={`text-xs font-bold truncate ${fromWalletId === w.id ? 'text-white' : 'text-[var(--text-primary)]'}`}>{w.name}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    <div className="flex justify-center -my-2 relative z-20">
                        <div className="size-10 rounded-full bg-blue-500 flex items-center justify-center text-white border-4 border-[var(--bg-deep)] shadow-lg shadow-blue-500/20">
                            <i className="fa-solid fa-arrow-down-long text-xs"></i>
                        </div>
                    </div>

                    <section className="px-6 py-4">
                        <h3 className="text-[var(--text-primary)] text-sm font-bold uppercase tracking-wider mb-4 opacity-30">{t('transfer.to_wallet')}</h3>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4">
                            {wallets.map((w, i) => (
                                <button
                                    key={w.id}
                                    onClick={() => setToWalletId(w.id)}
                                    disabled={fromWalletId === w.id}
                                    className={`min-w-[130px] p-4 rounded-2xl border transition-all duration-300 text-left relative group active:scale-95 disabled:opacity-20 ${toWalletId === w.id ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-[rgba(var(--bg-card-rgb),0.4)] border-[var(--border-subtle)] opacity-50'}`}
                                >
                                    <div className={`size-10 rounded-xl flex items-center justify-center mb-4 transition-all ${toWalletId === w.id ? 'bg-white/20 text-white' : 'bg-[rgba(var(--bg-inner-rgb),0.5)] text-[var(--text-muted)]'}`}>
                                        <i className={`fa-solid ${w.icon || 'fa-wallet'} text-sm`}></i>
                                    </div>
                                    <p className={`text-[10px] font-bold uppercase mb-1 ${toWalletId === w.id ? 'text-white/60' : 'text-[var(--text-muted)] opacity-30'}`}>{t(`wallet.${w.type.toLowerCase()}`) || w.type}</p>
                                    <p className={`text-sm font-bold truncate ${toWalletId === w.id ? 'text-white' : 'text-[var(--text-primary)]'}`}>{w.name}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Note Input */}
                    <section className="px-6 py-6 pb-64">
                        <div className="bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] p-4 rounded-2xl flex items-center gap-4 focus-within:border-[rgba(var(--bg-card-rgb),0.8)] transition-all">
                            <i className="fa-solid fa-pen-to-square text-[var(--text-muted)] opacity-30 text-sm"></i>
                            <input
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="bg-transparent border-none outline-none text-[var(--text-primary)] text-sm font-medium w-full placeholder:text-[var(--text-muted)] opacity-40"
                                placeholder={t('transfer.add_note')}
                            />
                        </div>
                    </section>
                </div>

                {/* Bottom Button */}
                <div className="px-6 pb-8 pt-4 bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-md border-t border-[var(--border-subtle)] z-[100]">
                    <button
                        onClick={handleTransfer}
                        disabled={!amount || fromWalletId === toWalletId}
                        className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 border-none uppercase tracking-widest"
                    >
                        <span>{t('transfer.execute_transfer')}</span>
                        <i className="fa-solid fa-arrow-right-long"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferModal;

