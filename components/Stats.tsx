import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, Wallet, Category, Budget } from '../types';
import { getLocalIsoDate } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface StatsProps {
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  onUpdateBudget: (budgets: Budget[]) => void;
  theme: 'light' | 'dark';
}

const Stats: React.FC<StatsProps> = React.memo(({ transactions, wallets, budgets, onUpdateBudget, theme }) => {
  const [selectedTab, setSelectedTab] = useState<'expenses' | 'income'>('expenses');
  const [timeRange, setTimeRange] = useState('1M');
  const [filteredCategory, setFilteredCategory] = useState<Category | null>(null);
  const [showBudgetEditor, setShowBudgetEditor] = useState<Category | null>(null);
  const [editBudgetAmount, setEditBudgetAmount] = useState('');

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
      case '1D': return start; // Start of today
      case '1W': start.setDate(now.getDate() - 7); return start;
      case '1M': start.setMonth(now.getMonth() - 1); return start;
      case '3M': start.setMonth(now.getMonth() - 3); return start;
      case 'YTD': start.setFullYear(now.getFullYear(), 0, 1); return start;
      case '1Y': start.setFullYear(now.getFullYear() - 1); return start;
      default: return null;
    }
  };

  // 1. Chart Data Calculation
  const chartData = useMemo(() => {
    const startDate = getTimeRangeStartDate(timeRange);

    // Sort transactions ASCENDING
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (filteredCategory) {
      // If filtering by specific category, show the trend of THAT category's spending
      let cumulativeSpend = 0;
      const categoryData: any[] = [];

      sorted.forEach(t => {
        if (t.category !== filteredCategory) return;
        const tDate = new Date(t.date);
        if (startDate && tDate < startDate) return;

        cumulativeSpend += Number(t.amount);
        const dateKey = getLocalIsoDate(tDate);
        categoryData.push({
          date: tDate.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
          fullDate: tDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          value: cumulativeSpend,
          rawDate: dateKey
        });
      });

      if (categoryData.length === 0) {
        return [{ date: 'No Data', value: 0 }, { date: 'Today', value: 0 }];
      }
      return categoryData;
    }

    // Default: Asset Trend Chart
    let currentBalanceFromNow = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
    const balanceHistory: Record<string, number> = {};

    // Sort transactions DESCENDING (newest first) to backtrack balance
    const sortedDesc = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Set current balance as "Today"
    const todayKey = getLocalIsoDate(new Date());
    balanceHistory[todayKey] = currentBalanceFromNow;

    sortedDesc.forEach(t => {
      const dateKey = getLocalIsoDate(new Date(t.date));
      const amount = Number(t.amount);
      const isIncrease = t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;

      // To get the balance BEFORE this transaction, we un-apply it
      if (!balanceHistory[dateKey]) {
        balanceHistory[dateKey] = currentBalanceFromNow;
      }
      currentBalanceFromNow += (isIncrease ? -amount : amount);
    });

    const finalData = Object.entries(balanceHistory)
      .map(([date, value]) => ({
        date: new Date(date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
        fullDate: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        value,
        rawDate: date
      }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .filter(d => !startDate || new Date(d.rawDate) >= startDate);

    if (finalData.length === 0) {
      const current = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
      return [{ date: 'Start', value: current }, { date: 'Today', value: current }];
    }

    return finalData;
  }, [transactions, wallets, filteredCategory, timeRange]);

  // 2. Chart Color
  const chartColor = useMemo(() => {
    if (chartData.length < 2) return '#00d293';
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    return last >= first ? '#00d293' : '#FF5252';
  }, [chartData]);

  // 3. Stats by Category
  const statsData = useMemo(() => {
    const categories: Record<string, number> = {};
    const startDate = getTimeRangeStartDate(timeRange);

    const filtered = transactions.filter(t => {
      const matchesTab = selectedTab === 'expenses'
        ? (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE)
        : (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT);

      const inRange = !startDate || new Date(t.date) >= startDate;
      return matchesTab && inRange;
    });

    filtered.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
    });

    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);
    return { total, categories };
  }, [transactions, selectedTab, timeRange]);

  // 4. Smart Insights
  const insights = useMemo(() => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentMonthSum = transactions
      .filter(t => (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE) && new Date(t.date) >= currentMonthStart)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastMonthSum = transactions
      .filter(t => (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE) && new Date(t.date) >= lastMonthStart && new Date(t.date) <= lastMonthEnd)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const diffPercent = lastMonthSum > 0 ? ((currentMonthSum - lastMonthSum) / lastMonthSum) * 100 : 0;

    const sortedCats = Object.entries(statsData.categories).sort((a, b) => (b[1] as number) - (a[1] as number));
    const topCategory = sortedCats[0] ? (sortedCats[0][0] as Category) : null;

    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const last30DaysTx = transactions.filter(t => (t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE) && new Date(t.date) >= thirtyDaysAgo);
    const dailyAverage = last30DaysTx.reduce((sum, t) => sum + Number(t.amount), 0) / 30;

    return { diffPercent, topCategory, dailyAverage };
  }, [transactions, statsData.categories]);

  const getBudgetFor = (category: Category) => {
    return (budgets || []).find(b => b.category === category)?.amount || 0;
  };

  const handleUpdateBudgetClick = (e: React.MouseEvent, category: Category) => {
    e.stopPropagation();
    setShowBudgetEditor(category);
    setEditBudgetAmount(getBudgetFor(category).toString());
  };

  const saveBudget = () => {
    if (!showBudgetEditor) return;
    const amount = Number(editBudgetAmount);
    const newBudgets = [...(budgets || [])];
    const index = newBudgets.findIndex(b => b.category === showBudgetEditor);
    if (index >= 0) {
      newBudgets[index].amount = amount;
    } else {
      newBudgets.push({ category: showBudgetEditor, amount });
    }
    onUpdateBudget(newBudgets);
    setShowBudgetEditor(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white pb-32 animate-in fade-in duration-500">
      <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-12 pb-6 bg-black/80 backdrop-blur-xl border-b border-white/5 max-w-md mx-auto">
        <div className="flex bg-zinc-900 p-1 rounded-xl w-[220px] mb-8 border border-white/5 shadow-inner">
          {['Expenses', 'Income'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab.toLowerCase() as any)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${selectedTab === tab.toLowerCase() ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Total {selectedTab}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-bold text-zinc-500">IDR</span>
            <h1 className="text-[32px] font-bold tracking-tighter tabular-nums leading-none">{formatIDR(statsData.total)}</h1>
          </div>

          <div className="flex items-center gap-3 pt-3 overflow-x-auto no-scrollbar pb-1">
            <div className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-white/5 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${insights.diffPercent <= 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
              <span className="text-[10px] font-bold tracking-tight uppercase">
                {Math.abs(insights.diffPercent).toFixed(0)}% {insights.diffPercent <= 0 ? 'LOWER' : 'HIGHER'} VS LAST MO
              </span>
            </div>
            <div className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-white/5 flex items-center gap-2">
              <i className="fa-solid fa-fire-flame-curved text-amber-500 text-[10px]"></i>
              <span className="text-[10px] font-bold tracking-tight uppercase">TOP: {insights.topCategory || 'N/A'}</span>
            </div>
            <div className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-white/5 flex items-center gap-2">
              <i className="fa-solid fa-calendar-day text-emerald-500 text-[10px]"></i>
              <span className="text-[10px] font-bold tracking-tight uppercase">AVG: {formatIDR(insights.dailyAverage)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[200px]"></div>

      <section className="mt-4 mb-8">
        <div className="h-[260px] w-full px-2 relative">
          {filteredCategory && (
            <div className="absolute top-0 left-6 z-10 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full animate-in fade-in zoom-in duration-300">
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{filteredCategory}</span>
              <button onClick={() => setFilteredCategory(null)} className="w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center hover:scale-110 transition-transform">
                <i className="fa-solid fa-times text-[8px]"></i>
              </button>
            </div>
          )}

          <div className="absolute top-0 right-6 text-[10px] font-semibold text-zinc-700 pointer-events-none">
            {formatIDR(Math.max(...chartData.map(d => Number(d.value))))}
          </div>
          <div className="absolute bottom-10 right-6 text-[10px] font-semibold text-zinc-700 pointer-events-none">
            {formatIDR(Math.min(...chartData.map(d => Number(d.value))))}
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff03" />
              <XAxis
                dataKey="date"
                hide={chartData.length < 3}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#333', fontSize: 8, fontWeight: 'bold' }}
                padding={{ left: 10, right: 10 }}
                minTickGap={20}
              />
              <YAxis hide domain={['auto', 'auto']} padding={{ top: 40, bottom: 40 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', fontSize: '10px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: chartColor, fontWeight: 'bold' }}
                labelStyle={{ color: '#666', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                cursor={{ stroke: '#ffffff08', strokeWidth: 1 }}
                labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                formatter={(val: number) => [`IDR ${formatIDR(val)}`, filteredCategory ? 'SPENT' : 'BALANCE']}
              />
              <ReferenceLine y={chartData[0]?.value} stroke="#ffffff08" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorValue)"
                animationDuration={1500}
                activeDot={{ r: 4, strokeWidth: 0, fill: chartColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-between px-8 mt-2">
          {['1D', '1W', '1M', '3M', 'YTD', '1Y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`text-[10px] font-semibold px-2 py-1.5 rounded-md transition-all ${timeRange === range ? 'text-[#00d293] bg-[#00d293]/10' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {range}
            </button>
          ))}
          <button className="text-[#00d293] active:scale-90 transition-transform">
            <i className="fa-solid fa-chart-line text-[14px]"></i>
          </button>
        </div>
      </section>

      <section className="px-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500">Categories</h3>
          <button className="text-[9px] font-semibold text-zinc-700 uppercase tracking-widest hover:text-zinc-500">Sort by amount</button>
        </div>

        <div className="space-y-2.5">
          {Object.entries(statsData.categories).map(([name, spent], i) => {
            const budget = getBudgetFor(name as Category);
            const spentNum = spent as number;
            const percent = budget > 0 ? Math.min(100, (spentNum / budget) * 100) : 0;
            const isOverBudget = budget > 0 && spentNum > budget;
            const isNearBudget = budget > 0 && spentNum > budget * 0.8;
            const progressColor = isOverBudget ? 'bg-rose-500' : isNearBudget ? 'bg-amber-500' : 'bg-emerald-500';

            return (
              <div
                key={i}
                onClick={() => setFilteredCategory(name as Category)}
                className={`bg-zinc-900/40 border rounded-2xl px-4 py-3 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer ${filteredCategory === name ? 'border-emerald-500/50 bg-emerald-500/[0.03]' : 'border-white/5'}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-9 h-9 rounded-lg bg-zinc-800/50 flex items-center justify-center transition-colors shadow-inner ${filteredCategory === name ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-500 group-hover:text-emerald-500'}`}>
                    <i className="fa-solid fa-tag text-xs"></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1 items-center">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black text-white tracking-tight uppercase">{name}</span>
                        {budget > 0 && (
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${isOverBudget ? 'text-rose-500' : 'text-zinc-600'}`}>
                            {isOverBudget ? 'OVER' : `${percent.toFixed(0)}% LIMIT`}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black tabular-nums">IDR {formatIDR(spentNum)}</span>
                        <button
                          onClick={(e) => handleUpdateBudgetClick(e, name as Category)}
                          className="text-[9px] font-bold text-zinc-700 hover:text-emerald-500 transition-colors uppercase tracking-widest"
                        >
                          {budget > 0 ? <><i className="fa-solid fa-crosshairs mr-1"></i> {formatIDR(budget)}</> : 'SET'}
                        </button>
                      </div>
                    </div>
                    {budget > 0 && (
                      <div className="h-1 bg-zinc-800/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${progressColor} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.2)]`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {showBudgetEditor && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowBudgetEditor(null)}></div>
          <div className="bg-zinc-900 w-full max-w-[280px] p-5 rounded-[2rem] border border-white/5 relative z-10 animate-in zoom-in duration-300">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-5 px-1">{showBudgetEditor} Budget</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Monthly Limit (IDR)</p>
                <input
                  type="text"
                  placeholder="0"
                  className="w-full h-11 bg-black rounded-xl px-4 text-[14px] font-black text-white border border-white/5 focus:border-emerald-500/50 outline-none transition-all placeholder:text-zinc-800 tabular-nums"
                  value={editBudgetAmount ? Number(editBudgetAmount).toLocaleString('id-ID') : ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setEditBudgetAmount(val);
                  }}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowBudgetEditor(null)} className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">CANCEL</button>
                <button onClick={saveBudget} className="flex-1 h-10 bg-emerald-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_8px_20px_rgba(16,185,129,0.2)]">SAVE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Stats;
