import React, { useMemo, useEffect, useState } from 'react';
import { Transaction, TransactionType, Wallet, UserProfile, Dream } from '../types';
import { getLocalIsoDate } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import DashboardMobile from './DashboardMobile';
import { WalletLogo } from './WalletLogo';
import { useCountUp } from '../hooks/useCountUp';

interface DashboardProps {
  userName: string;
  profile: UserProfile | null;
  transactions: Transaction[];
  wallets: Wallet[];
  dreams: Dream[];
  onShowAll: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onTopup: (walletId: string) => void;
  onQuickAction: (label: string) => void;
  setActiveTab: (tab: any) => void;
  onSearch: () => void;
  onShowNotifications: () => void;
  onSetLimit?: (category: string) => void;
  hasUnreadNotifications?: boolean;
  isMobile?: boolean;
}

const Dashboard: React.FC<DashboardProps> = React.memo(({ userName, profile, transactions, wallets, dreams, onShowAll, onTopup, onQuickAction, setActiveTab, onSearch, onShowNotifications, onSetLimit, hasUnreadNotifications, isMobile: isMobileProp }) => {
  const [timeframe, setTimeframe] = React.useState<'weekly' | 'monthly'>('monthly');
  const [internalIsMobile, setInternalIsMobile] = React.useState(isMobileProp || window.innerWidth < 1280);
  const { t } = useLanguage();

  useEffect(() => {
    const handleResize = () => {
      setInternalIsMobile(isMobileProp || window.innerWidth < 1280);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileProp]);

  const isMobile = internalIsMobile;

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0
    }).format(val);
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, string> = {
      'Makan': 'fa-utensils',
      'Transport': 'fa-car',
      'Shop': 'fa-shopping-bag',
      'Tagihan': 'fa-file-invoice-dollar',
      'Hiburan': 'fa-gamepad',
      'Kesehatan': 'fa-heart-pulse',
      'Gaji': 'fa-money-bill-wave',
      'Investasi': 'fa-chart-line',
      'Hadiah': 'fa-gift',
      'Topup': 'fa-arrow-up',
      'Loan': 'fa-hand-holding-dollar',
      'Others': 'fa-receipt'
    };
    return iconMap[category] || 'fa-receipt';
  };

  const totals = useMemo(() => {
    const balance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    const targetDate = new Date();
    if (timeframe === 'weekly') {
      targetDate.setDate(targetDate.getDate() - 7);
    } else {
      targetDate.setMonth(targetDate.getMonth() - 1);
    }

    const income = transactions
      .filter(t => (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT) && new Date(t.date) >= targetDate)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
      .filter(t => (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE) && new Date(t.date) >= targetDate)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return { balance, income, expense };
  }, [transactions, wallets, timeframe]);

  const recentTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);
  
  const animatedBalance = useCountUp(totals.balance, 1500);

  const topExpenseCategories = useMemo(() => {
    const now = new Date();
    const start = new Date();
    start.setMonth(now.getMonth() - 1);
    const map: Record<string, number> = {};
    let total = 0;
    transactions.forEach(tx => {
      if ((tx.type === TransactionType.EXPENSE || tx.type === TransactionType.RECEIVABLE) && new Date(tx.date) >= start) {
        map[tx.category] = (map[tx.category] || 0) + Number(tx.amount);
        total += Number(tx.amount);
      }
    });
    return {
      total,
      items: Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, amount]) => ({ name, amount, percent: total > 0 ? (amount / total) * 100 : 0 })),
    };
  }, [transactions]);

  const quickActions = [
    { id: 'transfer', icon: 'fa-arrow-right-arrow-left', label: 'Transfer', action: () => onQuickAction('Transfer'), color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'pay', icon: 'fa-qrcode', label: 'Pay', action: () => onQuickAction('Pay'), color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'stocks', icon: 'fa-chart-line', label: t('nav.stocks'), action: () => setActiveTab('stocks'), color: 'text-primary', bg: 'bg-primary/10' },
    { id: 'stats', icon: 'fa-chart-pie', label: 'Stats', action: () => setActiveTab('stats'), color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'dreams', icon: 'fa-star', label: 'Dreams', action: () => setActiveTab('dreams'), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'budget', icon: 'fa-bullseye', label: 'Budget', action: () => setActiveTab('budget'), color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  if (isMobile) {
    return (
      <DashboardMobile 
        userName={userName}
        profile={profile}
        transactions={transactions}
        wallets={wallets}
        dreams={dreams}
        totals={totals}
        recentTransactions={recentTransactions}
        onShowAll={onShowAll}
        onTopup={onTopup}
        onQuickAction={onQuickAction}
        setActiveTab={setActiveTab}
        formatIDR={formatIDR}
        getCategoryIcon={getCategoryIcon}
        onSearch={onSearch}
        onShowNotifications={onShowNotifications}
        hasUnreadNotifications={hasUnreadNotifications}
      />
    );
  }

  const savingsRate = totals.income > 0 ? Math.max(0, ((totals.income - totals.expense) / totals.income) * 100) : 0;

  return (
      <div className="hidden lg:flex flex-col min-h-screen bg-background text-foreground transition-all duration-500">
        <main className="max-w-7xl mx-auto w-full px-2 pb-24 space-y-6">

          {/* ─── OVERVIEW: BALANCE + QUICK ACTIONS ─── */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Balance hero */}
            <div className="xl:col-span-7">
              <div className="h-full rounded-3xl p-8 bg-gradient-to-br from-primary/90 via-primary to-emerald-600 relative overflow-hidden shadow-lg shadow-primary/20 flex flex-col justify-between min-h-[220px]">
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 blur-[90px] rounded-full" />
                <div className="absolute -bottom-24 -left-16 w-64 h-64 bg-black/10 blur-[80px] rounded-full" />
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-white/70 uppercase tracking-[0.2em]">Total Saldo</p>
                    <h1 className="mt-2 text-4xl xl:text-5xl font-bold text-white tracking-tight flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-white/60">Rp</span>
                      {formatIDR(animatedBalance)}
                    </h1>
                  </div>
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-3 py-1.5">
                    <span className="size-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Realtime</span>
                  </div>
                </div>
                <div className="relative z-10 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Pemilik Akun</p>
                    <p className="text-base font-semibold text-white mt-0.5">{userName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Tingkat Menabung</p>
                    <p className="text-base font-semibold text-white mt-0.5">{savingsRate.toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Income + Expense stacked */}
            <div className="xl:col-span-5 grid grid-rows-2 gap-6">
              <div className="rounded-3xl p-6 bg-card border border-border flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <i className="fa-solid fa-arrow-down-long text-xl"></i>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pemasukan (30 Hari)</p>
                  <p className="text-2xl xl:text-3xl font-bold text-foreground tracking-tight mt-1">Rp{formatIDR(totals.income)}</p>
                </div>
              </div>
              <div className="rounded-3xl p-6 bg-card border border-border flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="size-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                  <i className="fa-solid fa-arrow-up-long text-xl"></i>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pengeluaran (30 Hari)</p>
                  <p className="text-2xl xl:text-3xl font-bold text-foreground tracking-tight mt-1">Rp{formatIDR(totals.expense)}</p>
                </div>
              </div>
            </div>
          </section>

          {/* ─── QUICK ACTIONS ─── */}
          <section className="rounded-3xl p-6 bg-card border border-border shadow-sm">
            <div className="grid grid-cols-6 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="flex flex-col items-center gap-3 group transition-all"
                >
                  <div className={`size-16 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center text-xl transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 group-active:scale-95`}>
                    <i className={`fa-solid ${action.icon}`}></i>
                  </div>
                  <span className="text-[12px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ─── DATA GRID ─── */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* Portfolio Allocation */}
            <div className="xl:col-span-4">
              <div className="bg-card rounded-3xl p-7 border border-border h-full shadow-sm">
                <div className="flex items-center justify-between mb-7">
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Alokasi Portofolio</h3>
                  <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <i className="fa-solid fa-wallet text-sm"></i>
                  </div>
                </div>

                <div className="space-y-6">
                  {wallets.map((wallet) => {
                    const percent = totals.balance > 0 ? (Number(wallet.balance) / totals.balance) * 100 : 0;
                    return (
                      <div key={wallet.id} onClick={() => setActiveTab('wallets')} className="group cursor-pointer">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                              <WalletLogo wallet={wallet} size={16} />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-foreground">{wallet.name}</p>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{percent.toFixed(1)}% dari total</p>
                            </div>
                          </div>
                          <p className="text-[13px] font-bold tabular-nums text-foreground">Rp{formatIDR(Number(wallet.balance))}</p>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-1000"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => setActiveTab('wallets')}
                    className="w-full mt-2 py-4 rounded-2xl border-2 border-dashed border-border text-[12px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-300"
                  >
                    <i className="fa-solid fa-plus mr-2"></i>
                    Kelola Dompet
                  </button>

                  {/* Top spending categories */}
                  {topExpenseCategories.items.length > 0 && (
                    <div className="pt-5 border-t border-border space-y-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pengeluaran Terbesar</p>
                      {topExpenseCategories.items.map((c) => (
                        <div key={c.name} className="flex items-center justify-between text-[12px]">
                          <span className="font-medium text-foreground">{c.name}</span>
                          <span className="font-semibold tabular-nums text-muted-foreground">Rp{formatIDR(c.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transaction history */}
            <div className="xl:col-span-8">
              <div className="bg-card rounded-3xl p-7 border border-border h-full shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Transaksi Terbaru</h3>
                  <button onClick={onShowAll} className="px-4 py-2 rounded-full bg-primary/10 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                    Lihat Semua
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Transaksi</th>
                        <th className="pb-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kategori</th>
                        <th className="pb-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentTransactions.map((tx) => {
                        const isIncome = tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT;
                        return (
                          <tr key={tx.id} className="group hover:bg-muted/50 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-4">
                                <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${
                                  isIncome ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'
                                }`}>
                                  <i className={`fa-solid ${getCategoryIcon(tx.category)} text-sm`}></i>
                                </div>
                                <div>
                                  <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">{tx.description}</p>
                                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                                    {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                                {tx.category}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <p className={`text-[14px] font-bold tabular-nums ${isIncome ? 'text-primary' : 'text-foreground'}`}>
                                {isIncome ? '+' : '-'}Rp{formatIDR(tx.amount)}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {recentTransactions.length === 0 && (
                    <div className="py-16 text-center">
                      <div className="size-14 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
                        <i className="fa-solid fa-receipt text-xl"></i>
                      </div>
                      <p className="text-[13px] font-medium text-muted-foreground">Belum ada transaksi</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </section>
        </main>
      </div>
  );
});

export default Dashboard;
