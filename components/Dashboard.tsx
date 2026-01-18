import React, { useMemo } from 'react';
import { Transaction, TransactionType, Wallet } from '../types';
import { getLocalIsoDate } from '../lib/utils';

interface DashboardProps {
  userName: string;
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
  hasUnreadNotifications?: boolean;
}

const Dashboard: React.FC<DashboardProps> = React.memo(({ userName, transactions, wallets, onShowAll, theme, setTheme, onTopup, onQuickAction, setActiveTab, onSearch, onShowNotifications, hasUnreadNotifications }) => {
  const [showBalance, setShowBalance] = React.useState(true);

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
    const today = getLocalIsoDate();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getLocalIsoDate(yesterdayDate);

    // INCOME & DEBT (Hutang) = uang masuk
    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME || t.type === TransactionType.DEBT)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    // EXPENSE & RECEIVABLE (Piutang) = uang keluar
    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    // Daily Logic
    const todayIncome = transactions
      .filter(t => (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT) && getLocalIsoDate(new Date(t.date)) === today)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const todayExpense = transactions
      .filter(t => (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE) && getLocalIsoDate(new Date(t.date)) === today)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const yesterdayExpense = transactions
      .filter(t => (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE) && getLocalIsoDate(new Date(t.date)) === yesterday)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate Trend (Net Performance % relative to total balance)
    const dailyDiff = todayIncome - todayExpense;
    const prevBalance = balance - dailyDiff;
    let percentage = 0;
    if (prevBalance > 0) {
      percentage = (dailyDiff / prevBalance) * 100;
    } else if (prevBalance === 0 && dailyDiff > 0) {
      percentage = 100;
    }

    return {
      balance,
      todayIncome,
      todayExpense,
      dailyDiff,
      percentage
    };
  }, [transactions, wallets]);

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  return (
    <div className="flex flex-col min-h-screen bg-black text-white pb-32 selection:bg-[#00d293]/20">
      {/* Spacer for fixed header */}
      <div className="h-[88px]"></div>

      {/* 1. Header Section */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-10 pb-6 flex items-center justify-between bg-black/80 backdrop-blur-xl border-b border-white/5 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveTab('profile')}
            className="w-11 h-11 rounded-full overflow-hidden border border-white/10 cursor-pointer active:scale-95 transition-all"
          >
            <img src="https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png" alt="profile" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
              {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
            </p>
            <h2 className="text-[15px] font-bold tracking-tight">{userName || 'Member ArtosKu'}</h2>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSearch}
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white transition-colors border border-white/5 active:scale-90"
          >
            <i className="fa-solid fa-magnifying-glass text-sm"></i>
          </button>
          <button
            onClick={onShowNotifications}
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white transition-colors border border-white/5 active:scale-90 relative"
          >
            <i className="fa-regular fa-bell text-sm"></i>
            {hasUnreadNotifications && (
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-zinc-900 animate-pulse"></span>
            )}
          </button>
        </div>
      </header>

      {/* 2. Current Balance & Daily Trends */}
      <section className="px-6 py-8 text-center space-y-2">
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="flex items-center justify-center gap-2 mx-auto group"
        >
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors">Current Balance</p>
          <i className={`fa-regular ${showBalance ? 'fa-eye' : 'fa-eye-slash'} text-[10px] text-zinc-600 group-hover:text-[#00d293] transition-colors`}></i>
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-bold text-zinc-500">IDR</span>
            <h1 className="text-[42px] font-bold tracking-tighter tabular-nums leading-none">
              {showBalance ? formatIDR(totals.balance) : '••••••••'}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold">
            <span className="text-zinc-500">
              {totals.dailyDiff >= 0 ? '+' : '-'}Rp{formatIDR(Math.abs(totals.dailyDiff))}
            </span>
            <span className={totals.dailyDiff >= 0 ? 'text-[#00d293]' : 'text-[#FF5252]'}>
              ({totals.percentage >= 0 ? '+' : ''}{totals.percentage.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-10">
          <div className="flex-1 h-14 rounded-full bg-[#00d293] flex flex-col items-center justify-center active:brightness-95 transition-all cursor-pointer shadow-[0_10px_25px_rgba(0,210,147,0.2)]">
            <p className="text-[9px] font-semibold text-black/50 uppercase tracking-wider mb-0.5">INCOME</p>
            <p className="text-[15px] font-bold text-black tracking-tight">{formatIDR(totals.todayIncome)}</p>
          </div>
          <div className="flex-1 h-14 rounded-full bg-[#FF5252] flex flex-col items-center justify-center shadow-[0_10px_25px_rgba(255,82,82,0.2)] active:brightness-95 transition-all cursor-pointer">
            <p className="text-[9px] font-semibold text-white/50 uppercase tracking-wider mb-0.5">EXPENSE</p>
            <p className="text-[15px] font-bold text-white tracking-tight">{formatIDR(totals.todayExpense)}</p>
          </div>
        </div>
      </section>

      {/* 3. Quick Access Grid */}
      <section className="px-6 pt-6">
        <h3 className="text-[14px] font-bold uppercase tracking-widest text-zinc-500 mb-5">Quick Access</h3>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: 'Log', icon: 'fa-circle-plus', color: 'text-[#00d293]', action: () => onQuickAction('Expense') },
            { label: 'Top Up', icon: 'fa-plus-circle', color: 'text-zinc-200', action: () => onTopup(wallets[0]?.id) },
            { label: 'Loan', icon: 'fa-hand-holding-dollar', color: 'text-zinc-200', action: () => onQuickAction('Loan') },
            { label: 'Deposit', icon: 'fa-vault', color: 'text-zinc-200', action: () => onQuickAction('Deposit') },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3 flex flex-col items-center gap-2 active:bg-zinc-800 transition-all text-center group"
            >
              <div className={`w-10 h-10 flex items-center justify-center ${item.color}`}>
                <i className={`fa-solid ${item.icon} text-lg group-hover:scale-110 transition-transform`}></i>
              </div>
              <span className="text-[9px] font-semibold tracking-tight text-zinc-500 group-hover:text-white capitalize">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Recent Transactions */}
      <section className="px-6 mt-12 mb-20">
        <div className="flex items-center justify-between mb-5 px-1">
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-white">Recent Activity</h3>
          <button onClick={onShowAll} className="text-[10px] font-semibold text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">See all</button>
        </div>

        <div className="space-y-2.5">
          {recentTransactions.map((t) => (
            <div key={t.id} className="bg-zinc-900/30 border border-white/5 rounded-[1.25rem] p-4 flex items-center justify-between group active:bg-zinc-900 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center text-zinc-500 group-hover:text-[#00d293] transition-colors shadow-inner">
                  <i className={`fa-solid ${getCategoryIcon(t.category)} text-sm`}></i>
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold text-white tracking-tight">{t.description}</h4>
                  <p className="text-[9px] text-zinc-600 font-semibold uppercase tracking-widest">
                    {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${(t.type === TransactionType.INCOME || t.type === TransactionType.DEBT) ? 'bg-[#00E676]' : 'bg-[#FF5252]'} shadow-lg`}></div>
                <p className={`text-[13px] font-bold tabular-nums tracking-tight ${(t.type === TransactionType.INCOME || t.type === TransactionType.DEBT) ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {(t.type === TransactionType.INCOME || t.type === TransactionType.DEBT) ? '+' : '-'}{formatIDR(t.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
});

export default Dashboard;
