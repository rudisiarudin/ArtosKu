import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Transaction, TransactionType, Wallet, UserProfile } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Bell, Settings, User, Eye, EyeOff, Plus, Send, Landmark, Zap, ChevronRight, TrendingUp, TrendingDown, Wallet as WalletIcon } from 'lucide-react';

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

const CATEGORY_DATA: Record<string, { icon: string; label: string }> = {
  'Makan': { icon: 'fa-utensils', label: 'Food' },
  'Transport': { icon: 'fa-car', label: 'Transport' },
  'Tagihan': { icon: 'fa-file-invoice-dollar', label: 'Bills' },
  'Hiburan': { icon: 'fa-gamepad', label: 'Play' },
  'Shop': { icon: 'fa-shopping-bag', label: 'Shop' },
  'Kesehatan': { icon: 'fa-heart-pulse', label: 'Health' },
  'Gaji': { icon: 'fa-money-bill-wave', label: 'Salary' },
  'Investasi': { icon: 'fa-chart-line', label: 'Invest' },
  'Hadiah': { icon: 'fa-gift', label: 'Gift' },
  'Bonus': { icon: 'fa-bolt', label: 'Bonus' },
  'Others': { icon: 'fa-receipt', label: 'Misc' }
};

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

  // Frequently used wallets
  const frequentlyUsedWallets = useMemo(() => {
    const usageCount: Record<string, number> = {};
    transactions.forEach(t => {
      usageCount[t.walletId] = (usageCount[t.walletId] || 0) + 1;
    });
    
    return [...wallets].sort((a, b) => (usageCount[b.id] || 0) - (usageCount[a.id] || 0));
  }, [wallets, transactions]);

  const filterLabels: Record<string, string> = {
    TODAY: lang === 'id' ? 'Hari Ini' : 'Today',
    WEEKLY: lang === 'id' ? '7 Hari' : '7 Days',
    MONTHLY: lang === 'id' ? '30 Hari' : '30 Days'
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return lang === 'id' ? 'Selamat Pagi' : 'Good Morning';
    if (hour < 15) return lang === 'id' ? 'Selamat Siang' : 'Good Afternoon';
    if (hour < 19) return lang === 'id' ? 'Selamat Sore' : 'Good Evening';
    return lang === 'id' ? 'Selamat Malam' : 'Good Night';
  };

  return (
    <div className="w-full font-sans pb-24 bg-background min-h-screen text-foreground transition-colors duration-300">

      {/* ─── INSTITUTIONAL HEADER ─── */}
      <header className="px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-40 border-b border-border/40">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('profile')}>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-foreground tracking-tight">{userName || 'Rudi Siarudin'}</h2>
            <p className="text-[10px] font-medium text-primary uppercase tracking-wider">{getGreeting()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onShowNotifications} className="w-9 h-9 rounded-lg relative">
            <Bell className="w-4 h-4 text-muted-foreground" />
            {hasUnreadNotifications && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setActiveTab('profile')} className="w-9 h-9 rounded-lg">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <main className="px-5 space-y-6 pt-6 pb-24">
        <section>
          <Card className="border-none bg-gradient-to-br from-card via-card to-muted/30 shadow-2xl rounded-[32px] overflow-hidden relative group">
            {/* ELITE MESH GLOWS */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
            
            {/* MONEY ICON WATERMARK */}
            <div className="absolute left-[-10%] top-[-10%] opacity-[0.03] pointer-events-none transform rotate-[15deg]">
              <WalletIcon className="w-64 h-64 text-foreground" />
            </div>
            
            <CardContent className="p-8 relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Net Worth Value</span>
                <Badge variant="outline" className="text-[9px] font-semibold px-2 py-0.5 h-auto border-border/50 text-muted-foreground rounded-full">
                  REALTIME
                </Badge>
              </div>

              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-[18px] font-medium text-muted-foreground">IDR</span>
                <h1 className="text-[36px] font-bold tabular-nums text-foreground tracking-tight">
                  {hideBalance ? '••••••••' : formatIDR(totals.balance)}
                </h1>
                <Button variant="ghost" size="icon" onClick={() => setHideBalance(!hideBalance)} className="h-6 w-6 text-muted-foreground ml-1">
                  {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-5 border-t border-border/40">
                <div className="space-y-2.5">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] opacity-50">
                    {summaryFilter === 'TODAY' ? 'Daily' : summaryFilter === 'WEEKLY' ? 'Weekly' : 'Monthly'} Inflow
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-foreground tabular-nums tracking-tighter">
                      {formatIDR(metrics.inc)}
                    </span>
                    <div className={`px-1.5 py-0.5 rounded-lg text-[8px] font-bold tracking-tight ${metrics.incPct >= 0 ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>
                      {metrics.incPct >= 0 ? '↑' : '↓'} {Math.abs(metrics.incPct).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] opacity-50">
                    {summaryFilter === 'TODAY' ? 'Daily' : summaryFilter === 'WEEKLY' ? 'Weekly' : 'Monthly'} Outflow
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-foreground tabular-nums tracking-tighter">
                      {formatIDR(metrics.exp)}
                    </span>
                    <div className={`px-1.5 py-0.5 rounded-lg text-[8px] font-bold tracking-tight ${metrics.expPct <= 0 ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>
                      {metrics.expPct > 0 ? '↑' : '↓'} {Math.abs(metrics.expPct).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* ULTRA-MINIMALIST TIME FILTER - MATCHES REALTIME BADGE STYLE */}
              <div className="mt-8 flex justify-end gap-1.5">
                {[
                  { id: 'TODAY', label: 'Today' },
                  { id: 'WEEKLY', label: '7D' },
                  { id: 'MONTHLY', label: '30D' }
                ].map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setSummaryFilter(period.id as any)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all h-auto ${
                      summaryFilter === period.id 
                        ? 'bg-foreground text-background border-foreground shadow-lg' 
                        : 'bg-transparent border-border/50 text-muted-foreground opacity-40 hover:opacity-100 hover:border-border'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* QUICK ACTIONS ─── CLEAN GRID */}
        <section className="grid grid-cols-4 gap-4">
          {[
            { label: 'Log', icon: Plus, action: 'Log' },
            { label: 'Send', icon: Send, action: 'Transfer' },
            { label: 'Loan', icon: Landmark, action: 'Loan' },
            { label: 'Agent', icon: Zap, action: 'AI Agent' }
          ].map((btn, idx) => (
            <button 
              key={idx}
              onClick={() => {
                if (btn.action === 'Log') onQuickAction('Log');
                else if (btn.action === 'Transfer') onQuickAction('Transfer');
                else if (btn.action === 'Loan') onQuickAction('Loan');
                else if (btn.action === 'AI Agent') document.dispatchEvent(new CustomEvent('open-ai-chat'));
              }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-full aspect-square rounded-2xl bg-card border border-border flex items-center justify-center transition-all group-active:scale-95 group-hover:bg-primary/10">
                <btn.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{btn.label}</span>
            </button>
          ))}
        </section>

        {/* ─── INSTITUTIONAL ASSETS ─── */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[14px] font-bold text-foreground tracking-tight">Portfolio Assets</h3>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setActiveTab('profile')}
              className="text-[10px] font-semibold text-primary uppercase tracking-wider h-auto p-0"
            >
              Details
            </Button>
          </div>
          <div className="space-y-3">
            {frequentlyUsedWallets.slice(0, 3).map((w) => (
              <div key={w.id} className="flex items-center justify-between p-4 rounded-[24px] bg-card hover:bg-muted/50 transition-all group active:scale-[0.99] border border-border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                    <i className={`fa-solid ${w.icon} text-sm`} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-foreground leading-tight">{w.name}</h4>
                    <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">{w.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold text-foreground tabular-nums tracking-tight">Rp {formatIDR(Number(w.balance))}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SPENDING OVERVIEW ─── */}
        {/* ─── CLEAN ACTIVITY FEED ─── */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[14px] font-bold text-foreground tracking-tight">Activity Feed</h3>
            <Button variant="link" size="sm" onClick={() => setActiveTab('transactions')} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-auto p-0">
              History
            </Button>
          </div>

          <div className="space-y-1">
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3 px-2 border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${t.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'} border border-border/50`}>
                    <i className={`fa-solid ${CATEGORY_DATA[t.category]?.icon || 'fa-tag'}`} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-foreground leading-tight">{t.description || t.category}</h4>
                    <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">
                      {new Date(t.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} • {wallets.find(w => w.id === t.walletId)?.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[13px] font-bold tabular-nums tracking-tight ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-foreground'}`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'} Rp {formatIDR(Number(t.amount))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
});

export default DashboardMobile;
