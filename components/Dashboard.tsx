import React, { useMemo } from 'react';
import { Transaction, TransactionType, Wallet, UserProfile } from '../types';
import { getLocalIsoDate } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import DashboardMobile from './DashboardMobile';

interface DashboardProps {
  userName: string;
  profile: UserProfile | null;
  transactions: Transaction[];
  wallets: Wallet[];
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
}

const Dashboard: React.FC<DashboardProps> = React.memo(({ userName, profile, transactions, wallets, onShowAll, onTopup, onQuickAction, setActiveTab, onSearch, onShowNotifications, onSetLimit, hasUnreadNotifications }) => {
  const [timeframe, setTimeframe] = React.useState<'weekly' | 'monthly'>('monthly');
  const { t } = useLanguage();

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

  const quickActions = [
    { id: 'transfer', icon: 'fa-arrow-right-arrow-left', label: 'Transfer', action: () => onQuickAction('Transfer'), color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'topup', icon: 'fa-wallet', label: 'Top Up', action: () => onTopup(wallets[0]?.id), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'pay', icon: 'fa-qrcode', label: 'Pay', action: () => onQuickAction('Pay'), color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'stats', icon: 'fa-chart-pie', label: 'Stats', action: () => setActiveTab('stats'), color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'budget', icon: 'fa-bullseye', label: 'Budget', action: () => setActiveTab('budget'), color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <>
      <div className="block lg:hidden">
        <DashboardMobile 
          userName={userName}
          profile={profile}
          transactions={transactions}
          wallets={wallets}
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
      </div>
      
      <div className="hidden lg:flex flex-col min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)]">
        
        {/* HEADER */}
        <header className="sticky top-0 z-[40] bg-[var(--bg-deep)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 lg:px-8 py-4 mb-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-black tracking-tight">{t('nav.dashboard')}</h2>
              <div className="relative w-72 lg:w-96 hidden md:block">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs"></i>
                <input 
                  type="text" 
                  placeholder="Search anything..." 
                  className="w-full bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                  onClick={onSearch}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={onShowNotifications} className="w-10 h-10 rounded-xl bg-[var(--bg-inner)] flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-all relative border border-[var(--border-subtle)]">
                <i className="fa-regular fa-bell"></i>
                {hasUnreadNotifications && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[var(--bg-deep)]"></span>}
              </button>
              <div className="h-6 w-[1px] bg-[var(--border-subtle)] mx-1 hidden sm:block" />
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('profile')}>
                <div className="text-right hidden sm:block">
                  <p className="text-[13px] font-bold leading-none mb-1">{userName}</p>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Premium Member</p>
                </div>
                <img src={profile?.avatar_url || "https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png"} alt="user" className="w-10 h-10 rounded-xl object-cover ring-2 ring-transparent group-hover:ring-emerald-500/30 transition-all border border-[var(--border-subtle)]" />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto w-full px-6 lg:px-8 pb-24 space-y-8">
          
          {/* ROW 1: BALANCE & IN/OUT */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Credit Card View */}
            <div className="lg:col-span-6 xl:col-span-5">
              <div className="w-full aspect-[1.8/1] rounded-[24px] p-6 md:p-8 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-white/10 relative overflow-hidden group shadow-2xl flex flex-col justify-between">
                {/* Glow Effect */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 blur-[60px] rounded-full group-hover:bg-emerald-500/30 transition-all duration-700" />
                
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Total Balance</p>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-baseline gap-1">
                      <span className="text-lg text-white/60 font-medium">Rp</span>
                      {formatIDR(totals.balance)}
                    </h1>
                  </div>
                  <div className="flex bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Active</span>
                  </div>
                </div>

                <div className="relative z-10 space-y-5">
                  {/* Chip & NFC */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-9 rounded-md bg-gradient-to-br from-[#FFD700]/80 to-[#B8860B]/80 border border-[#FFD700]/30 backdrop-blur-sm relative overflow-hidden">
                      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/20" />
                      <div className="absolute inset-y-0 left-1/3 w-[1px] bg-black/20" />
                      <div className="absolute inset-y-0 right-1/3 w-[1px] bg-black/20" />
                    </div>
                    <i className="fa-solid fa-wifi rotate-90 text-white/40 text-lg"></i>
                  </div>
                  
                  {/* Number & Info */}
                  <div className="flex items-end justify-between">
                    <div className="space-y-1">
                      <p className="text-[16px] md:text-[20px] font-mono font-bold tracking-[0.2em] text-white/90 drop-shadow-md">
                        **** **** **** 8421
                      </p>
                      <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
                        {userName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-0.5">Valid Thru</p>
                      <p className="text-[13px] font-mono font-bold text-white/80">12/28</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Income & Expense */}
            <div className="lg:col-span-6 xl:col-span-7 grid grid-cols-2 gap-4 md:gap-6">
              <div className="premium-glass rounded-[24px] p-5 md:p-8 flex flex-col justify-between border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 space-y-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <i className="fa-solid fa-arrow-down text-lg md:text-xl"></i>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1 md:mb-2">Pemasukan</p>
                    <p className="text-xl md:text-3xl font-black text-white tracking-tight">Rp{formatIDR(totals.income)}</p>
                  </div>
                </div>
              </div>

              <div className="premium-glass rounded-[24px] p-5 md:p-8 flex flex-col justify-between border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 space-y-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <i className="fa-solid fa-arrow-up text-lg md:text-xl"></i>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1 md:mb-2">Pengeluaran</p>
                    <p className="text-xl md:text-3xl font-black text-white tracking-tight">Rp{formatIDR(totals.expense)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ROW 2: HORIZONTAL MENU */}
          <section className="bg-[var(--bg-inner)] rounded-[24px] p-4 md:p-6 border border-[var(--border-subtle)] -mx-6 md:mx-0 px-6 md:px-6">
            <div className="flex items-center gap-4 md:gap-8 overflow-x-auto no-scrollbar snap-x pb-2 md:pb-0">
              {quickActions.map((action) => (
                <button 
                  key={action.id}
                  onClick={action.action}
                  className="flex flex-col items-center gap-3 min-w-[72px] md:min-w-[80px] snap-center group"
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[16px] md:rounded-[18px] ${action.bg} ${action.color} flex items-center justify-center text-lg md:text-xl transition-all duration-300 active:scale-95 border border-[var(--border-subtle)]`}>
                    <i className={`fa-solid ${action.icon}`}></i>
                  </div>
                  <span className="text-[10px] md:text-[11px] font-bold text-white/60 active:text-white tracking-wide">{action.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ROW 3: ALLOCATION & TABLE */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* Wallet Allocation */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              <div className="premium-glass rounded-[24px] p-6 md:p-8 border border-white/5 flex-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black tracking-tight text-white uppercase">Allocation</h3>
                  <i className="fa-solid fa-wallet text-emerald-500"></i>
                </div>
                
                <div className="space-y-5">
                  {wallets.map((wallet) => {
                    const percent = totals.balance > 0 ? (Number(wallet.balance) / totals.balance) * 100 : 0;
                    return (
                      <div key={wallet.id} onClick={() => setActiveTab('wallets')} className="group cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-inner)] border border-[var(--border-subtle)] flex items-center justify-center text-white/50 group-active:text-emerald-500 transition-colors">
                              <i className="fa-solid fa-building-columns text-[10px]"></i>
                            </div>
                            <p className="text-[12px] font-bold tracking-wide text-white/80 group-active:text-white transition-colors">{wallet.name}</p>
                          </div>
                          <p className="text-[12px] font-black tabular-nums">Rp{formatIDR(Number(wallet.balance))}</p>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <button 
                    onClick={() => setActiveTab('wallets')}
                    className="w-full mt-4 py-3 rounded-xl border border-dashed border-white/20 text-[11px] font-bold text-white/40 uppercase tracking-widest active:border-emerald-500 active:text-emerald-500 transition-all active:bg-emerald-500/5 group"
                  >
                    <i className="fa-solid fa-plus mr-2"></i>
                    Manage Wallets
                  </button>
                </div>
              </div>
            </div>

            {/* Transaction Table */}
            <div className="xl:col-span-8">
              <div className="premium-glass rounded-[24px] p-6 md:p-8 border border-white/5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black tracking-tight text-white uppercase">Recent Transactions</h3>
                  <button onClick={onShowAll} className="text-[11px] font-bold text-emerald-500 active:text-emerald-400 tracking-wider">
                    VIEW ALL
                  </button>
                </div>

                <div className="overflow-x-auto flex-1 -mx-6 px-6 md:mx-0 md:px-0">
                  <table className="w-full text-left border-collapse min-w-[300px]">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] w-full md:w-auto">Transaction</th>
                        <th className="py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] hidden sm:table-cell">Category</th>
                        <th className="py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] hidden md:table-cell">Date</th>
                        <th className="py-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] text-right whitespace-nowrap pl-4">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-white/5 active:bg-white/[0.02] transition-colors group">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 ${
                                (tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT)
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-rose-500/10 text-rose-500'
                              }`}>
                                <i className={`fa-solid ${getCategoryIcon(tx.category)} text-[13px]`}></i>
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-white">{tx.description}</p>
                                <p className="text-[10px] font-medium text-white/40 block sm:hidden mt-0.5">{tx.category} • {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 hidden sm:table-cell">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--bg-inner)] border border-[var(--border-subtle)] text-[10px] font-bold text-white/60 tracking-wider">
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-4 hidden md:table-cell">
                            <p className="text-[12px] font-medium text-white/50">{new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                          </td>
                          <td className="py-4 text-right pl-4">
                            <p className={`text-[13px] font-black tabular-nums tracking-tight whitespace-nowrap ${
                              (tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT) ? 'text-emerald-500' : 'text-white/90'
                            }`}>
                              {(tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT) ? '+' : '-'}{formatIDR(tx.amount)}
                            </p>
                          </td>
                        </tr>
                      ))}
                      {recentTransactions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-white/30 text-[12px] font-medium italic">
                            No transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </section>
        </main>
      </div>
    </>
  );
});

export default Dashboard;