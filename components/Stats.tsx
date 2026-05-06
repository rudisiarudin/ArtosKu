import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, Wallet, Category, Budget } from '../types';
import { getLocalIsoDate } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import StatsMobile from './StatsMobile';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

interface StatsProps {
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  onUpdateBudget: (budgets: Budget[]) => void;
  theme: 'light' | 'dark';
  initialCategoryFocus?: Category;
  onFocusReset?: () => void;
}

const Stats: React.FC<StatsProps> = React.memo(({ transactions, wallets, budgets, onUpdateBudget, theme, initialCategoryFocus, onFocusReset }) => {
  const [timeRange, setTimeRange] = useState('1M');
  const { lang, t } = useLanguage();

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0
    }).format(val);
  };

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

  // --- CORE DATA CALCULATIONS ---
  const statsData = useMemo(() => {
    const now = new Date();
    const startDate = getTimeRangeStartDate(timeRange);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const filtered = transactions.filter(t_item => {
      const isExpense = t_item.type === TransactionType.EXPENSE || t_item.type === TransactionType.RECEIVABLE;
      const inRange = !startDate || new Date(t_item.date) >= startDate;
      return isExpense && inRange;
    });

    const totalSpent = filtered.reduce((sum, t_item) => sum + Number(t_item.amount), 0);
    
    // Avg Monthly logic
    const monthlyTotals: Record<string, number> = {};
    transactions
      .filter(t_item => t_item.type === TransactionType.EXPENSE)
      .forEach(t_item => {
        const key = `${new Date(t_item.date).getFullYear()}-${new Date(t_item.date).getMonth()}`;
        monthlyTotals[key] = (monthlyTotals[key] || 0) + Number(t_item.amount);
      });
    const months = Object.values(monthlyTotals);
    const avgMonthly = months.length > 0 ? months.reduce((a, b) => a + b, 0) / months.length : 0;

    // Highest Category
    const catTotals: Record<string, number> = {};
    filtered.forEach(t_item => {
      catTotals[t_item.category] = (catTotals[t_item.category] || 0) + Number(t_item.amount);
    });
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

    // Savings Rate
    const totalIncome = transactions
      .filter(t_item => (t_item.type === TransactionType.INCOME || t_item.type === TransactionType.DEBT) && (!startDate || new Date(t_item.date) >= startDate))
      .reduce((sum, t_item) => sum + Number(t_item.amount), 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;

    // Charts Data
    const chartMap: Record<string, number> = {};
    [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(t_item => {
      const d = new Date(t_item.date);
      const key = getLocalIsoDate(d);
      chartMap[key] = (chartMap[key] || 0) + Number(t_item.amount);
    });

    let cumulative = 0;
    const areaChartData = Object.entries(chartMap).map(([date, val]) => {
      cumulative += val;
      return { 
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
        value: cumulative 
      };
    });

    // Donut Chart Data
    const CHAKRA_COLORS = ['#fbbf24', '#f87171', '#34d399', '#60a5fa', '#a78bfa', '#fbbf24', '#f472b6', '#38bdf8', '#fb7185', '#a3e635'];
    const pieData = sortedCats.map(([name, value], index) => ({
      name,
      value,
      color: CHAKRA_COLORS[index % CHAKRA_COLORS.length]
    }));

    return { totalSpent, avgMonthly, sortedCats, savingsRate, areaChartData, pieData };
  }, [transactions, timeRange]);

  // Merchant Leaderboards
  const merchantData = useMemo(() => {
    const merchantMap: Record<string, { count: number; total: number }> = {};
    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
      const desc = t.description.split(' ')[0].substring(0, 15); // crude merchant extraction
      if (!merchantMap[desc]) merchantMap[desc] = { count: 0, total: 0 };
      merchantMap[desc].count += 1;
      merchantMap[desc].total += Number(t.amount);
    });
    return Object.entries(merchantMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);
  }, [transactions]);


  return (
    <>
      <div className="block lg:hidden">
        <StatsMobile 
          transactions={transactions}
          wallets={wallets}
          budgets={budgets}
          formatIDR={formatIDR}
        />
      </div>
      <div className="hidden lg:block min-h-[calc(100vh-100px)]">
        {/* TIME RANGE SELECTOR */}
        <div className="bg-[var(--bg-inner)] p-1.5 rounded-2xl inline-flex mb-8 border border-[var(--border-subtle)]">
          {['1D', '1W', '1M', '3M', 'YTD', 'All'].map(range => (
            <button 
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-2 rounded-xl text-[13px] font-bold transition-all ${timeRange === range ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* METRIC CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="premium-glass p-6 rounded-[24px] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-wallet text-2xl text-rose-500"></i></div>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Total Spent</p>
            <h3 className="text-2xl font-black tracking-tight">Rp{formatIDR(statsData.totalSpent)}</h3>
            <p className="text-[12px] font-medium text-rose-500 mt-2"><i className="fa-solid fa-arrow-trend-up mr-1"></i> 12% vs last {timeRange}</p>
          </div>

          <div className="premium-glass p-6 rounded-[24px] border border-white/5 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-chart-line text-2xl text-amber-500"></i></div>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Avg. Monthly</p>
            <h3 className="text-2xl font-black tracking-tight">Rp{formatIDR(statsData.avgMonthly)}</h3>
            <p className="text-[12px] font-medium text-[var(--text-secondary)] mt-2">Historical average</p>
          </div>

          <div className="premium-glass p-6 rounded-[24px] border border-[var(--border-subtle)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-fire text-2xl text-orange-500"></i></div>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Highest Category</p>
            <h3 className="text-2xl font-black tracking-tight capitalize truncate w-3/4">{statsData.sortedCats[0]?.[0] || '-'}</h3>
            <p className="text-[12px] font-medium text-[var(--text-secondary)] mt-2">Rp{formatIDR(statsData.sortedCats[0]?.[1] || 0)}</p>
          </div>

          <div className="premium-glass p-6 rounded-[24px] border border-[var(--border-subtle)] relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-piggy-bank text-2xl text-emerald-500"></i></div>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Savings Rate</p>
            <h3 className="text-2xl font-black tracking-tight text-emerald-400">{statsData.savingsRate.toFixed(1)}%</h3>
            <p className="text-[12px] font-medium text-[var(--text-secondary)] mt-2">Of total income</p>
          </div>
        </div>

        {/* CHARTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Main Area Chart */}
          <div className="lg:col-span-2 premium-glass p-8 rounded-[24px] border border-white/5">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black tracking-tight">Cash Outflow Trend</h3>
                <p className="text-[12px] text-[var(--text-muted)]">Cumulative spending over {timeRange}</p>
              </div>
              <button className="w-10 h-10 rounded-xl bg-[var(--bg-inner)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors">
                <i className="fa-solid fa-download"></i>
              </button>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statsData.areaChartData}>
                  <defs>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(val) => `Rp${(val/1000000).toFixed(1)}M`}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    labelStyle={{ color: '#a1a1aa', marginBottom: '8px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorSpent)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart Breakdown */}
          <div className="premium-glass p-8 rounded-[24px] border border-white/5 flex flex-col">
            <h3 className="text-lg font-black tracking-tight mb-2">Category Breakdown</h3>
            <p className="text-[12px] text-[var(--text-muted)] mb-6">Distribution of expenses</p>
            
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statsData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {statsData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Total</span>
                <span className="text-xl font-black text-white">{statsData.sortedCats.length}</span>
                <span className="text-[10px] text-[var(--text-secondary)]">Categories</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="mt-6 space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {statsData.pieData.slice(0, 5).map((entry, index) => {
                const percentage = ((entry.value / statsData.totalSpent) * 100).toFixed(1);
                return (
                  <div key={index} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <p className="text-[13px] font-bold capitalize text-zinc-300 group-hover:text-white transition-colors">{entry.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-black">{percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>

        {/* BOTTOM METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top Merchants Leaderboard */}
          <div className="premium-glass p-8 rounded-[24px] border border-white/5">
            <h3 className="text-lg font-black tracking-tight mb-6">Top Merchants</h3>
            <div className="space-y-4">
              {merchantData.map(([merchant, data], index) => (
                <div key={merchant} className="flex items-center justify-between p-4 bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-[20px]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-rose-500">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white capitalize">{merchant}</p>
                      <p className="text-[11px] font-medium text-[var(--text-secondary)]">{data.count} transactions</p>
                    </div>
                  </div>
                  <p className="text-[14px] font-black tracking-tight text-white/90">Rp{formatIDR(data.total)}</p>
                </div>
              ))}
              {merchantData.length === 0 && (
                 <p className="text-center text-zinc-500 text-sm py-4">Not enough data to generate leaderboards.</p>
              )}
            </div>
          </div>

          {/* Budget Health Monitor */}
          <div className="premium-glass p-8 rounded-[24px] border border-white/5">
            <h3 className="text-lg font-black tracking-tight mb-6">Budget Health Score</h3>
            <div className="space-y-6">
               {budgets.slice(0, 4).map(b => {
                 const spent = [...transactions].filter(t => t.type === TransactionType.EXPENSE && t.category === b.category).reduce((sum, t) => sum + Number(t.amount), 0);
                 const progress = Math.min((spent / Number(b.amount)) * 100, 100);
                 const isDanger = progress > 90;
                 const isWarning = progress > 75 && !isDanger;
                 
                 return (
                   <div key={b.id}>
                     <div className="flex justify-between items-center mb-2">
                       <div className="flex items-center gap-2">
                         <span className="text-[13px] font-bold capitalize">{b.category}</span>
                         {isDanger && <span className="bg-rose-500/20 text-rose-500 text-[9px] font-bold px-2 py-0.5 rounded-full">CRITICAL</span>}
                       </div>
                       <p className="text-[12px] font-black tabular-nums">{progress.toFixed(0)}%</p>
                     </div>
                     <div className="h-2 w-full bg-[var(--bg-inner)] rounded-full overflow-hidden">
                       <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${progress}%` }}
                       />
                     </div>
                   </div>
                 );
               })}
               {budgets.length === 0 && (
                 <div className="text-center py-8">
                   <i className="fa-solid fa-bullseye text-3xl text-zinc-700 mb-3"></i>
                   <p className="text-sm font-medium text-zinc-500">No active budgets. Set them up to monitor health.</p>
                 </div>
               )}
            </div>
          </div>

        </div>

      </div>
    </>
  );
});

export default Stats;
