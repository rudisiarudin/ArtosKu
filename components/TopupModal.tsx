
import React, { useState, useEffect } from 'react';
import { TransactionType, Category, Wallet, WalletType } from '../types';
import { getLocalIsoDate, getLocalIsoString } from '@/lib/utils';
import { useLanguage } from '../context/LanguageContext';

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
    const { t } = useLanguage();
    const [sourceWalletId, setSourceWalletId] = useState<string | 'EXTERNAL'>('EXTERNAL');
    const [formData, setFormData] = useState({
        amount: '0',
        type: TransactionType.INCOME,
        category: 'Topup' as Category,
        date: getLocalIsoString(),
        description: '',
        walletId: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                amount: '0',
                type: TransactionType.INCOME,
                category: 'Topup' as Category,
                date: getLocalIsoString(),
                description: defaultDescription || '',
                walletId: prefilledWalletId || wallets[0]?.id || ''
            });
            setSourceWalletId('EXTERNAL');
        }
    }, [isOpen, prefilledWalletId, wallets, defaultDescription]);

    const handleSubmit = () => {
        const numericAmount = parseFloat(formData.amount);
        if (numericAmount <= 0) {
            alert(t('topup.error_amount') || t('transactions.error_amount'));
            return;
        }
        if (!formData.walletId) {
            alert(t('transactions.error_wallet'));
            return;
        }

        if (sourceWalletId !== 'EXTERNAL' && onTransfer && formData.walletId) {
            // Check if source and dest are same
            if (sourceWalletId === formData.walletId) {
                alert(t('topup.error_same_wallet'));
                return;
            }
            onTransfer(sourceWalletId, formData.walletId, numericAmount, formData.description || t('topup.quick_deposit'));
        } else {
            onAdd({
                ...formData,
                amount: numericAmount,
                description: formData.description.trim() || t('topup.title')
            });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <div
                className="fixed inset-0 bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-md z-40 transition-opacity duration-700 fade-in"
                onClick={onClose}
            ></div>

            <div className="relative bg-[var(--bg-deep)] w-full h-[100dvh] shadow-2xl flex flex-col overflow-hidden z-50 modal-sheet">
                <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[120px] rounded-full -ml-32 -mt-32 pointer-events-none"></div>

                {/* Top Navigation */}
                <div className="flex items-center px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 justify-between relative z-10">
                    <button onClick={onClose} className="size-9 rounded-full bg-[rgba(var(--bg-card-rgb),0.2)] flex items-center justify-center text-[var(--text-primary)] active:scale-90 transition-all">
                        <i className="fa-solid fa-arrow-left text-sm"></i>
                    </button>
                    <h2 className="text-[var(--text-secondary)] text-sm font-medium leading-tight flex-1 text-center">{title || t('topup.title')}</h2>
                    <div className="size-9"></div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
                    {/* Amount Input Section */}
                    <div className="flex flex-col items-center justify-center py-10 px-6">
                        <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-[0.2em] mb-4 opacity-50">{t('topup.deposit_amount')}</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-emerald-500/30 text-xl font-bold">Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formData.amount === '0' ? '' : Number(formData.amount).toLocaleString('id-ID')}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setFormData(prev => ({ ...prev, amount: val || '0' }));
                                }}
                                className={`bg-transparent border-none outline-none text-[var(--text-primary)] font-bold text-center tabular-nums transition-all ${formData.amount.length > 9 ? 'text-4xl' : 'text-5xl'}`}
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                    </div>

                    <section className="px-6 py-4">
                        <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] mb-5 text-[var(--text-muted)] opacity-30">{t('topup.source_funds')}</h3>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-6 -mx-2 px-2">
                            {/* External Option */}
                            <button
                                onClick={() => setSourceWalletId('EXTERNAL')}
                                className={`min-w-[140px] p-4 rounded-2xl border transition-all duration-300 text-left relative group active:scale-95 ${sourceWalletId === 'EXTERNAL' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'bg-[rgba(var(--bg-card-rgb),0.4)] border-[var(--border-subtle)] opacity-40'}`}
                            >
                                <div className={`size-10 rounded-xl flex items-center justify-center mb-4 transition-all ${sourceWalletId === 'EXTERNAL' ? 'bg-emerald-500 text-black' : 'bg-[rgba(var(--bg-inner-rgb),0.5)] text-[var(--text-muted)]'}`}>
                                    <i className="fa-solid fa-cloud-arrow-down text-sm"></i>
                                </div>
                                <p className={`text-[9px] font-bold uppercase mb-1 ${sourceWalletId === 'EXTERNAL' ? 'text-emerald-500' : 'text-[var(--text-muted)] opacity-30'}`}>{t('topup.external')}</p>
                                <p className={`text-[11px] font-bold truncate ${sourceWalletId === 'EXTERNAL' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-50'}`}>{t('topup.income_source')}</p>
                            </button>

                            {/* Wallet Options */}
                            {wallets.filter(w => w.id !== formData.walletId).map((w, i) => (
                                <button
                                    key={w.id}
                                    onClick={() => setSourceWalletId(w.id)}
                                    className={`min-w-[130px] p-4 rounded-2xl border transition-all duration-300 text-left relative group active:scale-95 ${sourceWalletId === w.id ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'bg-[rgba(var(--bg-card-rgb),0.4)] border-[var(--border-subtle)] opacity-40'}`}
                                >
                                    <div className={`size-10 rounded-xl flex items-center justify-center mb-4 transition-all ${sourceWalletId === w.id ? 'bg-emerald-500 text-black' : 'bg-[rgba(var(--bg-inner-rgb),0.5)] text-[var(--text-muted)]'}`}>
                                        <i className={`fa-solid ${w.icon || 'fa-vault'} text-sm`}></i>
                                    </div>
                                    <p className={`text-[9px] font-bold uppercase mb-1 ${sourceWalletId === w.id ? 'text-emerald-500' : 'text-[var(--text-muted)] opacity-30'}`}>{t(`wallet.${w.type.toLowerCase()}`) || w.type}</p>
                                    <p className={`text-[11px] font-bold truncate ${sourceWalletId === w.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-50'}`}>{w.name}</p>
                                </button>
                            ))}
                        </div>

                        {/* Description Input */}
                        <div className="mt-4">
                            <div className="bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] p-4 rounded-2xl flex items-center gap-4 focus-within:border-[rgba(var(--bg-card-rgb),0.8)] transition-all">
                                <i className="fa-solid fa-pen text-[var(--text-muted)] opacity-30 text-xs"></i>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="bg-transparent border-none outline-none text-[var(--text-primary)] text-xs font-bold w-full placeholder:text-[var(--text-muted)] opacity-50"
                                    placeholder={t('common.add_note')}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="px-6 py-6 pb-20">
                        <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] mb-5 text-[var(--text-muted)] opacity-30">{t('common.destination')}</h3>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
                            {wallets.map((w, i) => (
                                <button
                                    key={w.id}
                                    onClick={() => setFormData(d => ({ ...d, walletId: w.id }))}
                                    className={`min-w-[130px] p-4 rounded-2xl border transition-all duration-300 text-left relative group active:scale-95 ${formData.walletId === w.id ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'bg-[rgba(var(--bg-card-rgb),0.4)] border-[var(--border-subtle)] opacity-40'}`}
                                >
                                    <div className={`size-10 rounded-xl flex items-center justify-center mb-4 transition-all ${formData.walletId === w.id ? 'bg-emerald-500 text-black' : 'bg-[rgba(var(--bg-inner-rgb),0.5)] text-[var(--text-muted)]'}`}>
                                        <i className={`fa-solid ${w.icon || 'fa-vault'} text-sm`}></i>
                                    </div>
                                    <p className={`text-[9px] font-bold uppercase mb-1 ${formData.walletId === w.id ? 'text-emerald-500' : 'text-[var(--text-muted)] opacity-30'}`}>{t(`wallet.${w.type.toLowerCase()}`) || w.type}</p>
                                    <p className={`text-[11px] font-bold truncate ${formData.walletId === w.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-50'}`}>{w.name}</p>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Bottom Button */}
                <div className="px-6 pb-8 pt-4 bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-md border-t border-[var(--border-subtle)] z-[100]">
                    <button
                        onClick={handleSubmit}
                        className="w-full h-11 rounded-xl bg-emerald-500 text-black font-bold text-[10px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 border-none"
                    >
                        <span>{t('topup.sync_savings')}</span>
                        <i className="fa-solid fa-arrow-right-long text-sm"></i>
                    </button>
                </div>
            </div>
        </div>
    );
});

export default TopupModal;

