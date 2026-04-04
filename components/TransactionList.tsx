
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { getLocalIsoDate } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../lib/translations';

interface TransactionListProps {
  transactions: Transaction[];
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
}

const CATEGORIES: Category[] = [
  'Makan', 'Transport', 'Shop', 'Tagihan', 'Hiburan', 'Kesehatan',
  'Gaji', 'Investasi', 'Hadiah', 'Topup', 'Loan', 'Transfer', 'Others'
];

const TransactionList: React.FC<TransactionListProps> = React.memo(({ transactions, onUpdateTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'DEBT'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { lang, t } = useLanguage();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val).replace('Rp', 'Rp ');
  };

  const formatDate = (dateStr: string) => {
    // Ensure we handle both YYYY-MM-DD and full ISO strings
    const date = new Date(dateStr);
    const now = new Date();

    // Reset hours to compare only dates
    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dYesterday = new Date(dNow);
    dYesterday.setDate(dYesterday.getDate() - 1);

    if (dDate.getTime() === dNow.getTime()) return t('history.today');
    if (dDate.getTime() === dYesterday.getTime()) return t('history.yesterday');

    return date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleCategoryUpdate = (txId: string, newCategory: Category) => {
    if (onUpdateTransaction) {
      onUpdateTransaction(txId, { category: newCategory });
    }
    setEditingId(null);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Filter by Search Term
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Filter by Transaction Type
      if (filterType === 'ALL') return true;
      if (filterType === 'INCOME') return t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
      if (filterType === 'EXPENSE') return t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE;
      if (filterType === 'DEBT') return t.type === TransactionType.DEBT || t.type === TransactionType.RECEIVABLE;

      return true;
    });
  }, [transactions, searchTerm, filterType]);

  const groupedTransactions = useMemo(() => filteredTransactions.reduce((acc, t) => {
    // Extract local YYYY-MM-DD for grouping
    const dateKey = getLocalIsoDate(new Date(t.date));
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>), [filteredTransactions]);

  const sortedDates = useMemo(() =>
    Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    , [groupedTransactions]);

  return (
    <div className="flex flex-col min-h-screen pb-36 page-enter bg-[var(--bg-deep)]">
      <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 flex items-center justify-between bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-xl border-b border-[var(--border-subtle)] max-w-md mx-auto">
        <div className="space-y-0.5">
          <p className="text-[9px] font-semibold text-[var(--text-muted)] tracking-[0.2em] uppercase opacity-60">{t('history.ledger')}</p>
          <h2 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">{t('history.title')}</h2>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[rgba(var(--bg-card-rgb),0.6)] border border-[var(--border-subtle)] flex items-center justify-center text-emerald-500/80 shadow-sm">
          <i className="fa-solid fa-list-ul text-xs"></i>
        </div>
      </header>



      {/* Search & Filter Bar */}
      <div className="px-5 space-y-3 mb-6 pt-[calc(5.5rem+env(safe-area-inset-top))]">
        <div className="bg-[rgba(var(--bg-card-rgb),0.4)] rounded-2xl border border-[var(--border-subtle)] p-0.5 flex items-center gap-3 group focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
          <div className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] group-focus-within:text-emerald-500 transition-colors">
            <i className="fa-solid fa-magnifying-glass text-[10px]"></i>
          </div>
          <input
            type="text"
            placeholder={t('history.search_placeholder')}
            className="flex-1 bg-transparent border-none outline-none text-[12px] font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 -mx-5 px-5 select-none">
          {[
            { id: 'ALL', label: t('history.filter_all'), icon: 'fa-layer-group' },
            { id: 'INCOME', label: t('history.filter_income'), icon: 'fa-circle-arrow-up' },
            { id: 'EXPENSE', label: t('history.filter_expense'), icon: 'fa-circle-arrow-down' },
            { id: 'DEBT', label: t('history.filter_liabilities'), icon: 'fa-hand-holding-dollar' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id as any)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-[8px] font-semibold tracking-[0.1em] transition-all duration-500 border ${filterType === type.id
                ? 'bg-[#00d293] border-[#00d293] text-black shadow-lg shadow-emerald-500/10 active:scale-95'
                : 'bg-[rgba(var(--bg-card-rgb),0.4)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95'
                }`}
            >
              <i className={`fa-solid ${type.icon} ${filterType === type.id ? 'text-black/50' : 'text-zinc-600'} text-[9px]`}></i>
              <span className="uppercase">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 space-y-6 group/list">
        {sortedDates.map(date => (
          <div key={date} className="space-y-2">
            <div className="sticky top-0 z-10 py-1.5 -mx-5 px-6 bg-[var(--bg-deep)]/70 backdrop-blur-xl border-b border-[var(--border-subtle)]">
              <div className="flex justify-between items-center">
                <h3 className="text-[9px] font-semibold text-[var(--text-muted)] tracking-[0.15em] uppercase">
                  {formatDate(date)}
                </h3>
                <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                  <span className="text-[8px] font-semibold text-emerald-600 dark:text-emerald-500 tracking-wider uppercase">{t('history.successful')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {groupedTransactions[date].map((t, tIdx) => (
                <div key={t.id} className={`relative animate-list-enter ${editingId === t.id ? 'z-50' : 'z-0'}`} style={{ animationDelay: `${tIdx * 50}ms` }}>
                  <div className={`bg-[rgba(var(--bg-card-rgb),0.3)] border border-[var(--border-subtle)] p-3 flex items-center justify-between group rounded-xl transition-all card-press ${editingId === t.id ? 'bg-[var(--bg-card)] border-emerald-500/30' : 'active:bg-[var(--bg-inner)]'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-inner)] flex items-center justify-center border border-[var(--border-subtle)] group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <i className={`fa-solid ${t.type === TransactionType.INCOME ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} ${t.type === TransactionType.INCOME ? 'text-emerald-500 group-hover:text-white' : 'text-[var(--text-muted)] group-hover:text-white'} text-[10px]`}></i>
                      </div>
                      <div className="space-y-0.5" onClick={() => setEditingId(editingId === t.id ? null : t.id)}>
                        <h4 className="text-[12px] font-semibold text-[var(--text-primary)] tracking-tight line-clamp-1">{t.description}</h4>
                        <div className="relative cursor-pointer group/cat">
                          <p className="text-[8px] font-semibold text-[var(--text-muted)] tracking-[0.1em] flex items-center gap-1 group-hover/cat:text-emerald-500 transition-colors uppercase">
                            {translations[lang].transactions.categories[t.category.toLowerCase() as keyof typeof translations.en.transactions.categories] || t.category}
                            <i className="fa-solid fa-chevron-down text-[6px] opacity-0 group-hover/cat:opacity-100 transition-opacity"></i>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[12px] font-bold tabular-nums tracking-tight ${t.type === TransactionType.INCOME || t.type === TransactionType.DEBT ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {t.type === TransactionType.INCOME || t.type === TransactionType.DEBT ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                    </div>
                  </div>

                  {editingId === t.id && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-[100] bg-[var(--bg-card)] shadow-[0_10px_40px_rgba(var(--bg-deep-rgb),0.8)] border border-emerald-500/20 rounded-xl p-1 grid grid-cols-5 gap-0.5 animate-in zoom-in-95 duration-200 mx-4">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => handleCategoryUpdate(t.id, cat)}
                          className={`px-1 py-1 rounded-md text-[7px] font-medium tracking-normal transition-all truncate border ${t.category === cat
                            ? 'bg-emerald-500 border-emerald-500 text-black'
                            : 'text-[var(--text-secondary)] border-transparent hover:bg-white/5 hover:text-[var(--text-primary)]'}`}
                          title={cat}
                        >
                          {translations[lang].transactions.categories[cat.toLowerCase() as keyof typeof translations.en.transactions.categories] || cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {sortedDates.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center opacity-30 text-[var(--text-muted)]">
            <i className="fa-solid fa-magnifying-glass text-4xl mb-4"></i>
            <p className="text-[10px] font-semibold uppercase tracking-widest">{t('history.no_results')}</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default TransactionList;

