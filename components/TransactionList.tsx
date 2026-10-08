import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronDown, List, Search } from 'lucide-react';
import { Category, Transaction, TransactionType } from '../types';
import { getLocalIsoDate } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../lib/translations';

interface TransactionListProps {
  transactions: Transaction[];
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
}

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE' | 'DEBT';

const CATEGORIES: Category[] = [
  'Makan', 'Transport', 'Shop', 'Tagihan', 'Hiburan', 'Kesehatan',
  'Gaji', 'Investasi', 'Hadiah', 'Topup', 'Loan', 'Transfer', 'Others',
];

const TransactionList: React.FC<TransactionListProps> = React.memo(({ transactions, onUpdateTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { lang, t } = useLanguage();

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value).replace('Rp', 'Rp ');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const normalizedNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(normalizedNow);
    yesterday.setDate(yesterday.getDate() - 1);

    if (normalizedDate.getTime() === normalizedNow.getTime()) return t('history.today');
    if (normalizedDate.getTime() === yesterday.getTime()) return t('history.yesterday');
    return date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const categoryLabel = (category: Category) => (
    translations[lang].transactions.categories[category.toLowerCase() as keyof typeof translations.en.transactions.categories] || category
  );

  const filteredTransactions = useMemo(() => transactions.filter((transaction) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query
      || transaction.description.toLowerCase().includes(query)
      || transaction.category.toLowerCase().includes(query);
    if (!matchesSearch) return false;
    if (filterType === 'INCOME') return transaction.type === TransactionType.INCOME || transaction.type === TransactionType.DEBT;
    if (filterType === 'EXPENSE') return transaction.type === TransactionType.EXPENSE || transaction.type === TransactionType.RECEIVABLE;
    if (filterType === 'DEBT') return transaction.type === TransactionType.DEBT || transaction.type === TransactionType.RECEIVABLE;
    return true;
  }), [filterType, searchTerm, transactions]);

  const groupedTransactions = useMemo(() => filteredTransactions.reduce((groups, transaction) => {
    const dateKey = getLocalIsoDate(new Date(transaction.date));
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>), [filteredTransactions]);

  const sortedDates = useMemo(() => Object.keys(groupedTransactions)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()), [groupedTransactions]);

  const filters: { id: FilterType; label: string }[] = [
    { id: 'ALL', label: t('history.filter_all') || 'Semua' },
    { id: 'INCOME', label: t('history.filter_income') || 'Pemasukan' },
    { id: 'EXPENSE', label: t('history.filter_expense') || 'Pengeluaran' },
    { id: 'DEBT', label: t('history.filter_liabilities') || 'Utang' },
  ];

  const updateCategory = (transactionId: string, category: Category) => {
    onUpdateTransaction?.(transactionId, { category });
    setEditingId(null);
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-background pb-28 text-foreground xl:pb-10">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,16px))] backdrop-blur-xl xl:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">{t('history.title') || 'Riwayat Transaksi'}</h2>
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{filteredTransactions.length} transaksi ditemukan</p>
          </div>
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <List className="size-4" aria-hidden="true" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 xl:px-8 xl:py-2">
        <section className="mb-7 rounded-2xl border border-border bg-card p-4 shadow-sm xl:flex xl:items-center xl:gap-4 xl:p-5" aria-label="Pencarian dan filter transaksi">
          <label className="relative block flex-1">
            <span className="sr-only">{t('history.search_placeholder') || 'Cari transaksi atau kategori'}</span>
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              placeholder={t('history.search_placeholder') || 'Cari transaksi atau kategori...'}
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm font-medium outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-0.5 xl:mt-0" aria-label="Filter transaksi">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setFilterType(filter.id)}
                aria-pressed={filterType === filter.id}
                className={`h-10 whitespace-nowrap rounded-xl px-4 text-xs font-semibold transition-colors ${
                  filterType === filter.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-8">
          {sortedDates.map((date) => (
            <section key={date} aria-labelledby={`date-${date}`}>
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 id={`date-${date}`} className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{formatDate(date)}</h3>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                  <CheckCircle2 className="size-3 text-primary" aria-hidden="true" />
                  {groupedTransactions[date].length} transaksi
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {groupedTransactions[date].map((transaction, index) => {
                  const isIncome = transaction.type === TransactionType.INCOME || transaction.type === TransactionType.DEBT;
                  const isEditing = editingId === transaction.id;
                  return (
                    <article key={transaction.id} className={`${index > 0 ? 'border-t border-border' : ''} transition-colors hover:bg-muted/30`}>
                      <div className="flex items-center gap-3 p-4 sm:gap-4 xl:px-5">
                        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${isIncome ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'}`}>
                          {isIncome ? <ArrowUpRight className="size-5" aria-hidden="true" /> : <ArrowDownLeft className="size-5" aria-hidden="true" />}
                        </div>

                        <div className="min-w-0 flex-1 xl:grid xl:grid-cols-[minmax(0,1.5fr)_minmax(140px,0.7fr)] xl:items-center xl:gap-6">
                          <div className="min-w-0">
                            <h4 className="truncate text-[13px] font-semibold text-foreground sm:text-sm">{transaction.description || transaction.category}</h4>
                            <p className="mt-1 text-[10px] font-medium text-muted-foreground xl:hidden">{categoryLabel(transaction.category)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingId(isEditing ? null : transaction.id)}
                            aria-expanded={isEditing}
                            aria-controls={`categories-${transaction.id}`}
                            className="mt-1 inline-flex items-center gap-1 rounded-lg text-[10px] font-semibold text-muted-foreground transition-colors hover:text-primary xl:mt-0 xl:w-fit xl:border xl:border-border xl:bg-background xl:px-3 xl:py-2 xl:text-xs"
                          >
                            <span className="hidden xl:inline">{categoryLabel(transaction.category)}</span>
                            <span className="xl:hidden">Ubah kategori</span>
                            <ChevronDown className={`size-3 transition-transform ${isEditing ? 'rotate-180' : ''}`} aria-hidden="true" />
                          </button>
                        </div>

                        <p className={`shrink-0 text-right text-sm font-bold tabular-nums sm:text-[15px] ${isIncome ? 'text-primary' : 'text-rose-500'}`}>
                          {isIncome ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                        </p>
                      </div>

                      {isEditing && (
                        <div id={`categories-${transaction.id}`} className="grid grid-cols-3 gap-2 border-t border-border bg-muted/20 p-3 sm:grid-cols-5 xl:grid-cols-7" aria-label="Pilih kategori baru">
                          {CATEGORIES.map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => updateCategory(transaction.id, category)}
                              aria-pressed={transaction.category === category}
                              className={`min-h-10 rounded-lg px-2 py-2 text-[10px] font-semibold transition-colors ${
                                transaction.category === category
                                  ? 'bg-primary text-primary-foreground'
                                  : 'border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
                              }`}
                            >
                              {categoryLabel(category)}
                            </button>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {sortedDates.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card py-24 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Search className="size-6" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t('history.no_results') || 'Transaksi tidak ditemukan'}</p>
              <p className="mt-1 text-xs text-muted-foreground">Coba ubah kata pencarian atau filter.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
});

TransactionList.displayName = 'TransactionList';

export default TransactionList;
