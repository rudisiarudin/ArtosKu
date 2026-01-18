import React, { useState, useEffect } from 'react';
import { Debt, TransactionType } from '../types';

interface RepaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    debt: Debt | null;
    onConfirm: (amount: number) => void;
}

const RepaymentModal: React.FC<RepaymentModalProps> = ({ isOpen, onClose, debt, onConfirm }) => {
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
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
            <div className="bg-zinc-900 w-full max-w-[360px] p-6 rounded-[2.5rem] border border-white/5 relative z-10 animate-in slide-in-from-bottom-10 duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white">
                            {isDebt ? 'Pay Debt' : 'Receive Payment'}
                        </h3>
                        <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-widest mt-1">
                            Settlement for {debt.title}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                        <i className="fa-solid fa-times text-xs"></i>
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Info Card */}
                    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Remaining</span>
                        <span className={`text-[16px] font-bold tabular-nums ${isDebt ? 'text-rose-500' : 'text-emerald-500'}`}>
                            Rp{formatIDR(debt.amount)}
                        </span>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">Payment Amount</label>
                            <button
                                onClick={handlePayFull}
                                className="text-[9px] font-bold text-[#00d293] uppercase tracking-widest hover:underline"
                            >
                                Pay Full
                            </button>
                        </div>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[12px] font-black text-zinc-700">IDR</span>
                            <input
                                type="text"
                                placeholder="0"
                                value={amount ? Number(amount).toLocaleString('id-ID') : ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    // Prevent paying more than owed
                                    if (Number(val) > debt.amount) return;
                                    setAmount(val);
                                }}
                                className="w-full h-16 bg-black rounded-2xl pl-14 pr-5 text-[18px] font-black text-white border border-white/5 focus:border-[#00d293]/50 outline-none transition-all placeholder:text-zinc-800 tabular-nums"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={!amount || Number(amount) <= 0}
                        className={`w-full h-14 rounded-full text-black text-[12px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale ${isDebt
                                ? 'bg-rose-500 shadow-[0_10px_30px_rgba(244,63,94,0.3)]'
                                : 'bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.3)]'
                            }`}
                    >
                        CONFIRM {Number(amount) >= debt.amount ? 'FULL PAYMENT' : 'PARTIAL'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RepaymentModal;
