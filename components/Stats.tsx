import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, Wallet } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface StatsProps {
  transactions: Transaction[];
  wallets: Wallet[];
  theme: 'light' | 'dark';
}

const Stats: React.FC<StatsProps> = React.memo(({ transactions, wallets, theme }) => {
  const [selectedTab, setSelectedTab] = useState<'expenses' | 'income' | 'budget'>('expenses');
  const [timeRange, setTimeRange] = useState('1M');

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0
    }).format(val);
  };

  // 1. Group transactions by date
  const chartData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Initial Asset (Total balance of all wallets at the very beginning)
    const initialAsset = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    // Group by day to handle multiple transactions same day
    const groupedByDay: Record<string, number> = {};

    sorted.forEach(t => {
      const dateKey = new Date(t.date).toISOString().split('T')[0];
      const amount = Number(t.amount);
      // INCOME & RECEIVABLE (Piutang) = uang masuk → increase balance
      // EXPENSE & DEBT (Hutang) = uang keluar → decrease balance
      const isIncrease = t.type === TransactionType.INCOME || t.type === TransactionType.RECEIVABLE;
      groupedByDay[dateKey] = (groupedByDay[dateKey] || 0) + (isIncrease ? amount : -amount);
    });

    const dates = Object.keys(groupedByDay).sort();
    let currentBalance = initialAsset;

    const finalData = dates.map(date => {
      currentBalance += groupedByDay[date];
      return {
        date: new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        value: currentBalance,
        rawDate: date
      };
    });

    // If no data, provide a flat line or sample
    if (finalData.length === 0) {
      return [
        { date: 'Start', value: initialAsset },
        { date: 'Today', value: initialAsset },
      ];
    }

    // Prepend the start point if we want to show the line starting from the initial asset
    const startPoint = {
      date: 'Start',
      value: initialAsset,
      rawDate: '0000-00-00'
    };

    return [startPoint, ...finalData];
  }, [transactions, wallets]);

  // 2. Determine chart color based on performance
  const chartColor = useMemo(() => {
    if (chartData.length < 2) return '#00d293';
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    return last >= first ? '#00d293' : '#FF5252';
  }, [chartData]);

  const statsData = useMemo(() => {
    const categories: Record<string, number> = {};
    const filtered = transactions.filter(t =>
      selectedTab === 'expenses' ? (t.type === TransactionType.EXPENSE || t.type === TransactionType.DEBT) :
        selectedTab === 'income' ? (t.type === TransactionType.INCOME || t.type === TransactionType.RECEIVABLE) : true
    );

    filtered.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
    });

    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);
    return { total, categories };
  }, [transactions, selectedTab]);

  const CATEGORY_BUDGETS: Record<string, number> = {
    'Makan': 0,
    'Transport': 0,
    'Shop': 0,
    'Tagihan': 0,
    'Hiburan': 0,
    'Loan': 0
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white pb-32 animate-in fade-in duration-500">
      <header className="px-6 pt-12 mb-4">
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
        </div>
      </header>

      {/* Stock-Style Chart Section */}
      <section className="mt-4 mb-8">
        <div className="h-[260px] w-full px-2 relative">
          {/* Baseline Value Indicator */}
          <div className="absolute top-0 right-6 text-[10px] font-semibold text-zinc-700 pointer-events-none">
            {formatIDR(Math.max(...chartData.map(d => d.value)))}
          </div>
          <div className="absolute bottom-10 right-6 text-[10px] font-semibold text-zinc-700 pointer-events-none">
            {formatIDR(Math.min(...chartData.map(d => d.value)))}
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '11px', fontWeight: '500' }}
                itemStyle={{ color: chartColor }}
                cursor={{ stroke: '#ffffff10', strokeWidth: 1 }}
                formatter={(val: number) => [`IDR ${formatIDR(val)}`, 'Balance']}
              />
              <ReferenceLine y={chartData[0]?.value} stroke="#ffffff15" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
                animationDuration={1000}
                activeDot={{ r: 4, strokeWidth: 0, fill: chartColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Time Range Selector */}
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

      {/* Categories Section */}
      <section className="px-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500">Categories</h3>
          <button className="text-[9px] font-semibold text-zinc-700 uppercase tracking-widest hover:text-zinc-500">Sort by amount</button>
        </div>

        <div className="space-y-2.5">
          {Object.entries(CATEGORY_BUDGETS).map(([name, budget], i) => {
            const spent = statsData.categories[name] || 0;
            const percent = Math.min(100, (spent / budget) * 100);
            return (
              <div key={i} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between group active:bg-zinc-900 transition-all">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center text-zinc-500 group-hover:text-[#00d293] transition-colors shadow-inner">
                    <i className="fa-solid fa-tag text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-white tracking-tight">{name}</span>
                      <span className="text-[11px] font-bold tabular-nums">IDR {formatIDR(spent)}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00d293] rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,210,147,0.15)]"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
});

export default Stats;
