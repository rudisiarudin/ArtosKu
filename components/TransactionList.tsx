
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
    <div className="flex flex-col min-h-screen pb-36 bg-background animate-in fade-in duration-500">
      <header className="sticky top-0 left-0 right-0 z-50 px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-4 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{t('history.ledger')}</p>
            <h2 className="text-[20px] font-bold text-foreground tracking-tight">{t('history.title')}</h2>
          </div>
          <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary shadow-sm">
            <List className="w-5 h-5" />
          </div>
        </div>
      </header>

      <div className="px-5 space-y-4 pt-6 mb-4">
        <div className="relative group max-w-md mx-auto w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder={t('history.search_placeholder')}
            className="w-full h-10 pl-9 pr-4 bg-muted/40 rounded-xl border border-border/50 outline-none text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:bg-muted/60 focus:border-primary/30 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 py-1">
          {[
            { id: 'ALL', label: t('history.filter_all') },
            { id: 'INCOME', label: t('history.filter_income') },
            { id: 'EXPENSE', label: t('history.filter_expense') },
            { id: 'DEBT', label: t('history.filter_liabilities') }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id as any)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300 border ${
                filterType === type.id 
                  ? (type.id === 'EXPENSE' || type.id === 'DEBT')
                    ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                    : 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                  : 'bg-muted/20 border-border/20 text-muted-foreground hover:text-foreground'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 space-y-8 mt-4">
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
                <div key={t.id} className="relative">
                  <div 
                    onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                    className={`bg-card p-3.5 flex items-center justify-between rounded-[22px] border transition-all active:scale-[0.98] cursor-pointer shadow-sm ${
                      editingId === t.id ? 'border-primary/40 shadow-md' : 'border-border/40 hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
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

