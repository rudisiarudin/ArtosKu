import React, { useMemo } from 'react';
import { Transaction, TransactionType, Wallet, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

export interface DashboardViewProps {
  userName: string;
  profile: UserProfile | null;
  transactions: Transaction[];
  wallets: Wallet[];
  totals: { balance: number; income: number; expense: number };
  recentTransactions: Transaction[];
  onShowAll: () => void;
  onTopup: (walletId: string) => void;
  onQuickAction: (label: string) => void;
  setActiveTab: (tab: any) => void;
  formatIDR: (val: number) => string;
  getCategoryIcon: (category: string) => string;
  onSearch: () => void;
  onShowNotifications: () => void;
  hasUnreadNotifications?: boolean;
}

const DashboardMobile: React.FC<DashboardViewProps> = React.memo(({
  userName, profile, transactions, wallets, totals, recentTransactions,
  onShowAll, onTopup, onQuickAction, setActiveTab, formatIDR, getCategoryIcon, onSearch, onShowNotifications, hasUnreadNotifications
}) => {
  const { t } = useLanguage();
  const [timeframe, setTimeframe] = React.useState<'weekly' | 'monthly'>('weekly');
  const [summaryFilter, setSummaryFilter] = React.useState<'TODAY' | 'WEEKLY' | 'MONTHLY'>('TODAY');
  const [hideBalance, setHideBalance] = React.useState(false);

  const { filteredIncome, filteredExpense } = useMemo(() => {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (summaryFilter === 'WEEKLY') {
      start.setDate(now.getDate() - 7);
    } else if (summaryFilter === 'MONTHLY') {
      start.setMonth(now.getMonth() - 1);
    }

    let inc = 0;
    let exp = 0;

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d >= start) {
        if (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT) inc += Number(t.amount);
        if (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE) exp += Number(t.amount);
      }
    });

    return { filteredIncome: inc, filteredExpense: exp };
  }, [transactions, summaryFilter]);

  const categoryStats = useMemo(() => {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (timeframe === 'weekly') {
      start.setDate(now.getDate() - 7);
    } else {
      start.setMonth(now.getMonth() - 1);
    }

    let totalSpend = 0;
    const catMap: Record<string, number> = {};

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d >= start && (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE)) {
        totalSpend += Number(t.amount);
        catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
      }
    });

    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const top3 = sortedCats.slice(0, 3);
    
    // We need 3 colors: emerald-400, indigo-500, rose-500
    const colors = ['bg-emerald-400', 'bg-indigo-500', 'bg-rose-500'];
    const formattedTop = top3.map(([name, amount], index) => ({
      name,
      amount,
      percent: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
      color: colors[index] || 'bg-zinc-500'
    }));

    return { totalSpend, topCats: formattedTop };
  }, [transactions, timeframe]);

  return (
    <div className="w-full font-sans">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md px-6 pt-8 pb-4 flex items-center justify-between border-b border-zinc-900 shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src={profile?.avatar_url || "https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png"} 
            alt="user" 
            className="w-12 h-12 rounded-full object-cover bg-zinc-800"
            onClick={() => setActiveTab('profile')}
          />
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Good Evening</p>
            <h2 className="text-[15px] font-medium tracking-tight text-zinc-200">{userName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSearch} className="w-10 h-10 rounded-[14px] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 active:scale-95 transition-transform">
            <i className="fa-solid fa-magnifying-glass text-sm"></i>
          </button>
          <button onClick={onShowNotifications} className="w-10 h-10 rounded-[14px] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 relative active:scale-95 transition-transform">
            <i className="fa-regular fa-bell text-sm"></i>
            {hasUnreadNotifications && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full"></span>}
          </button>
        </div>
      </header>

      <main className="px-6 space-y-8 mt-6">
        
        {/* TOTAL BALANCE */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Total Balance</p>
            <button onClick={() => setHideBalance(!hideBalance)} className="p-1 -ml-1">
              <i className={`fa-solid ${hideBalance ? 'fa-eye-slash' : 'fa-eye'} text-emerald-400/50 text-[10px]`}></i>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-[34px] font-semibold tracking-tight leading-none">
              Rp{hideBalance ? '••••••' : formatIDR(totals.balance)}
            </h1>
            <div className="flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded-md">
              <i className="fa-solid fa-arrow-trend-down text-rose-500 text-[10px]"></i>
              <span className="text-rose-500 text-[11px] font-bold">-1.5%</span>
            </div>
          </div>
        </section>

        {/* SUMMARY SECTION */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Summary</h3>
            <button 
              onClick={() => setSummaryFilter(prev => prev === 'TODAY' ? 'WEEKLY' : prev === 'WEEKLY' ? 'MONTHLY' : 'TODAY')}
              className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-4 py-1.5 rounded-full text-[11px] font-bold text-zinc-300 active:scale-95 transition-transform"
            >
              {summaryFilter} <i className="fa-solid fa-rotate text-[10px] ml-1 text-emerald-500"></i>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* INCOME */}
            <div className="bg-zinc-900 rounded-[24px] p-5 border border-zinc-800/50">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-arrow-down text-emerald-500 text-[11px]"></i>
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Income</p>
              <p className="text-[18px] font-semibold tracking-tight mb-2">Rp{formatIDR(filteredIncome)}</p>
              <p className="text-[10px] font-medium text-zinc-500">
                {filteredIncome === 0 ? `No income ${summaryFilter.toLowerCase()}` : `Total ${summaryFilter.toLowerCase()} income`}
              </p>
            </div>
            
            {/* EXPENSE */}
            <div className="bg-zinc-900 rounded-[24px] p-5 border border-zinc-800/50">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-arrow-up text-rose-500 text-[11px]"></i>
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Expense</p>
              <p className="text-[18px] font-semibold tracking-tight mb-2">Rp{formatIDR(filteredExpense)}</p>
              <p className="text-[10px] font-medium text-rose-400">
                {filteredExpense === 0 ? `No spending ${summaryFilter.toLowerCase()}` : `${summaryFilter.toLowerCase()} Spending`}
              </p>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Categories</h3>
            <button onClick={() => setActiveTab('stats')} className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
              View <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>

          <div className="bg-zinc-900 rounded-[24px] p-6 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex bg-black rounded-[14px] p-1 border border-zinc-800">
                <button 
                  className={`px-4 py-2 rounded-[10px] text-[12px] font-bold transition-all ${timeframe === 'weekly' ? 'bg-white text-black' : 'text-zinc-500'}`}
                  onClick={() => setTimeframe('weekly')}
                >
                  weekly
                </button>
                <button 
                  className={`px-4 py-2 rounded-[10px] text-[12px] font-bold transition-all ${timeframe === 'monthly' ? 'bg-white text-black' : 'text-zinc-500'}`}
                  onClick={() => setTimeframe('monthly')}
                >
                  monthly
                </button>
              </div>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{timeframe === 'weekly' ? 'Past 7 Days' : 'This Month'}</p>
            </div>

            <div className="mb-6">
              <h1 className="text-[24px] font-semibold tracking-tight mb-1">Rp{formatIDR(categoryStats.totalSpend)}</h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Total spending this {timeframe === 'weekly' ? 'week' : 'month'}
              </p>
            </div>

            {/* Proportion Bar */}
            <div className="h-2 w-full bg-zinc-800 rounded-full flex overflow-hidden mb-6">
              {categoryStats.topCats.map(cat => (
                <div key={cat.name} className={`h-full ${cat.color}`} style={{width: `${cat.percent}%`}}></div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-3">
               {categoryStats.topCats.map(cat => (
                 <div key={cat.name} className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                     <p className="text-[12px] font-medium text-zinc-300 capitalize">{cat.name}</p>
                   </div>
                   <p className="text-[10px] font-bold text-zinc-600">{cat.percent.toFixed(0)}%</p>
                 </div>
               ))}
               {categoryStats.topCats.length === 0 && (
                 <p className="text-[12px] text-zinc-500 italic">No category data</p>
               )}
            </div>
          </div>
        </section>

        {/* SHORTCUTS */}
        <section>
          <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Shortcuts</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => onQuickAction('Log')}
                className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] active:scale-95 transition-transform"
              >
                <i className="fa-solid fa-plus text-sm"></i>
              </button>
              <span className="text-[10px] font-bold text-zinc-500">Log</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => onQuickAction('Top Up')}
                className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] active:scale-95 transition-transform"
              >
                <i className="fa-solid fa-plus text-sm"></i>
              </button>
              <span className="text-[10px] font-bold text-zinc-500">Top Up</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => onQuickAction('Loan')}
                className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] active:scale-95 transition-transform"
              >
                <i className="fa-solid fa-hand-holding-dollar text-sm"></i>
              </button>
              <span className="text-[10px] font-bold text-zinc-500">Loan</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => onQuickAction('Send Money')}
                className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)] active:scale-95 transition-transform"
              >
                <i className="fa-solid fa-paper-plane text-sm"></i>
              </button>
              <span className="text-[10px] font-bold text-zinc-500">Send Money</span>
            </div>
          </div>
        </section>

        {/* RECENT ACTIVITY */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Recent Activity</h3>
            <button onClick={onShowAll} className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-right hover:text-emerald-400">
              See All
            </button>
          </div>
          
          <div className="space-y-3">
            {recentTransactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800/50 rounded-[16px] active:bg-zinc-800 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${
                    (tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT)
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    <i className={`fa-solid ${getCategoryIcon(tx.category)} text-[13px]`}></i>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-zinc-200">{tx.description}</p>
                    <p className="text-[10px] font-medium text-zinc-500 mt-0.5">{tx.category} • {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
                <div className="text-right pl-4">
                  <p className={`text-[13px] font-black tabular-nums tracking-tight whitespace-nowrap ${
                    (tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT) ? 'text-emerald-500' : 'text-zinc-200'
                  }`}>
                    {(tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT) ? '+' : '-'}{formatIDR(tx.amount)}
                  </p>
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="py-8 text-center text-zinc-600 font-medium text-[12px]">
                No recent transactions
              </div>
            )}
          </div>
        </section>
        
      </main>
    </div>
  );
});

export default DashboardMobile;
