
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { getLocalIsoDate } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../lib/translations';
import { Bell, Settings, User, Search, Filter, List, ArrowUpRight, ArrowDownLeft, ChevronDown, CheckCircle2 } from 'lucide-react';

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
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(val).replace('Rp', 'Rp ');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dYesterday = new Date(dNow);
    dYesterday.setDate(dYesterday.getDate() - 1);

    if (dDate.getTime() === dNow.getTime()) return t('history.today');
    if (dDate.getTime() === dYesterday.getTime()) return t('history.yesterday');

    return date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleCategoryUpdate = (txId: string, newCategory: Category) => {
    if (onUpdateTransaction) onUpdateTransaction(txId, { category: newCategory });
    setEditingId(null);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (filterType === 'ALL') return true;
      if (filterType === 'INCOME') return t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
      if (filterType === 'EXPENSE') return t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE;
      if (filterType === 'DEBT') return t.type === TransactionType.DEBT || t.type === TransactionType.RECEIVABLE;

      return true;
    });
  }, [transactions, searchTerm, filterType]);

  const groupedTransactions = useMemo(() => filteredTransactions.reduce((acc, t) => {
    const dateKey = getLocalIsoDate(new Date(t.date));
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>), [filteredTransactions]);

  const sortedDates = useMemo(() =>
    Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  , [groupedTransactions]);

  return (
    <div className="flex flex-col min-h-screen pb-28 bg-[#09090b] text-foreground animate-in fade-in duration-300 font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 pt-[calc(0.75rem+env(safe-area-inset-top,16px))] pb-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-white tracking-tight">Riwayat Transaksi</h2>
            <p className="text-[10px] text-zinc-500 font-medium">Log Arus Kas Keuangan</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-emerald-400">
            <List className="w-4 h-4" />
          </div>
        </div>
      </header>

      <div className="px-4 space-y-3 pt-3 mb-2 max-w-md mx-auto w-full">
        <div className="relative group w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder={t('history.search_placeholder') || "Cari transaksi atau kategori..."}
            className="w-full h-10 pl-9 pr-4 bg-zinc-900/90 rounded-xl border border-white/[0.08] outline-none text-xs font-semibold text-white placeholder:text-zinc-600 focus:border-emerald-500/50 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'ALL', label: t('history.filter_all') || 'Semua' },
            { id: 'INCOME', label: t('history.filter_income') || 'Pemasukan' },
            { id: 'EXPENSE', label: t('history.filter_expense') || 'Pengeluaran' },
            { id: 'DEBT', label: t('history.filter_liabilities') || 'Hutang' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id as any)}
              type="button"
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filterType === type.id 
                  ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900 text-zinc-400 border border-white/[0.08] hover:text-white'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 space-y-6 mt-3 max-w-md mx-auto w-full">
        {sortedDates.map(date => (
          <div key={date} className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold text-muted-foreground tracking-[0.15em] uppercase">
                {formatDate(date)}
              </h3>
              <div className="flex items-center gap-1 opacity-40">
                <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                <span className="text-[8px] font-bold text-foreground tracking-widest uppercase">{t('history.successful')}</span>
              </div>
            </div>

            <div className="space-y-3">
              {groupedTransactions[date].map((t) => (
                <div
                  key={t.id}
                  className="relative group bg-transparent hover:bg-muted/30 transition-all active:scale-[0.99] cursor-pointer -mx-2 px-2 py-1 rounded-2xl"
                  onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                >
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden flex-1">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border-none transition-transform group-hover:scale-105 ${
                        (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT)
                          ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
                          : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
                      }`}>
                        {(t.type === TransactionType.INCOME || t.type === TransactionType.DEBT) ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[13px] font-bold text-foreground leading-tight truncate tracking-tight pr-1">{t.description || t.category}</h4>
                        <div className="flex items-center gap-1 mt-0.5 opacity-60">
                          <p className="text-[8.5px] font-bold text-muted-foreground tracking-widest uppercase">
                            {translations[lang].transactions.categories[t.category.toLowerCase() as keyof typeof translations.en.transactions.categories] || t.category}
                          </p>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${editingId === t.id ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[15px] font-black tabular-nums tracking-tighter ${
                        (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT) ? 'text-[#10B981]' : 'text-[#EF4444]'
                      }`}>
                        {t.type === TransactionType.INCOME || t.type === TransactionType.DEBT ? '+' : '-'}{formatCurrency(t.amount).replace('Rp', '')}
                      </p>
                    </div>
                  </div>

                  {editingId === t.id && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-[100] bg-card/95 backdrop-blur-xl border border-primary/20 rounded-[24px] p-2 grid grid-cols-4 gap-1 shadow-2xl animate-in zoom-in-95 duration-200">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={(e) => { e.stopPropagation(); handleCategoryUpdate(t.id, cat); }}
                          className={`px-2 py-2.5 rounded-xl text-[9px] font-bold tracking-tight transition-all truncate border ${
                            t.category === cat
                              ? 'bg-primary border-primary text-primary-foreground shadow-md'
                              : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted'
                          }`}
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
          <div className="py-32 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center border border-border">
              <Search className="w-8 h-8 text-muted-foreground/20" />
            </div>
            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t('history.no_results')}</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default TransactionList;

