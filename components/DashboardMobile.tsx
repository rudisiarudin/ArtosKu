import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Transaction, TransactionType, Wallet, UserProfile } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Bell, Settings, User, Eye, EyeOff, Plus, Send, Landmark, Zap, Star, ChevronRight, TrendingUp, TrendingDown, Wallet as WalletIcon } from 'lucide-react';
import { WalletLogo } from './WalletLogo';
import { useCountUp } from '../hooks/useCountUp';

export interface DashboardViewProps {
  userName: string;
  profile: UserProfile | null;
  transactions: Transaction[];
  wallets: Wallet[];
  dreams: any[];
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
  userName, profile, transactions, wallets, dreams, totals, recentTransactions,
  onShowAll, onTopup, onQuickAction, setActiveTab, formatIDR, getCategoryIcon, onSearch, onShowNotifications, hasUnreadNotifications
}) => {
  const { t, lang } = useLanguage();
  const [summaryFilter, setSummaryFilter] = React.useState<'TODAY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [hideBalance, setHideBalance] = React.useState(false);
  
  const animatedBalance = useCountUp(totals.balance, 1500);

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
      <header className="px-5 pt-[calc(1.5rem+env(safe-area-inset-top,24px))] pb-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-40">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('profile')}>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-transparent">
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

      <main className="px-4 space-y-4 pt-3 pb-24">
        <section>
          <Card className="border-none bg-gradient-to-br from-card via-card to-muted/30 shadow-xl rounded-2xl overflow-hidden relative group">
            {/* ELITE MESH GLOWS */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
            
            {/* MONEY ICON WATERMARK */}
            <div className="absolute left-[-10%] top-[-10%] opacity-[0.03] pointer-events-none transform rotate-[15deg]">
              <WalletIcon className="w-48 h-48 text-foreground" />
            </div>
            
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Total Saldo Bersih</span>
                <Badge variant="outline" className="text-[8px] font-semibold px-2 py-0.5 h-auto text-muted-foreground rounded-full" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  REALTIME
                </Badge>
              </div>

              <div className="flex items-baseline gap-1.5 mb-4 mt-1">
                <span className="text-[13px] font-semibold text-muted-foreground">IDR</span>
                <h1 className="text-[26px] font-bold tabular-nums text-foreground tracking-tight">
                  {hideBalance ? '••••••••' : formatIDR(animatedBalance)}
                </h1>
                <Button variant="ghost" size="icon" onClick={() => setHideBalance(!hideBalance)} className="h-5 w-5 text-muted-foreground ml-1.5 hover:bg-transparent">
                  {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <div className="space-y-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.15em] opacity-50">
                    {summaryFilter === 'TODAY' ? 'Daily' : summaryFilter === 'WEEKLY' ? 'Weekly' : 'Monthly'} Inflow
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-foreground tabular-nums tracking-tighter">
                      {formatIDR(metrics.inc)}
                    </span>
                    <div className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold tracking-tight bg-[#EF4444]/20 text-[#EF4444]`}>
                      {metrics.incPct >= 0 ? '+' : '-'}{Math.abs(metrics.incPct).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.15em] opacity-50">
                    {summaryFilter === 'TODAY' ? 'Daily' : summaryFilter === 'WEEKLY' ? 'Weekly' : 'Monthly'} Outflow
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-foreground tabular-nums tracking-tighter">
                      {formatIDR(metrics.exp)}
                    </span>
                    <div className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold tracking-tight bg-[#10B981]/20 text-[#10B981]`}>
                      {metrics.expPct >= 0 ? '+' : '-'}{Math.abs(metrics.expPct).toFixed(1)}%
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
                    className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all h-auto ${
                      summaryFilter === period.id 
                        ? 'bg-transparent text-foreground border-foreground' 
                        : 'bg-transparent border-transparent text-muted-foreground opacity-50'
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
        <section className="grid grid-cols-5 gap-2.5">
          {[
            { label: 'Log', icon: Plus, action: 'Log' },
            { label: 'Send', icon: Send, action: 'Transfer' },
            { label: 'Cicilan', icon: Landmark, action: 'Loan' },
            { label: t('nav.stocks'), icon: TrendingUp, action: 'Stocks' },
            { label: 'Dreams', icon: Star, action: 'Dreams' }
          ].map((btn, idx) => (
            <button 
              key={idx}
              onClick={() => {
                if (btn.action === 'Log') onQuickAction('Log');
                else if (btn.action === 'Transfer') onQuickAction('Transfer');
                else if (btn.action === 'Loan') onQuickAction('Loan');
                else if (btn.action === 'Dreams') setActiveTab('dreams');
                else if (btn.action === 'Stocks') setActiveTab('stocks');
              }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-full aspect-square rounded-full bg-card/10 backdrop-blur-md border shadow-[0_8px_16px_rgba(0,0,0,0.03)] flex items-center justify-center transition-all group-active:scale-95 group-hover:bg-primary/10" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <btn.icon className="w-[18px] h-[18px] text-foreground/70 group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center truncate w-full">{btn.label}</span>
            </button>
          ))}
        </section>

        {/* ─── DREAMS WIDGET ─── */}
        {dreams && dreams.length > 0 && (
          <section className="space-y-4">
            <div className="flex justify-between items-baseline px-1">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Target Tersimpan</h3>
              <button onClick={() => setActiveTab('dreams')} className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors uppercase tracking-wider flex items-center gap-1">
                DETAIL <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-card border border-border rounded-[24px] p-5 shadow-sm relative overflow-hidden group hover:border-transparent transition-colors cursor-pointer" onClick={() => setActiveTab('dreams')}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-transparent text-emerald-500 flex items-center justify-center shadow-inner">
                    <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-foreground">{dreams.length} Daftar Target Aktif</h4>
                  </div>
                </div>

                {(() => {
                  const totalTarget = dreams.reduce((sum, d) => sum + Number(d.target_amount), 0);
                  const totalCollected = Math.min(totals.balance, totalTarget);
                  const progress = totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 0;
                  
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Terkumpul</span>
                        <span className="text-lg font-black text-emerald-500 leading-none">{formatIDR(totalCollected)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden border border-transparent">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-bold tracking-wider">
                        <span className="text-muted-foreground uppercase">{progress.toFixed(1)}% Tercapai</span>
                        <span className="text-muted-foreground uppercase">Target: {formatIDR(totalTarget)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {/* ─── INSTITUTIONAL ASSETS ─── */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[14px] font-bold text-foreground tracking-tight">Portfolio Assets</h3>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setActiveTab('profile')}
              className="text-[10px] font-bold text-foreground uppercase tracking-wider h-auto p-0 hover:no-underline"
            >
              DETAILS
            </Button>
          </div>
          <div className="space-y-3">
            {frequentlyUsedWallets.slice(0, 3).map((w) => (
              <div key={w.id} className="flex items-center justify-between p-4 rounded-[24px] bg-card hover:bg-muted/50 transition-all group active:scale-[0.99] border border-border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                    <WalletLogo wallet={w} size={20} />
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
            <Button variant="link" size="sm" onClick={() => setActiveTab('transactions')} className="text-[10px] font-bold text-foreground uppercase tracking-wider h-auto p-0 hover:no-underline">
              HISTORY
            </Button>
          </div>

          <div className="space-y-1">
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3 px-2 border-b border-transparent last:border-0 hover:bg-muted/30 transition-colors rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${t.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'} border border-transparent`}>
                    <i className={`fa-solid ${CATEGORY_DATA[t.category]?.icon || 'fa-tag'}`} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-foreground leading-tight">{t.description || t.category}</h4>
                    <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">
                      {new Date(t.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()} • {wallets.find(w => w.id === t.walletId)?.name?.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end justify-center">
                  <p className={`text-[13px] font-bold tabular-nums tracking-tight ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-foreground'}`}>
                    {t.type === TransactionType.INCOME ? '+ Rp ' : '- Rp '}{formatIDR(Number(t.amount))}
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
