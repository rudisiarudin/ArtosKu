
import React, { useState, useEffect, useRef } from 'react';
import { TransactionType, Category, Wallet } from '../types';
import { CATEGORIES } from '../constants';
import { getLocalIsoDate, getCurrentTimestamp } from '../lib/utils';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (t: Omit<any, 'id'>) => void;
  wallets: Wallet[];
  prefilledData?: any;
  theme: 'light' | 'dark';
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = React.memo(({ isOpen, onClose, onAdd, wallets, prefilledData, theme }) => {
  const [formData, setFormData] = useState({
    amount: '0',
    type: TransactionType.EXPENSE,
    category: 'Makan' as Category,
    date: getCurrentTimestamp(),
    description: '',
    walletId: wallets[0]?.id || ''
  });

  useEffect(() => {
    if (isOpen) {
      if (prefilledData) {
        setFormData({
          amount: '0',
          type: prefilledData.type || TransactionType.EXPENSE,
          category: prefilledData.category || 'Makan',
          date: getCurrentTimestamp(),
          description: prefilledData.description || '',
          walletId: prefilledData.walletId || wallets[0]?.id || ''
        });
      } else if (wallets.length > 0 && !formData.walletId) {
        setFormData(prev => ({ ...prev, walletId: wallets[0].id }));
      }
    }
  }, [wallets, isOpen, prefilledData]);

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

    onAdd({
      ...formData,
      amount: numericAmount,
      description: formData.description.trim() || 'Untitled Transaction'
    });
    onClose();
  };

  const formatCurrencyLocal = (val: string) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num).replace('Rp', 'Rp ');
  };

  if (!isOpen) return null;

  const CATEGORY_ICONS: Record<string, string> = {
    'Makan': 'fa-utensils',
    'Transport': 'fa-car',
    'Tagihan': 'fa-house',
    'Hiburan': 'fa-clapperboard',
    'Shop': 'fa-cart-shopping',
    'Kesehatan': 'fa-heart-pulse',
    'Gaji': 'fa-money-bill-trend-up',
    'Investasi': 'fa-chart-line',
    'Hadiah': 'fa-gift',
    'Others': 'fa-ellipsis'
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-700"
        onClick={onClose}
      ></div>

      <div className="relative bg-[var(--bg-card)] w-full max-w-md h-[92vh] rounded-t-[3.5rem] shadow-2xl flex flex-col overflow-hidden border-t border-[var(--border-subtle)] animate-in slide-in-from-bottom duration-700 elite-glow">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -ml-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-32 -mb-32 pointer-events-none"></div>

        <div className="w-full flex justify-center pt-5 pb-2 relative z-10">
          <div className="w-12 h-1.5 bg-[var(--border-subtle)] rounded-full opacity-40"></div>
        </div>

        <div className="px-8 py-4 flex justify-between items-center relative z-10">
          <button onClick={onClose} className="w-12 h-12 rounded-2xl glass-morphism border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500 transition-all active:scale-90">
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>

          <div
            onClick={() => setFormData(prev => ({
              ...prev,
              type: prev.type === TransactionType.EXPENSE ? TransactionType.INCOME : TransactionType.EXPENSE,
              category: prev.type === TransactionType.EXPENSE ? 'Gaji' : 'Makan'
            }))}
            className={`flex items-center gap-3 cursor-pointer transition-all duration-500 border px-6 py-2.5 rounded-2xl ${formData.type === TransactionType.INCOME ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}
          >
            <i className={`fa-solid ${formData.type === TransactionType.INCOME ? 'fa-circle-arrow-up text-emerald-500' : 'fa-circle-arrow-down text-rose-500'} text-xs`}></i>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${formData.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>
              Record {formData.type === TransactionType.INCOME ? 'Income' : 'Expense'}
            </span>
          </div>

          <button onClick={handleSubmit} className="w-12 h-12 rounded-2xl bg-emerald-500 text-[#09090b] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center">
            <i className="fa-solid fa-check font-bold"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-6 space-y-8 pb-8 relative z-10">
          <div className="text-center py-6 group">
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 transition-colors duration-500 ${formData.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formData.type === TransactionType.INCOME ? 'Income' : 'Expense'} Amount
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-sm font-bold opacity-40 transition-colors duration-500 ${formData.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>IDR</span>
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

          <section>
            <div className="flex justify-between items-center mb-8 px-2">
              <h3 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Select Category</h3>
              <span className={`text-[9px] font-bold uppercase tracking-widest border px-4 py-1.5 rounded-full elite-glow transition-all duration-500 ${formData.type === TransactionType.INCOME ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-rose-500 border-rose-500/20 bg-rose-500/5'}`}>{formData.category}</span>
            </div>

            <div className="grid grid-cols-4 gap-y-7 gap-x-3 px-2">
              {Object.keys(CATEGORY_ICONS)
                .filter(cat => {
                  const expenseCats = ['Makan', 'Transport', 'Tagihan', 'Hiburan', 'Shop', 'Kesehatan', 'Others'];
                  const incomeCats = ['Gaji', 'Investasi', 'Hadiah', 'Others'];
                  return formData.type === TransactionType.INCOME ? incomeCats.includes(cat) : expenseCats.includes(cat);
                })
                .map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFormData(prev => ({ ...prev, category: cat as Category }))}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base transition-all duration-500 relative ${formData.category === cat ? 'text-slate-900 shadow-lg' : 'glass-morphism border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-emerald-500 hover:border-emerald-500/30'}`}>
                      <i className={`fa-solid ${CATEGORY_ICONS[cat] || 'fa-tag'} relative z-10`}></i>
                      {formData.category === cat && (
                        <div className="absolute inset-0 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20 animate-in zoom-in-90 duration-300"></div>
                      )}
                    </div>
                    <span className={`text-[8.5px] font-bold uppercase tracking-widest transition-colors ${formData.category === cat ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{cat.split(' ')[0]}</span>
                  </button>
                ))}
            </div>
          </section>

          <section className="px-2">
            <h3 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4 ml-2">Transaction Note</h3>
            <div className="premium-card bg-[var(--bg-inner)] border border-[var(--border-subtle)] p-6 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/5 transition-all glass-morphism">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] flex items-center justify-center text-emerald-500 shadow-sm border border-[var(--border-subtle)] elite-glow">
                  <i className="fa-solid fa-file-pen text-sm"></i>
                </div>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-transparent border-none outline-none text-[var(--text-primary)] text-sm font-bold w-full placeholder:text-[var(--text-muted)] placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
                  placeholder="Reference or note..."
                />
              </div>
            </div>
          </section>

          <section className="px-2 pb-6">
            <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-3 ml-2">Payment Source</h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {wallets.filter(w => w.type !== 'INVESTMENT').map(w => (
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

export default AddTransactionModal;
