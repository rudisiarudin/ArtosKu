import React, { useState, useEffect } from 'react';
import { Debt, TransactionType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface RepaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    debt: Debt | null;
    onConfirm: (amount: number) => void;
}

const RepaymentModal: React.FC<RepaymentModalProps> = ({ isOpen, onClose, debt, onConfirm }) => {
    const { t, lang } = useLanguage();
    const [amount, setAmount] = useState('');

    useEffect(() => {
        if (isOpen && debt) {
            setAmount('');
        }
    }, [isOpen, debt]);

    if (!isOpen || !debt) return null;

    const formatIDR = (val: number) => {
        return new Intl.NumberFormat('id-ID').format(val);
    };

    const handleConfirm = () => {
        const numAmount = Number(amount.replace(/\D/g, ''));
        if (numAmount > 0) {
            onConfirm(numAmount);
            onClose();
        }
    };

    const handlePayFull = () => {
        setAmount(debt.amount.toString());
    };

    const isDebt = debt.type === TransactionType.DEBT; // Hutang (We borrow)
    const isReceivable = debt.type === TransactionType.RECEIVABLE; // Piutang (We lend)

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-md" onClick={onClose}></div>
            <div className="bg-[var(--bg-card)] w-full max-w-[360px] p-6 rounded-2xl border border-[var(--border-subtle)] relative z-10 animate-in slide-in-from-bottom-10 duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-[12px] font-semibold tracking-[0.2em] text-[var(--text-primary)] uppercase">
                            {isDebt ? t('debt.pay_debt') : t('debt.receive_payment')}
                        </h3>
                        <p className="text-[9px] font-medium text-[var(--text-muted)] tracking-widest mt-1">
                            {t('debt.settlement_for').replace('{title}', debt.title)}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-[rgba(var(--bg-card-rgb),0.2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <i className="fa-solid fa-times text-xs"></i>
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Info Card */}
                    <div className="bg-[rgba(var(--bg-card-rgb),0.2)] border border-[var(--border-subtle)] rounded-2xl p-4 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase">{t('debt.remaining')}</span>
                        <span className={`text-[16px] font-bold tabular-nums ${isDebt ? 'text-rose-500' : 'text-emerald-500'}`}>
                            Rp{formatIDR(debt.amount)}
                        </span>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black text-[var(--text-muted)] opacity-50 tracking-[0.2em] uppercase">{t('debt.payment_amount')}</label>
                            <button
                                onClick={handlePayFull}
                                className="text-[9px] font-bold text-[#00d293] tracking-widest hover:underline"
                            >
                                {t('debt.pay_full')}
                            </button>
                        </div>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[12px] font-black text-[var(--text-muted)] opacity-30">IDR</span>
                            <input
                                type="text"
                                placeholder="0"
                                value={amount ? Number(amount).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US') : ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    // Prevent paying more than owed
                                    if (Number(val) > debt.amount) return;
                                    setAmount(val);
                                }}
                                className="w-full h-16 bg-[var(--bg-inner)] rounded-2xl pl-14 pr-5 text-[18px] font-black text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[#00d293]/50 outline-none transition-all placeholder:text-[var(--text-muted)] opacity-30 tabular-nums"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={!amount || Number(amount) <= 0}
                        className={`w-full h-14 rounded-full text-black text-[12px] font-black tracking-[0.2em] shadow-lg active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale ${isDebt
                            ? 'bg-rose-500 shadow-[0_10px_30px_rgba(244,63,94,0.3)]'
                            : 'bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.3)]'
                            }`}
                    >
                        {t('common.confirm')} {Number(amount) >= debt.amount ? t('debt.full_payment') : t('debt.partial_payment')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RepaymentModal;

