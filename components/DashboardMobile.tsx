import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Transaction, TransactionType, Wallet, UserProfile } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

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
  const { t, lang } = useLanguage();
  const [summaryFilter, setSummaryFilter] = React.useState<'TODAY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [hideBalance, setHideBalance] = React.useState(false);

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting_morning');
    if (hour < 17) return t('dashboard.greeting_afternoon');
    return t('dashboard.greeting_evening');
  }, [t]);

  // Unified metrics calculation (Income, Expense, Percentages, Sparkline)
  const metrics = useMemo(() => {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const prevStart = new Date();
    prevStart.setHours(0, 0, 0, 0);

    if (summaryFilter === 'WEEKLY') {
      start.setDate(now.getDate() - 7);
      prevStart.setDate(start.getDate() - 7);
    } else if (summaryFilter === 'MONTHLY') {
      start.setMonth(now.getMonth() - 1);
      prevStart.setMonth(start.getMonth() - 1);
    } else {
      prevStart.setDate(now.getDate() - 1);
    }

    let inc = 0, exp = 0, prevInc = 0, prevExp = 0;
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const dailyNet: Record<string, number> = {};

    transactions.forEach(t => {
      const d = new Date(t.date);
      const val = Number(t.amount);
      const isInc = t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
      const isExp = t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE;

      if (d >= start) {
        if (isInc) inc += val;
        if (isExp) exp += val;
      } else if (d >= prevStart && d < start) {
        if (isInc) prevInc += val;
        if (isExp) prevExp += val;
      }

      if (d >= thirtyDaysAgo) {
        const dateKey = d.toISOString().split('T')[0];
        if (!dailyNet[dateKey]) dailyNet[dateKey] = 0;
        if (isInc) dailyNet[dateKey] += val;
        if (isExp) dailyNet[dateKey] -= val;
      }
    });

    const calcPct = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const incPct = calcPct(inc, prevInc);
    const expPct = calcPct(exp, prevExp);

    // Build 15-day Sparkline backwards
    let currentBal = totals.balance;
    const sparkline = [];
    const dateCursor = new Date(now);
    dateCursor.setHours(0, 0, 0, 0);

    for (let i = 0; i < 15; i++) {
      sparkline.unshift(currentBal);
      const dateKey = dateCursor.toISOString().split('T')[0];
      currentBal -= (dailyNet[dateKey] || 0);
      dateCursor.setDate(dateCursor.getDate() - 1);
    }

    const minBal = Math.min(...sparkline);
    const maxBal = Math.max(...sparkline);
    const range = maxBal - minBal || 1;
    let pathD = '', fillD = '';

    sparkline.forEach((val, i) => {
      const x = (i / (sparkline.length - 1)) * 100;
      const y = 45 - ((val - minBal) / range) * 40;
      if (i === 0) {
        pathD += `M${x},${y} `;
        fillD += `M${x},50 L${x},${y} `;
      } else {
        pathD += `L${x},${y} `;
        fillD += `L${x},${y} `;
      }
    });
    fillD += `L100,50 Z`;

    const past30Net = Object.values(dailyNet).reduce((a, b) => a + b, 0);
    const balance30DaysAgo = totals.balance - past30Net;
    const balPct = calcPct(totals.balance, balance30DaysAgo);

    return {
      inc, exp, incPct, expPct, balPct,
      sparklinePath: pathD,
      sparklineFill: fillD,
      lastY: sparkline.length > 0 ? 45 - ((sparkline[sparkline.length - 1] - minBal) / range) * 40 : 25
    };
  }, [transactions, totals.balance, summaryFilter]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setMonth(now.getMonth() - 1);

    let totalSpend = 0;
    const catMap: Record<string, number> = {};

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d >= start && (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE)) {
        totalSpend += Number(t.amount);
        catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
      }
    });

    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4);
    const colors = ['#10b981', '#6366f1', '#f43f5e', '#f59e0b'];

    return {
      totalSpend,
      topCats: top.map(([name, amount], i) => ({
        name,
        amount,
        percent: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
        color: colors[i] || '#64748b'
      }))
    };
  }, [transactions]);

  const filterLabels: Record<string, string> = {
    TODAY: lang === 'id' ? 'Hari Ini' : 'Today',
    WEEKLY: lang === 'id' ? '7 Hari' : '7 Days',
    MONTHLY: lang === 'id' ? '30 Hari' : '30 Days'
  };

  return (
    <div className="w-full font-sans pb-24 bg-[var(--bg-deep)] min-h-screen text-[var(--text-primary)] transition-colors duration-300">

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 pt-[calc(1rem+env(safe-area-inset-top))] pb-4 px-5 flex items-center justify-between bg-[var(--bg-deep)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] transition-colors duration-300">
        <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setActiveTab('profile')}>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--border-subtle)]">
            <img
              src={profile?.avatar_url || "https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png"}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[12px] font-medium text-[var(--text-muted)] mb-0.5 leading-none">{greeting},</p>
            <h2 className="text-[15px] font-bold tracking-tight text-[var(--text-primary)] leading-none">{userName.split(' ')[0]}</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onSearch} className="w-9 h-9 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95 transition-all border border-[var(--border-subtle)]">
            <i className="fa-solid fa-magnifying-glass text-[13px]" />
          </button>
          <button onClick={onShowNotifications} className="w-9 h-9 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-secondary)] relative active:scale-95 transition-all border border-[var(--border-subtle)]">
            <i className="fa-regular fa-bell text-[14px]" />
            {hasUnreadNotifications && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-[1.5px] border-[var(--bg-deep)]" />}
          </button>
        </div>
      </header>

      <main className="px-5 space-y-7">

        {/* ─── BALANCE CARD ─── */}
        <section className="relative w-full rounded-[28px] p-6 overflow-hidden bg-gradient-to-br from-[#0A1F16] via-[#121212] to-[#050505] border border-emerald-500/20 shadow-[0_15px_40px_-15px_rgba(16,185,129,0.25)]">
          {/* Faint radial glow instead of blurry blob */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/4" />

          <div className="relative z-10 flex flex-col h-full">
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold text-white/70">Total Balance</p>
                <button onClick={() => setHideBalance(!hideBalance)} className="active:scale-90 transition-transform">
                  <i className={`fa-solid ${hideBalance ? 'fa-eye-slash' : 'fa-eye'} text-white/40 hover:text-white/70 text-[11px]`} />
                </button>
              </div>
              <button className="w-9 h-9 rounded-[14px] bg-white/5 border border-white/5 flex items-center justify-center active:scale-95 transition-all shadow-inner">
                <i className="fa-solid fa-chart-simple text-emerald-500 text-[13px]" />
              </button>
            </div>

            <div className="mb-6">
              <h1 className="text-[38px] font-bold tracking-tight leading-none text-white flex items-baseline gap-1.5">
                <span className="text-[18px] font-bold text-white/40">Rp</span>
                {hideBalance ? '••••••••' : formatIDR(totals.balance)}
              </h1>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-emerald-500/20 via-white/5 to-transparent mb-5" />

            <div className="flex items-center">
              {/* Income */}
              <div className="flex-1 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0A2E1F] flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-arrow-down text-emerald-500 text-[11px]" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">Income</span>
                  <p className="text-[15px] font-bold tabular-nums text-white leading-none">
                    <span className="text-white/40 text-[11px] font-bold mr-1">Rp</span>
                    {formatIDR(metrics.inc)}
                  </p>
                  <span className={`text-[10px] font-bold mt-1.5 flex items-center gap-0.5 ${metrics.incPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <i className={`fa-solid ${metrics.incPct >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`} />
                    {Math.abs(metrics.incPct).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-white/5 mx-2" />

              {/* Expense */}
              <div className="flex-1 flex items-center gap-3 pl-2">
                <div className="w-9 h-9 rounded-full bg-[#3F1D24] flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-arrow-up text-rose-500 text-[11px]" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block mb-1">Expense</span>
                  <p className="text-[15px] font-bold tabular-nums text-white leading-none">
                    <span className="text-white/40 text-[11px] font-bold mr-1">Rp</span>
                    {formatIDR(metrics.exp)}
                  </p>
                  <span className={`text-[10px] font-bold mt-1.5 flex items-center gap-0.5 ${metrics.expPct <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <i className={`fa-solid ${metrics.expPct <= 0 ? 'fa-arrow-down' : 'fa-arrow-up'}`} />
                    {Math.abs(metrics.expPct).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Period toggle */}
        <div className="flex items-center justify-center mt-2">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[20px] p-1 flex items-center w-max shadow-sm">
            <button onClick={() => setSummaryFilter('TODAY')} className={`px-6 py-2.5 rounded-[16px] text-[12px] font-bold transition-all duration-300 ${summaryFilter === 'TODAY' ? 'bg-[#10b981] text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Today</button>
            <button onClick={() => setSummaryFilter('WEEKLY')} className={`px-6 py-2.5 rounded-[16px] text-[12px] font-bold transition-all duration-300 ${summaryFilter === 'WEEKLY' ? 'bg-[#10b981] text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>7 Days</button>
            <button onClick={() => setSummaryFilter('MONTHLY')} className={`px-6 py-2.5 rounded-[16px] text-[12px] font-bold transition-all duration-300 ${summaryFilter === 'MONTHLY' ? 'bg-[#10b981] text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>30 Days</button>
          </div>
        </div>

        {/* ─── QUICK ACTIONS ─── */}
        <section className="flex gap-3 overflow-x-auto no-scrollbar snap-x pb-2 mt-4">
          {[
            { label: 'Log', icon: 'fa-plus', action: 'Log', isPrimary: true },
            { label: 'Transfer', icon: 'fa-right-left', action: 'Send Money', isPrimary: false },
            { label: 'Top Up', icon: 'fa-wallet', action: 'Top Up', isPrimary: false },
            { label: 'Loan', icon: 'fa-hand-holding-dollar', action: 'Loan', isPrimary: false },
            { label: 'AI', icon: 'fa-robot', action: 'AI Agent', isPrimary: false }
          ].map((btn, idx) => (
            <button 
              key={idx}
              onClick={() => {
                if (btn.action === 'Log') onQuickAction('Log');
                else if (btn.action === 'Top Up') onTopup(wallets[0]?.id || '');
                else if (btn.action === 'Send Money') onQuickAction('Transfer');
                else if (btn.action === 'Loan') setActiveTab('debt');
                else if (btn.action === 'AI Agent') document.dispatchEvent(new CustomEvent('open-ai-chat'));
              }}
              className={`min-w-[76px] aspect-square rounded-[20px] flex flex-col items-center justify-center gap-2 transition-all active:scale-95 snap-center shrink-0 ${btn.isPrimary ? 'bg-[#10b981] border border-emerald-500/30 shadow-[0_8px_20px_rgba(16,185,129,0.3)]' : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-inner)]'}`}
            >
              <i className={`fa-solid ${btn.icon} text-[16px] ${btn.isPrimary ? 'text-white' : 'text-[var(--text-secondary)]'}`} />
              <span className={`text-[11px] font-bold ${btn.isPrimary ? 'text-white' : 'text-[var(--text-primary)]'}`}>{btn.label}</span>
            </button>
          ))}
        </section>

        {/* ─── SPENDING OVERVIEW ─── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-tight">This Month's Spending</h3>
            <button onClick={() => setActiveTab('stats')} className="text-[13px] font-medium text-emerald-500 flex items-center gap-1 active:opacity-70">
              View Details <i className="fa-solid fa-chevron-right text-[10px]" />
            </button>
          </div>

          <div className="bg-[var(--bg-card)] rounded-[24px] p-5 border border-[var(--border-subtle)] shadow-sm">
            <div className="flex flex-col mb-4">
              <p className="text-[12px] font-medium text-[var(--text-muted)] mb-1">Total Spending</p>
              <p className="text-[28px] font-semibold tabular-nums text-[var(--text-primary)] leading-none tracking-tight mb-2">
                <span className="text-[18px] mr-1 font-medium text-[var(--text-secondary)]">Rp</span>{formatIDR(categoryStats.totalSpend)}
              </p>
              {true && (
                <div className="flex items-center gap-1.5">
                  <span className={`text-[13px] font-semibold ${metrics.expPct > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    <i className={`fa-solid ${metrics.expPct > 0 ? 'fa-arrow-up' : 'fa-arrow-down'} text-[11px] mr-0.5`} />
                    {Math.abs(metrics.expPct).toFixed(0)}%
                  </span>
                  <span className="text-[13px] text-[var(--text-muted)]">vs last month</span>
                </div>
              )}
            </div>

            {/* Layout: Donut Chart on Left/Center, Legend on Right */}
            <div className="flex items-center justify-between mb-6">
              {/* Donut Chart */}
              <div className="relative w-[130px] h-[130px] shrink-0">
                {categoryStats.topCats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStats.topCats}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        stroke="none"
                        paddingAngle={2}
                        dataKey="amount"
                      >
                        {categoryStats.topCats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full rounded-full border-[8px] border-[var(--border-subtle)]" />
                )}
                {/* Inner Icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-inner)] flex items-center justify-center shadow-inner border border-[var(--border-subtle)]">
                    <i className="fa-solid fa-wallet text-[var(--text-muted)] text-[14px]" />
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 pl-4 space-y-3">
                {categoryStats.topCats.slice(0, 4).map((cat) => (
                  <div key={cat.name} className="flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: cat.color }} />
                        <span className="text-[13px] font-medium text-[var(--text-primary)] capitalize">{cat.name}</span>
                      </div>
                      <span className="text-[12px] font-medium text-[var(--text-muted)]">{cat.percent.toFixed(0)}%</span>
                    </div>
                    <span className="text-[12px] font-medium tabular-nums text-[var(--text-secondary)] ml-4.5 pl-4">Rp {formatIDR(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

             {/* Insight Box */}
            <div className="bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-2xl p-3 flex items-center gap-3">
               <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${metrics.expPct <= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                  <i className={`fa-solid ${metrics.expPct <= 0 ? 'fa-arrow-trend-down text-emerald-500' : 'fa-arrow-trend-up text-rose-500'} text-[12px]`} />
               </div>
               <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[12px] font-semibold text-[var(--text-primary)]">Insight</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                    Pengeluaran Anda {metrics.expPct <= 0 ? 'turun' : 'naik'} {Math.abs(metrics.expPct).toFixed(0)}% dibandingkan bulan lalu.
                  </p>
               </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
});

export default DashboardMobile;
