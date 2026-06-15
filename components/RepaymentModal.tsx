import React, { useState, useEffect } from 'react';
import { Debt, TransactionType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { formatIDR, vibrate } from '@/lib/utils';

interface RepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  onConfirm: (amount: number) => void;
}

const RepaymentModal: React.FC<RepaymentModalProps> = ({ isOpen, onClose, debt, onConfirm }) => {
  const { t, lang } = useLanguage();
  const [amount, setAmount] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && debt) {
      setAmount('');
      setIsSuccess(false);
    }
  }, [isOpen, debt]);

  if (!isOpen || !debt) return null;

  const handleConfirm = () => {
    const numAmount = Number(amount.replace(/\D/g, ''));
    if (numAmount > 0) {
      setIsSuccess(true);
      vibrate([10, 30, 10]);
      setTimeout(() => {
        onConfirm(numAmount);
        onClose();
      }, 1500);
    }
  };

  const handlePayFull = () => {
    setAmount(debt.amount.toString());
    vibrate(10);
  };

  const isDebt = debt.type === TransactionType.DEBT;

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-end md:justify-center bg-black/85 backdrop-blur-md animate-backdrop">
      <div className="absolute inset-0" onClick={onClose} />
      
      {isSuccess && (
        <div className="absolute inset-0 z-[2100] bg-[#0c0c0e] flex flex-col items-center justify-center animate-fade-in px-8 text-center">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 animate-scale-spring">
            <i className="fa-solid fa-check text-4xl text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Settled!</h2>
          <p className="text-white/40 text-sm font-medium">Payment has been recorded.<br />Updating position...</p>
        </div>
      )}

      <div className="relative w-full max-w-lg bg-[#0e0e0e] rounded-t-[40px] md:rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] animate-modal-slide border-t border-white/10 overflow-hidden">
        
        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mt-4 mb-2" />
        
        <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-32">
          <div className="flex items-center justify-between py-8">
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Debt Settlement</p>
              <h2 className="text-2xl font-bold text-white">{isDebt ? 'Repay Debt' : 'Collect Payment'}</h2>
            </div>
            <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 active:scale-90 transition-all">
              <i className="fa-solid fa-xmark text-lg" />
            </button>
          </div>

          <div className="mb-10 p-6 bg-white/[0.03] border border-white/5 rounded-[28px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 border border-white/5">
                <i className="fa-solid fa-circle-info" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-0.5">Remaining for {debt.title}</p>
                <p className="text-base font-bold text-white tabular-nums">Rp{formatIDR(debt.amount)}</p>
              </div>
            </div>
            <button onClick={handlePayFull} className="px-4 py-2 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 transition-all">
              Settle All
            </button>
          </div>

          <div className="text-center py-10">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Payment Amount</p>
            <div className="inline-flex items-baseline gap-2">
              <span className="text-xl font-bold text-white/20">Rp</span>
              <input 
                type="text"
                inputMode="numeric"
                value={amount === '0' ? '' : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                onChange={(e) => {
                  const val = e.target.value.replace(/\./g, '');
                  if (/^\d*$/.test(val) && Number(val) <= debt.amount) setAmount(val || '0');
                }}
                className="w-[5ch] bg-transparent border-none outline-none text-6xl font-black tabular-nums text-center text-white placeholder:text-white/5"
                placeholder="0"
                style={{ width: `${Math.max(3, amount.length + 1)}ch` }}
                autoFocus
              />
            </div>
          </div>
          
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center gap-4 animate-fade-in">
            <i className="fa-solid fa-shield-check text-emerald-500 text-sm" />
            <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest leading-relaxed">Funds will be deducted from {debt.walletId ? 'associated wallet' : 'default wallet'}.</p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e] to-transparent pt-12">
          <button
            onClick={handleConfirm}
            disabled={!amount || Number(amount) <= 0}
            className={`w-full h-15 rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${isDebt ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-emerald-500 text-black shadow-emerald-500/20'}`}
          >
            Confirm Payment
            <i className="fa-solid fa-chevron-right text-[10px]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepaymentModal;
