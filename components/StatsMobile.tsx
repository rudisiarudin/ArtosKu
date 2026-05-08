import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, Wallet, Budget } from '../types';
import { getLocalIsoDate } from '../lib/utils';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface StatsViewProps {
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  formatIDR: (val: number) => string;
}

const StatsMobile: React.FC<StatsViewProps> = React.memo(({
  transactions, formatIDR
}) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
  const [timeRange, setTimeRange] = useState('1M');

  const getTimeRangeStartDate = (range: string) => {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    switch (range) {
      case '1D': return start;
      case '1W': start.setDate(now.getDate() - 7); return start;
      case '1M': start.setMonth(now.getMonth() - 1); return start;
      case '3M': start.setMonth(now.getMonth() - 3); return start;
      case 'YTD': start.setFullYear(now.getFullYear(), 0, 1); return start;
      case '1Y': start.setFullYear(now.getFullYear() - 1); return start;
      default: return null;
    }
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

  const stats = useMemo(() => {
    const now = new Date();
    const startDate = getTimeRangeStartDate(timeRange);
    
    // Previous period for comparison
    const prevStartDate = new Date(startDate || now);
    if (timeRange === '1M') prevStartDate.setMonth(prevStartDate.getMonth() - 1);
    else if (timeRange === '1W') prevStartDate.setDate(prevStartDate.getDate() - 7);
    else if (timeRange === '1D') prevStartDate.setDate(prevStartDate.getDate() - 1);
    else prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);

    const filtered = transactions.filter(t => {
      const isCorrectType = activeTab === 'expenses' 
        ? (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE)
        : (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT);
      const inRange = !startDate || new Date(t.date) >= startDate;
      return isCorrectType && inRange;
    });

    const prevFiltered = transactions.filter(t => {
      const isCorrectType = activeTab === 'expenses' 
        ? (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE)
        : (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT);
      const d = new Date(t.date);
      return isCorrectType && d >= prevStartDate && (!startDate || d < startDate);
    });

    const total = filtered.reduce((sum, t) => sum + Number(t.amount), 0);
    const prevTotal = prevFiltered.reduce((sum, t) => sum + Number(t.amount), 0);
    
    const trendPct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    const catTotals: Record<string, number> = {};
    filtered.forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
    });
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const topCat = sortedCats.length > 0 ? sortedCats[0][0] : '-';

    const chartMap: Record<string, number> = {};
    [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(t => {
      const d = new Date(t.date);
      const key = getLocalIsoDate(d);
      chartMap[key] = (chartMap[key] || 0) + Number(t.amount);
    });

    let cumulative = 0;
    const areaData = Object.entries(chartMap).map(([date, val]) => {
      cumulative += val;
      return { 
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
        value: cumulative 
      };
    });

    const daysCount = timeRange === '1M' ? 30 : timeRange === '1W' ? 7 : 1;
    const dailyAvg = total / daysCount;

    return { total, topCat, areaData, sortedCats, trendPct, dailyAvg };
  }, [transactions, activeTab, timeRange]);

  return (
    <div className="w-full font-sans relative bg-background">
      
      {/* ─── STICKY ELITE HEADER ─── */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-5 pt-[calc(1.5rem+env(safe-area-inset-top,24px))] pb-4">
        <div className="bg-zinc-950 p-1 rounded-xl flex border border-white/5 shadow-inner">
          <button 
            onClick={() => { setActiveTab('expenses'); if (window.navigator.vibrate) window.navigator.vibrate(2); }}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'expenses' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600'}`}
          >
            Expenses
          </button>
          <button 
            onClick={() => { setActiveTab('income'); if (window.navigator.vibrate) window.navigator.vibrate(2); }}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'income' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600'}`}
          >
            Income
          </button>
        </div>
      </div>

      <div className="px-5 pt-6 pb-24 space-y-8">
        {/* ─── PRIMARY METRIC ─── */}
        <div className="relative">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1.5 ml-0.5">
            {activeTab} Overview
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] font-bold text-zinc-800 uppercase">IDR</span>
            <h1 className="text-[34px] font-black tracking-tight leading-none tabular-nums text-white">
              {formatIDR(stats.total)}
            </h1>
          </div>
          
          {/* DYNAMIC PILLS */}
          <div className="flex items-center gap-2.5 mt-5 overflow-x-auto no-scrollbar pb-1">
            <div className={`flex items-center gap-2 bg-zinc-900/50 border border-white/5 px-2.5 py-1.5 rounded-lg whitespace-nowrap`}>
              <div className={`w-1 rounded-full aspect-square ${stats.trendPct <= 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[9px] font-bold text-zinc-400 tracking-wide uppercase">
                {Math.abs(stats.trendPct).toFixed(1)}% {stats.trendPct <= 0 ? 'Lower' : 'Higher'}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-white/5 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
              <span className="text-[10px] opacity-70">🔥</span>
              <span className="text-[9px] font-bold text-zinc-400 tracking-wide uppercase">Top: {stats.topCat}</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-white/5 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
              <span className="text-[10px] opacity-70">📊</span>
              <span className="text-[9px] font-bold text-zinc-400 tracking-wide uppercase">Avg: {formatIDR(stats.dailyAvg)}</span>
            </div>
          </div>
        </div>

        {/* ─── ELITE TREND CHART ─── */}
        <div className="relative">
          <div className="h-[180px] w-full -mx-2 group">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.areaData}>
                <defs>
                  <linearGradient id="colorReport" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeTab === 'expenses' ? "#f43f5e" : "#10b981"} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={activeTab === 'expenses' ? "#f43f5e" : "#10b981"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 8, fill: '#3f3f46', fontWeight: 800 }}
                  dy={8}
                  minTickGap={40}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                  labelStyle={{ color: '#52525b', fontSize: '8px', fontWeight: 'bold', marginBottom: '2px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={activeTab === 'expenses' ? "#f43f5e" : "#10b981"} 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorReport)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* TIME RANGE SELECTOR */}
          <div className="flex items-center justify-between mt-6 bg-zinc-950/50 p-1 rounded-xl border border-white/5">
            {['1D', '1W', '1M', '3M', 'YTD', '1Y'].map(range => (
              <button 
                key={range}
                onClick={() => { setTimeRange(range); if (window.navigator.vibrate) window.navigator.vibrate(2); }}
                className={`flex-1 py-1.5 rounded-lg text-[8px] font-black transition-all uppercase tracking-widest ${
                  timeRange === range ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-600'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* ─── CATEGORY INTELLIGENCE ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Sector Distribution</h3>
            <div className="size-1 rounded-full bg-zinc-800" />
          </div>

          <div className="space-y-2.5">
            {stats.sortedCats.map(([cat, amount]) => {
              const percentage = stats.total > 0 ? (amount / stats.total) * 100 : 0;
              return (
                <div key={cat} className="group">
                  <div className="flex items-center justify-between p-3.5 bg-zinc-900/40 border border-white/5 rounded-[20px] active:bg-zinc-900/60 transition-all">
                    <div className="flex items-center gap-3.5">
                      <div className="size-10 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-500 shadow-inner group-active:text-emerald-500 transition-colors">
                        <i className={`fa-solid ${getCategoryIcon(cat)} text-[12px]`}></i>
                      </div>
                      <div>
                        <h3 className="text-[12px] font-bold text-white tracking-tight">{cat}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="h-0.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${activeTab === 'expenses' ? 'bg-rose-500/50' : 'bg-emerald-500/50'} rounded-full`} 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-black text-zinc-600 tracking-widest">{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-black text-white tabular-nums tracking-tight">
                        {formatIDR(amount)}
                      </p>
                      <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Share</p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {stats.sortedCats.length === 0 && (
              <div className="py-16 text-center space-y-3">
                <div className="size-12 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto border border-dashed border-white/10">
                  <i className="fa-solid fa-ghost text-zinc-800"></i>
                </div>
                <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.4em]">Empty Set</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});


export default StatsMobile;
