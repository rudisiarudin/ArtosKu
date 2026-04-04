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

  const chartData = useMemo(() => {
    const startDate = getTimeRangeStartDate(timeRange);
    const filtered = transactions.filter(t => {
      const isCorrectType = activeTab === 'expenses' 
        ? (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE)
        : (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT);
      const inRange = !startDate || new Date(t.date) >= startDate;
      return isCorrectType && inRange;
    });

    const total = filtered.reduce((sum, t) => sum + Number(t.amount), 0);

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

    return { total, topCat, areaData, sortedCats };
  }, [transactions, activeTab, timeRange]);

  return (
    <div className="w-full font-sans pt-6 relative px-4">
      
      {/* TOP TOGGLE */}
      <div className="bg-zinc-900/50 p-1.5 rounded-[16px] inline-flex mb-6 border border-zinc-800">
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`px-6 py-2 rounded-[12px] text-[13px] font-bold transition-all ${activeTab === 'expenses' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500'}`}
        >
          Expenses
        </button>
        <button 
          onClick={() => setActiveTab('income')}
          className={`px-6 py-2 rounded-[12px] text-[13px] font-bold transition-all ${activeTab === 'income' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500'}`}
        >
          Income
        </button>
      </div>

      {/* TOTAL VALUE */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
          Total {activeTab}
        </p>
        <h1 className="text-[32px] font-bold tracking-tight leading-none">
          <span className="text-[12px] text-zinc-600 font-medium mr-2 tracking-normal">IDR</span>
          {formatIDR(chartData.total)}
        </h1>
      </div>

      {/* THREE PILLS */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-[10px] font-bold text-zinc-300 tracking-wide">97% lower vs last mo</span>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
          <span className="text-[10px]">🔥</span>
          <span className="text-[10px] font-bold text-zinc-300 tracking-wide">Top: {chartData.topCat}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
          <span className="text-[10px]">🗓</span>
          <span className="text-[10px] font-bold text-zinc-300 tracking-wide">Avg: {formatIDR(chartData.total / 30)}</span>
        </div>
      </div>

      {/* CHART */}
      <div className="h-[240px] w-full mb-2 -mx-4 px-4 relative">
        {chartData.areaData.length > 0 && (
          <p className="absolute right-4 bottom-8 text-[10px] text-zinc-600 font-mono text-right z-10 pointer-events-none">
            {formatIDR(chartData.total)}
          </p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData.areaData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={activeTab === 'expenses' ? "#ef4444" : "#10b981"} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={activeTab === 'expenses' ? "#ef4444" : "#10b981"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fill: '#52525b', fontWeight: 600 }}
              dy={10}
              minTickGap={30}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
              itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ color: '#a1a1aa', fontSize: '10px', marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={activeTab === 'expenses' ? "#ef4444" : "#10b981"} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* TIME RANGE SELECTOR */}
      <div className="flex items-center justify-between mb-8 px-1">
        {['1D', '1W', '1M', '3M', 'YTD', '1Y'].map(range => (
          <button 
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1.5 rounded-[8px] text-[11px] font-bold transition-all ${
              timeRange === range ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-500'
            }`}
          >
            {range}
          </button>
        ))}
        <button className="text-emerald-500 ml-1">
          <i className="fa-solid fa-chart-line"></i>
        </button>
      </div>

      {/* CATEGORIES LIST */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Categories</h3>
          <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">Sort By Amount</p>
        </div>

        <div className="space-y-3">
          {chartData.sortedCats.map(([cat, amount]) => (
            <div key={cat} className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800/80 rounded-[16px]">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-[10px] bg-zinc-800/80 flex items-center justify-center text-zinc-500">
                  <i className="fa-solid fa-tag text-[11px]"></i>
                </div>
                <h3 className="text-[12px] font-black tracking-widest uppercase">{cat}</h3>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-bold mb-1">
                  <span className="text-[10px] text-zinc-500 mr-1.5">IDR</span>
                  {formatIDR(amount)}
                </p>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">SET</p>
              </div>
            </div>
          ))}
          {chartData.sortedCats.length === 0 && (
            <div className="py-10 text-center text-zinc-600 font-medium text-[12px]">
              No data for this period
            </div>
          )}
        </div>
      </div>

    </div>
  );
});

export default StatsMobile;
