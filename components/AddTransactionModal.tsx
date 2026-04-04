
import React, { useState, useEffect, useRef } from 'react';
import { TransactionType, Category, Wallet } from '../types';
import { formatIDR, vibrate, getLocalIsoDate, getLocalIsoString } from '@/lib/utils';
import { extractAmountFromImage } from '../services/ocrService';
import { useLanguage } from '../context/LanguageContext';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (t: Omit<any, 'id'>) => void;
  wallets: Wallet[];
  prefilledData?: any;
  theme: 'light' | 'dark';
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = React.memo(({ isOpen, onClose, onAdd, wallets, prefilledData, theme }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    amount: '0',
    type: TransactionType.EXPENSE,
    category: 'Makan' as Category,
    date: getLocalIsoString(),
    description: '',
    walletId: wallets[0]?.id || ''
  });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrMessage(null);
    try {
      const result = await extractAmountFromImage(file);
      if (result.amount !== null && result.amount > 0) {
        setFormData(prev => ({ ...prev, amount: result.amount!.toString() }));
        setOcrMessage({
          text: t('transactions.scan_success').replace('{amount}', formatIDR(result.amount!)) + (result.rawText ? ` (${result.rawText})` : ''),
          type: 'success'
        });
      } else {
        setOcrMessage({ text: t('transactions.scan_not_found'), type: 'error' });
      }
    } catch (err: any) {
      setOcrMessage({ text: err.message || t('transactions.scan_failed'), type: 'error' });
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      if (prefilledData) {
        setFormData({
          amount: '0',
          type: prefilledData.type || TransactionType.EXPENSE,
          category: prefilledData.category || 'Makan',
          date: getLocalIsoString(),
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
      alert(t('transactions.error_amount'));
      return;
    }
    if (!formData.walletId) {
      alert(t('transactions.error_wallet'));
      return;
    }

    onAdd({
      ...formData,
      amount: numericAmount,
      description: formData.description.trim() || t('transactions.untitled')
    });
    vibrate([10, 30, 10]); // Success vibration pattern
    onClose();
  };

  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleModalClose = () => {
    document.body.classList.remove('modal-open');
    onClose();
  };

  if (!isOpen) return null;

  const CATEGORY_MAP: Record<string, { icon: string; label: string }> = {
    'Makan': { icon: 'fa-utensils', label: t('transactions.categories.makan') },
    'Transport': { icon: 'fa-car', label: t('transactions.categories.transport') },
    'Tagihan': { icon: 'fa-house', label: t('transactions.categories.tagihan') },
    'Hiburan': { icon: 'fa-clapperboard', label: t('transactions.categories.hiburan') },
    'Shop': { icon: 'fa-cart-shopping', label: t('transactions.categories.shop') },
    'Kesehatan': { icon: 'fa-heart-pulse', label: t('transactions.categories.kesehatan') },
    'Gaji': { icon: 'fa-money-bill-trend-up', label: t('transactions.categories.gaji') },
    'Investasi': { icon: 'fa-chart-line', label: t('transactions.categories.investasi') },
    'Hadiah': { icon: 'fa-gift', label: t('transactions.categories.hadiah') },
    'Bonus': { icon: 'fa-bolt', label: t('transactions.categories.bonus') },
    'Others': { icon: 'fa-ellipsis', label: t('transactions.categories.others') }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div
        className="fixed inset-0 bg-[rgba(var(--bg-deep-rgb),0.8)] modal-backdrop z-40"
        onClick={handleModalClose}
      ></div>

      <div className="relative bg-[var(--bg-deep)] w-full h-[95dvh] rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden z-50 modal-sheet">
        <div className="sheet-handle" onClick={handleModalClose}></div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-rose-500/5 blur-[120px] rounded-full -ml-32 -mt-32 pointer-events-none"></div>

        {/* Top Navigation */}
        <div className="flex items-center px-6 pt-2 pb-3 justify-between relative z-10">
          <button onClick={handleModalClose} className="text-[var(--text-primary)] flex size-9 shrink-0 items-center justify-center rounded-full bg-[rgba(var(--bg-card-rgb),0.2)] transition-all active:scale-90">
            <i className="fa-solid fa-xmark text-base"></i>
          </button>

          <h2 className="text-[var(--text-secondary)] text-sm font-semibold leading-tight flex-1 text-center">{t('transactions.new_entry')}</h2>

          <div className="flex items-center">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScanImage} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrLoading}
              className="text-[var(--text-muted)] mr-4 cursor-pointer hover:text-rose-500 transition-colors active:scale-90"
            >
              <i className={`fa-solid ${ocrLoading ? 'fa-spinner fa-spin' : 'fa-camera'} text-base`}></i>
            </button>
          </div>
        </div>

        {/* Expense/Income Toggle */}
        <div className="px-6 pb-2 relative z-10">
          <div className="flex h-10 w-full items-center justify-center rounded-2xl bg-[rgba(var(--bg-card-rgb),0.4)] p-1 border border-[var(--border-subtle)] shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)]">
            <button
              onClick={() => setFormData(d => ({ ...d, type: TransactionType.EXPENSE, category: 'Makan' }))}
              className={`flex h-full grow items-center justify-center rounded-xl px-2 text-[10px] font-semibold transition-all duration-300 ${formData.type === TransactionType.EXPENSE ? 'bg-[#f8fafc] text-slate-700 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.08)] border border-slate-200/50' : 'text-[var(--text-muted)] border border-transparent opacity-50'}`}
            >
              {t('transactions.expense')}
            </button>
            <button
              onClick={() => setFormData(d => ({ ...d, type: TransactionType.INCOME, category: 'Gaji' }))}
              className={`flex h-full grow items-center justify-center rounded-xl px-2 text-[10px] font-semibold transition-all duration-300 ${formData.type === TransactionType.INCOME ? 'bg-[#f8fafc] text-slate-700 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.08)] border border-slate-200/50' : 'text-[var(--text-muted)] border border-transparent opacity-50'}`}
            >
              {t('transactions.income')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
          {/* Amount Display */}
          <div className="flex flex-col items-center justify-center pt-8 pb-4 px-6">
            <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-[0.2em] mb-4 opacity-50">{t('common.amount')}</p>
            <div className="flex items-center justify-center gap-1.5">
              <span
                className={`font-semibold transition-colors duration-300 ${formData.type === TransactionType.INCOME ? 'text-emerald-500/60' : 'text-rose-500/60'}`}
                style={{ fontSize: '16px' }}
              >Rp</span>
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
                style={{
                  fontSize: formData.amount.length > 9 ? '32px' : formData.amount.length > 7 ? '40px' : '48px',
                  lineHeight: '1',
                  fontWeight: 600,
                  color: formData.type === TransactionType.INCOME ? '#10b981' : '#f43f5e',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  minWidth: '1ch',
                  width: `${(formData.amount === '0' ? 1 : formData.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".").length) + 0.5}ch`,
                  fontFamily: 'inherit',
                  letterSpacing: '-0.02em',
                  textAlign: 'left',
                }}
                className="tabular-nums transition-all duration-300 placeholder:text-[var(--text-muted)] opacity-50"
                placeholder="0"
                autoFocus
              />
            </div>
            <div className={`mt-4 h-px w-10 rounded-full opacity-20 ${formData.type === TransactionType.INCOME ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </div>


          {/* Categories Section */}
          <div className="py-4">
            <h3 className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-[0.2em] mb-3 px-6 opacity-50">{t('common.category')}</h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-6 pb-2">
              {Object.keys(CATEGORY_MAP)
                .filter(cat => {
                  const expenseCats = ['Makan', 'Transport', 'Shop', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Tagihan', 'Others'];
                  const incomeCats = ['Gaji', 'Investasi', 'Hadiah', 'Bonus', 'Others'];
                  return formData.type === TransactionType.INCOME ? incomeCats.includes(cat) : expenseCats.includes(cat);
                })
                .map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFormData(prev => ({ ...prev, category: cat as Category }))}
                    className="flex flex-col items-center gap-1 transition-all active:scale-95 shrink-0"
                  >
                    <div className={`flex size-8 items-center justify-center rounded-lg transition-all duration-200 ${formData.category === cat
                      ? (formData.type === TransactionType.INCOME ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-rose-500/20 border border-rose-500/40')
                      : 'bg-[rgba(var(--bg-card-rgb),0.2)] border border-[var(--border-subtle)]'
                      }`}>
                      <i className={`fa-solid ${CATEGORY_MAP[cat]?.icon || 'fa-tag'} text-[12px] transition-colors ${formData.category === cat
                        ? (formData.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400')
                        : 'text-[var(--text-muted)] opacity-50'
                        }`}></i>
                    </div>
                    <span className={`text-[8px] font-semibold transition-colors ${formData.category === cat ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-50'}`}>{CATEGORY_MAP[cat]?.label || cat}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Wallet Source Section */}
          <div className="px-6 py-6 relative">
            <h3 className="text-[var(--text-primary)] text-sm font-semibold uppercase tracking-wider mb-4 opacity-30">{t('transactions.wallet_source')}</h3>
            <div
              onClick={() => setIsWalletPickerOpen(!isWalletPickerOpen)}
              className="flex items-center gap-4 rounded-2xl bg-[rgba(var(--bg-card-rgb),0.2)] p-4 border border-[var(--border-subtle)] group active:scale-[0.98] transition-all cursor-pointer hover:bg-[rgba(var(--bg-card-rgb),0.4)] relative z-20"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--bg-inner)] border border-[var(--border-subtle)] shadow-inner">
                <i className={`fa-solid fa-wallet ${formData.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}></i>
              </div>
              <div className="flex-1">
                <p className="text-[var(--text-primary)] text-sm font-semibold">{wallets.find(w => w.id === formData.walletId)?.name || t('common.select_wallet')}</p>
                <p className="text-[var(--text-muted)] text-[10px] font-semibold tracking-tight uppercase opacity-50">Rp {formatIDR(wallets.find(w => w.id === formData.walletId)?.balance.toString() || '0')} {t('common.available')}</p>
              </div>
              <i className={`fa-solid fa-chevron-down text-[var(--text-muted)] opacity-30 text-sm transition-transform duration-300 ${isWalletPickerOpen ? 'rotate-180' : ''}`}></i>
            </div>

            {/* Wallet Dropdown Picker */}
            {isWalletPickerOpen && (
              <div className="absolute left-6 right-6 mt-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="max-h-60 overflow-y-auto no-scrollbar">
                  {wallets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, walletId: w.id }));
                        setIsWalletPickerOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 p-4 hover:bg-[rgba(var(--bg-inner-rgb),0.5)] transition-colors border-b border-[var(--border-subtle)] last:border-none ${formData.walletId === w.id ? 'bg-[rgba(var(--bg-inner-rgb),0.5)]' : ''}`}
                    >
                      <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--bg-inner)] border border-[var(--border-subtle)]">
                        <i className={`fa-solid ${w.icon || 'fa-wallet'} text-xs ${formData.walletId === w.id ? 'text-rose-500' : 'text-[var(--text-muted)] opacity-40'}`}></i>
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-[var(--text-primary)] text-sm font-semibold">{w.name}</p>
                        <p className="text-[var(--text-muted)] text-[10px] uppercase font-semibold opacity-30">{w.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[var(--text-muted)] text-xs font-semibold opacity-60">Rp {formatIDR(w.balance.toString())}</p>
                      </div>
                      {formData.walletId === w.id && <i className="fa-solid fa-check text-rose-500 text-xs"></i>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Note/Date Section */}
          <div className="px-6 flex gap-3 pb-10">
            <div
              onClick={() => {
                if (dateInputRef.current) {
                  if ('showPicker' in dateInputRef.current) {
                    (dateInputRef.current as any).showPicker();
                  } else {
                    dateInputRef.current.click();
                  }
                }
              }}
              className="flex-none flex items-center gap-2 rounded-xl bg-[rgba(var(--bg-card-rgb),0.2)] px-4 py-3 border border-[var(--border-subtle)] transition-all active:scale-95 cursor-pointer relative"
            >
              <i className="fa-solid fa-calendar-day text-[var(--text-muted)] opacity-30 text-xs"></i>
              <span className="text-[var(--text-secondary)] text-xs font-semibold">
                {(() => {
                  const today = new Date();
                  const d = new Date(formData.date);
                  const isToday = d.toDateString() === today.toDateString();
                  return isToday ? t('common.today') : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                })()}
              </span>
              <input
                ref={dateInputRef}
                type="date"
                value={formData.date.split('T')[0]}
                onClick={(e) => e.stopPropagation()}
                onChange={e => {
                  const selectedDate = e.target.value;
                  if (!selectedDate) return;
                  const today = new Date();
                  const localStr = `${selectedDate}T${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;
                  setFormData(prev => ({ ...prev, date: localStr }));
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex-1 flex items-center gap-3 rounded-2xl bg-[rgba(var(--bg-card-rgb),0.2)] p-4 border border-[var(--border-subtle)] focus-within:border-[rgba(var(--bg-card-rgb),0.4)] transition-all">
              <i className="fa-solid fa-edit-note text-[var(--text-muted)] opacity-30 text-sm"></i>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-transparent border-none outline-none text-[var(--text-primary)] text-xs font-semibold w-full placeholder:text-[var(--text-muted)] opacity-50"
                placeholder={t('common.add_note')}
              />
            </div>
          </div>
        </div>

        {/* Bottom Action */}
        <div className="px-6 pb-8 pt-4 bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-md border-t border-[var(--border-subtle)] z-[100]">
          <button
            onClick={handleSubmit}
            className={`w-full h-11 rounded-xl text-white font-semibold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 border-none uppercase tracking-widest ${formData.type === TransactionType.INCOME ? 'bg-emerald-500' : 'bg-rose-500'}`}
          >
            <span>{formData.type === TransactionType.INCOME ? t('transactions.save_income') : t('transactions.settle_expense')}</span>
            <span className="fa-solid fa-arrow-right-long"></span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default AddTransactionModal;

