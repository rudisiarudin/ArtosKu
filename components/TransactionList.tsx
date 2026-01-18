
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { getLocalIsoDate } from '../lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
}

const TransactionList: React.FC<TransactionListProps> = React.memo(({ transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'DEBT'>('ALL');

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

    if (dDate.getTime() === dNow.getTime()) return 'Today';
    if (dDate.getTime() === dYesterday.getTime()) return 'Yesterday';

    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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
    <div className="flex flex-col min-h-screen pb-36 animate-in fade-in duration-700">
      <header className="fixed top-0 left-0 right-0 z-50 px-8 pt-6 pb-6 flex items-center justify-between bg-black/80 backdrop-blur-xl border-b border-white/5 max-w-md mx-auto">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Transaction Ledger</p>
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Financial History</h2>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-emerald-500 shadow-sm">
          <i className="fa-solid fa-list-ul text-lg"></i>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[88px]"></div>

      {/* Search & Filter Bar */}
      <div className="px-6 space-y-5 mb-8">
        <div className="premium-card bg-[var(--bg-inner)] border-none p-1 flex items-center gap-4 group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
          <div className="w-12 h-12 flex items-center justify-center text-[var(--text-muted)] group-focus-within:text-emerald-500 transition-colors">
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>
          <input
            type="text"
            placeholder="Search transactions..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'ALL', label: 'All History', icon: 'fa-layer-group' },
            { id: 'INCOME', label: 'Incomes', icon: 'fa-circle-arrow-up' },
            { id: 'EXPENSE', label: 'Expenses', icon: 'fa-circle-arrow-down' },
            { id: 'DEBT', label: 'Liabilities', icon: 'fa-hand-holding-dollar' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id as any)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300 border ${filterType === type.id
                ? 'bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10'
                }`}
            >
              <i className={`fa-solid ${type.icon} ${filterType === type.id ? 'text-black/60' : 'text-zinc-600'}`}></i>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 space-y-10 group/list">
        {sortedDates.map(date => (
          <div key={date} className="space-y-4">
            <div className="sticky top-0 z-10 py-3 -mx-6 px-8 bg-[var(--bg-deep)]/70 backdrop-blur-xl border-b border-[var(--border-subtle)]">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                  {formatDate(date)}
                </h3>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Successful</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {groupedTransactions[date].map(t => (
                <div key={t.id} className="premium-card p-5 flex items-center justify-between group hover:shadow-lg hover:border-emerald-500/30 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--bg-inner)] flex items-center justify-center border border-[var(--border-subtle)] group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <i className={`fa-solid ${t.type === TransactionType.INCOME ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} ${t.type === TransactionType.INCOME ? 'text-emerald-500 group-hover:text-white' : 'text-[var(--text-muted)] group-hover:text-white'} text-sm`}></i>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[13px] font-bold text-[var(--text-primary)] uppercase tracking-tight line-clamp-1">{t.description}</h4>
                      <p className="text-[9px] font-bold text-[var(--text-secondary)] tracking-widest uppercase">{t.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[13px] font-bold tabular-nums tracking-tight ${t.type === TransactionType.INCOME || t.type === TransactionType.DEBT ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.type === TransactionType.INCOME || t.type === TransactionType.DEBT ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">IDR Verified</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {sortedDates.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center opacity-30 text-[var(--text-muted)]">
            <i className="fa-solid fa-magnifying-glass text-4xl mb-4"></i>
            <p className="text-[10px] font-bold uppercase tracking-widest">No matching history</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default TransactionList;
