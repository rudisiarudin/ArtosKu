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
  isMobile?: boolean;
}

const Dashboard: React.FC<DashboardProps> = React.memo(({ userName, profile, transactions, wallets, onShowAll, onTopup, onQuickAction, setActiveTab, onSearch, onShowNotifications, onSetLimit, hasUnreadNotifications, isMobile: isMobileProp }) => {
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

  const quickActions = [
    { id: 'transfer', icon: 'fa-arrow-right-arrow-left', label: 'Transfer', action: () => onQuickAction('Transfer'), color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'pay', icon: 'fa-qrcode', label: 'Pay', action: () => onQuickAction('Pay'), color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'stats', icon: 'fa-chart-pie', label: 'Stats', action: () => setActiveTab('stats'), color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'ai', icon: 'fa-robot', label: 'Artos AI', action: () => document.dispatchEvent(new CustomEvent('open-ai-chat')), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'budget', icon: 'fa-bullseye', label: 'Budget', action: () => setActiveTab('budget'), color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  if (isMobile) {
    return (
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
    );
  }

  return (
      <div className="hidden lg:flex flex-col min-h-screen bg-background text-foreground transition-all duration-500">
        <main className="max-w-7xl mx-auto w-full pb-24 space-y-10">
          
          {/* ─── ELITE HEADER SECTION ─── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Master Asset Card */}
            <div className="lg:col-span-6 xl:col-span-5">
              <div className="w-full aspect-[1.7/1] rounded-[24px] md:rounded-[40px] p-6 md:p-10 bg-gradient-to-br from-zinc-800 via-zinc-950 to-black border border-white/10 relative overflow-hidden group shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col justify-between">
                {/* Dynamic Aura */}
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-all duration-1000" />
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/5 blur-[80px] rounded-full opacity-50" />
                
                <div className="relative z-10 flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-1 md:mb-2">Total Institutional Assets</p>
                    <h1 className="text-2xl md:text-4xl xl:text-5xl font-black text-white tracking-tighter flex items-baseline gap-2">
                      <span className="text-sm md:text-xl text-white/30 font-bold uppercase">Idr</span>
                      {formatIDR(totals.balance)}
                    </h1>
                  </div>
                  <div className="bg-primary/10 backdrop-blur-2xl border border-primary/20 rounded-xl md:rounded-2xl px-3 py-1 md:px-4 md:py-2 flex items-center gap-2 md:gap-2.5">
                    <div className="size-1.5 md:size-2 rounded-full bg-primary animate-pulse shadow-[0_0_12px_#10b981]" />
                    <span className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-[0.2em]">Verified Elite</span>
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 md:gap-6 mb-4 md:mb-8 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="w-10 h-7 md:w-14 md:h-10 rounded-lg bg-gradient-to-br from-amber-400/80 to-amber-600/80 border border-amber-400/30 shadow-inner relative overflow-hidden">
                       <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    </div>
                    <div className="flex gap-1">
                      {[1,2,3].map(i => <div key={i} className="w-4 md:w-6 h-[1px] bg-white/20" />)}
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div className="space-y-1">
                      <p className="text-[16px] md:text-[22px] font-mono font-black tracking-[0.2em] md:tracking-[0.25em] text-white/90 drop-shadow-2xl">
                        **** **** **** 8421
                      </p>
                      <p className="text-[10px] md:text-[12px] font-black text-white/40 uppercase tracking-[0.3em] font-sans">
                        {userName}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Tier Connection</p>
                      <p className="text-[12px] md:text-[14px] font-mono font-black text-white/60">ACTIVE_X_72</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="lg:col-span-6 xl:col-span-7 grid grid-cols-2 gap-4 md:gap-6">
              <div className="bg-card/40 backdrop-blur-3xl rounded-[32px] md:rounded-[40px] p-6 md:p-10 flex flex-col justify-between border border-white/5 relative overflow-hidden group hover:border-primary/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10 space-y-4 md:space-y-6">
                  <div className="size-12 md:size-16 rounded-[20px] md:rounded-[24px] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_20px_40px_rgba(16,185,129,0.1)] group-hover:scale-110 transition-transform duration-500">
                    <i className="fa-solid fa-arrow-down-long text-xl md:text-2xl"></i>
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[11px] font-black text-white/30 uppercase tracking-[0.3em] mb-1 md:mb-3">Institutional Inflow</p>
                    <p className="text-xl md:text-3xl xl:text-4xl font-black text-white tracking-tighter">Rp{formatIDR(totals.income)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card/40 backdrop-blur-3xl rounded-[32px] md:rounded-[40px] p-6 md:p-10 flex flex-col justify-between border border-white/5 relative overflow-hidden group hover:border-rose-500/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10 space-y-4 md:space-y-6">
                  <div className="size-12 md:size-16 rounded-[20px] md:rounded-[24px] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-[0_20px_40px_rgba(244,63,94,0.1)] group-hover:scale-110 transition-transform duration-500">
                    <i className="fa-solid fa-arrow-up-long text-xl md:text-2xl"></i>
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[11px] font-black text-white/30 uppercase tracking-[0.3em] mb-1 md:mb-3">Operating Expense</p>
                    <p className="text-xl md:text-3xl xl:text-4xl font-black text-white tracking-tighter">Rp{formatIDR(totals.expense)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── QUICK COMMANDS ─── */}
          <section className="bg-card/20 backdrop-blur-xl rounded-[40px] p-8 border border-white/5 shadow-2xl">
            <div className="flex items-center gap-10 overflow-x-auto no-scrollbar py-2">
              {quickActions.map((action) => (
                <button 
                  key={action.id}
                  onClick={action.action}
                  className="flex flex-col items-center gap-4 min-w-[90px] group transition-all"
                >
                  <div className={`size-20 rounded-[28px] ${action.bg} ${action.color} flex items-center justify-center text-2xl transition-all duration-500 border border-white/5 group-hover:scale-110 group-hover:shadow-2xl group-active:scale-95`}>
                    <i className={`fa-solid ${action.icon}`}></i>
                  </div>
                  <span className="text-[11px] font-black text-white/40 group-hover:text-white uppercase tracking-[0.2em] transition-colors">{action.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ─── DATA GRID ─── */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-10">
            
            {/* Allocation Panel */}
            <div className="xl:col-span-4">
              <div className="bg-card/40 backdrop-blur-3xl rounded-[48px] p-10 border border-white/5 h-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-[60px]" />
                
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-[11px] font-black tracking-[0.4em] text-white/30 uppercase">Portfolio Allocation</h3>
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <i className="fa-solid fa-vault text-sm"></i>
                  </div>
                </div>
                
                <div className="space-y-8">
                  {wallets.map((wallet) => {
                    const percent = totals.balance > 0 ? (Number(wallet.balance) / totals.balance) * 100 : 0;
                    return (
                      <div key={wallet.id} onClick={() => setActiveTab('wallets')} className="group cursor-pointer">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-white/30 group-hover:text-primary transition-colors">
                              <i className="fa-solid fa-building-columns text-xs"></i>
                            </div>
                            <div>
                              <p className="text-[14px] font-black text-white/80 group-hover:text-white transition-colors">{wallet.name}</p>
                              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{percent.toFixed(1)}% Weight</p>
                            </div>
                          </div>
                          <p className="text-[14px] font-black tabular-nums text-white">Rp{formatIDR(Number(wallet.balance))}</p>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <button 
                    onClick={() => setActiveTab('wallets')}
                    className="w-full mt-6 py-5 rounded-3xl border-2 border-dashed border-white/5 text-[11px] font-black text-white/20 uppercase tracking-[0.3em] hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-500"
                  >
                    <i className="fa-solid fa-plus-circle mr-3"></i>
                    Expand Portfolio
                  </button>
                </div>
              </div>
            </div>

            {/* Ledger Panel */}
            <div className="xl:col-span-8">
              <div className="bg-card/40 backdrop-blur-3xl rounded-[48px] p-10 border border-white/5 h-full shadow-2xl">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-[11px] font-black tracking-[0.4em] text-white/30 uppercase">Transaction Ledger</h3>
                  <button onClick={onShowAll} className="px-6 py-2.5 rounded-full bg-primary/10 text-[10px] font-black text-primary hover:bg-primary hover:text-black tracking-[0.2em] transition-all uppercase">
                    Audit All
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="pb-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Signature</th>
                        <th className="pb-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Classification</th>
                        <th className="pb-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] text-right">Settlement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recentTransactions.map((tx) => (
                        <tr key={tx.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="py-6">
                            <div className="flex items-center gap-5">
                              <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 group-hover:scale-110 transition-transform ${
                                (tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT)
                                  ? 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                  : 'bg-rose-500/10 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
                              }`}>
                                <i className={`fa-solid ${getCategoryIcon(tx.category)} text-base`}></i>
                              </div>
                              <div>
                                <p className="text-[14px] font-black text-white group-hover:text-primary transition-colors">{tx.description}</p>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">
                                  {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-6">
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-zinc-900 border border-white/5 text-[10px] font-black text-white/50 group-hover:text-white transition-colors uppercase tracking-widest">
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-6 text-right">
                            <p className={`text-[16px] font-black tabular-nums tracking-tighter ${
                              (tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT) ? 'text-primary' : 'text-white/90'
                            }`}>
                              {(tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT) ? '+' : '-'}{formatIDR(tx.amount)}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </section>
        </main>
      </div>
  );
});

export default Dashboard;