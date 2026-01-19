import React, { useState, useMemo } from 'react';
import { Wallet, WalletType, Transaction, TransactionType, Debt } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } from 'recharts';

interface WalletManagementProps {
  wallets: Wallet[];
  transactions: Transaction[];
  debts: Debt[];
  onAdd: (wallet: Wallet) => void;
  onDelete: (id: string) => void;
  theme: 'light' | 'dark';
  onTopup: (walletId: string) => void;
  onTransfer: () => void;
}

const WalletManagement: React.FC<WalletManagementProps> = React.memo(({ wallets, transactions, debts, onAdd, onDelete, theme, onTopup, onTransfer }) => {
  const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'ALLOCATION'>('PORTFOLIO');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [newWallet, setNewWallet] = useState<Partial<Wallet>>({
    type: WalletType.BANK,
    color: '#00d293'
  });

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0
    }).format(val);
  };

  // 1. Data Calculations
  const metrics = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME || t.type === TransactionType.DEBT)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE || t.type === TransactionType.RECEIVABLE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalCurrent = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
    const totalInitial = totalCurrent - totalIncome + totalExpense;

    // Net Worth Calculation: Total Assets - Unpaid Debts + Unpaid Receivables
    const unpaidDebt = (debts || [])
      .filter(d => !d.isPaid && d.type === TransactionType.DEBT)
      .reduce((sum, d) => sum + Number(d.amount), 0);
    const unpaidReceivable = (debts || [])
      .filter(d => !d.isPaid && d.type === TransactionType.RECEIVABLE)
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const trueNetWorth = totalCurrent - unpaidDebt + unpaidReceivable;

    const growth = totalCurrent - totalInitial;
    const growthPercent = totalInitial > 0 ? (growth / totalInitial) * 100 : 0;

    return { totalInitial, totalCurrent, trueNetWorth, unpaidReceivable, growth, growthPercent };
  }, [wallets, transactions, debts]);

  // 2. Chart Data Generation (Running Balance)
  const chartData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const currentTotalScale = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    // Calculate initial asset (backwards from current)
    const totalNetChange = transactions.reduce((net, t) => {
      const isIncrease = t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
      return net + (isIncrease ? Number(t.amount) : -Number(t.amount));
    }, 0);

    const initialAsset = currentTotalScale - totalNetChange;

    let currentBalance = initialAsset;
    const data = sorted.map(t => {
      const isIncrease = t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
      currentBalance += isIncrease ? Number(t.amount) : -Number(t.amount);
      const dateObj = new Date(t.date);
      return {
        date: dateObj.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
        fullDate: dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        value: currentBalance
      };
    });

    if (data.length === 0) return [{ date: 'Start', fullDate: 'Initial State', value: initialAsset }, { date: 'Today', fullDate: 'Current State', value: initialAsset }];
    return [{ date: 'Start', fullDate: 'Initial Balance', value: initialAsset }, ...data];
  }, [transactions, wallets]);

  // 3. Top Assets List Data
  const assetRanking = useMemo(() => {
    return wallets.map(w => {
      const walletTransactions = transactions.filter(t => t.walletId === w.id);

      // Backtrack baseline balance
      const netFlow = walletTransactions.reduce((sum, t) => {
        const isIncrease = t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
        return sum + (isIncrease ? Number(t.amount) : -Number(t.amount));
      }, 0);
      const initialBalance = Number(w.balance) - netFlow;

      // Identify capital injections vs yields
      const capitalNet = walletTransactions.reduce((sum, t) => {
        const isCapital = t.category === 'Topup' || t.category === 'Transfer' || t.category === 'Loan';
        const isIncrease = t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
        if (isCapital) return sum + (isIncrease ? Number(t.amount) : -Number(t.amount));
        return sum;
      }, 0);

      const totalBasis = initialBalance + capitalNet;
      const currentBalance = Number(w.balance);
      const profit = currentBalance - totalBasis;
      const growthPercent = totalBasis !== 0 ? (profit / totalBasis) * 100 : 0;

      const getWalletIcon = (type: WalletType) => {
        if (w.icon) return w.icon;
        switch (type) {
          case WalletType.BANK: return 'fa-building-columns';
          case WalletType.EWALLET: return 'fa-mobile-screen-button';
          case WalletType.CASH: return 'fa-money-bill-1';
          default: return 'fa-vault';
        }
      };

      return {
        ...w,
        currentBalance,
        topUps: profit, // We'll show the Profit/Loss in the 'TOP UP' column or rename it
        growthPercent,
        icon: getWalletIcon(w.type as WalletType),
        code: w.name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 4)
      };
    }).sort((a, b) => b.currentBalance - a.currentBalance);
  }, [wallets, transactions]);

  const allocationData = useMemo(() => {
    const types = [WalletType.BANK, WalletType.CASH, WalletType.EWALLET];
    return types.map(type => {
      const total = assetRanking.filter(a => a.type === type).reduce((sum, a) => sum + a.currentBalance, 0);
      return { type, total };
    }).filter(t => t.total > 0);
  }, [assetRanking]);

  return (
    <div className="flex flex-col min-h-screen bg-black text-white pb-32 animate-in fade-in duration-500">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-12 pb-4 bg-black/80 backdrop-blur-xl border-b border-white/5 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold tracking-tight">Performance</h2>
          <button
            onClick={onTransfer}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/5 text-[10px] font-black text-emerald-500 hover:bg-zinc-800 transition-colors uppercase tracking-widest shadow-lg"
          >
            <i className="fa-solid fa-right-left"></i> Transfer
          </button>
        </div>
        <div className="flex border-b border-white/5">
          {['PORTFOLIO', 'ALLOCATION'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 text-[11px] font-semibold tracking-[0.2em] transition-all relative ${activeTab === tab ? 'text-[#00d293]' : 'text-zinc-600'}`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00d293] shadow-[0_0_10px_rgba(0,210,147,0.5)]" />}
            </button>
          ))}
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[220px]"></div>

      {activeTab === 'PORTFOLIO' ? (
        <div className="px-5 pt-8 space-y-6">
          {/* Summary Chart Card */}
          <section className="bg-zinc-900/30 border border-white/5 rounded-[1.5rem] p-5">
            <div className="flex items-center gap-2 mb-2 text-zinc-500">
              <span className="text-[10px] font-semibold uppercase tracking-widest">True Net Worth</span>
              <i className="fa-solid fa-shield-halved text-[10px] text-zinc-600"></i>
            </div>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h1 className={`text-[28px] font-bold tracking-tighter tabular-nums ${metrics.trueNetWorth >= 0 ? 'text-white' : 'text-rose-500'}`}>
                  Rp{formatIDR(metrics.trueNetWorth)}
                </h1>
                <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5">Assets minus Liablities</p>
              </div>
              <div className={`px-2 py-1 rounded-lg bg-zinc-800 text-[10px] font-black tabular-nums flex items-center gap-1 ${metrics.growth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {metrics.growth >= 0 ? '+' : ''}{metrics.growthPercent.toFixed(1)}%
              </div>
            </div>

            <div className="h-[180px] w-full -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d293" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00d293" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', fontSize: '10px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#00d293', fontWeight: 'bold' }}
                    labelStyle={{ color: '#666', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    cursor={{ stroke: '#ffffff10', strokeWidth: 1 }}
                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                    formatter={(value: any) => [`Rp${formatIDR(Number(value))}`, 'TOTAL ASSET']}
                  />
                  <XAxis
                    dataKey="date"
                    hide={chartData.length < 3}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#444', fontSize: 8, fontWeight: 'bold' }}
                    padding={{ left: 10, right: 10 }}
                    minTickGap={30}
                  />
                  <YAxis hide domain={['auto', 'auto']} padding={{ top: 20, bottom: 20 }} />
                  <ReferenceLine y={chartData[0]?.value} stroke="#ffffff05" strokeWidth={1} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#00d293"
                    strokeWidth={2.5}
                    fill="url(#growthGrad)"
                    animationDuration={1500}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#00d293' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Total Initial Value</span>
                <span className="text-[12px] font-bold tabular-nums">Rp{formatIDR(metrics.totalInitial)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Net Asset Growth</span>
                <span className={`text-[12px] font-bold tabular-nums flex items-center gap-1.5 ${metrics.growth >= 0 ? 'text-[#00d293]' : 'text-[#FF5252]'}`}>
                  {metrics.growth >= 0 ? <i className="fa-solid fa-arrow-trend-up"></i> : <i className="fa-solid fa-arrow-trend-down"></i>}
                  Rp{formatIDR(Math.abs(metrics.growth))}
                </span>
              </div>

              {metrics.unpaidReceivable > 0 && (
                <div className="pt-3 border-t border-white/5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-zinc-500 uppercase tracking-widest">With Receivables</span>
                    <span className="font-bold text-white tabular-nums">Rp{formatIDR(metrics.unpaidReceivable)}</span>
                  </div>
                  {metrics.growth < 0 && (
                    <p className="text-[9px] font-medium text-zinc-500 italic mt-1 leading-relaxed">
                      * Decline is due to <span className="text-emerald-500">Rp{formatIDR(metrics.unpaidReceivable)}</span> in Receivables.
                      Your True Net Worth remains stable.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Asset List Section */}
          <section className="mt-8">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-white flex items-center gap-2">
                Top Assets (Rp) <i className="fa-solid fa-chevron-down text-[10px] text-zinc-600"></i>
              </h3>
              <button
                onClick={() => {
                  setEditingWallet(null);
                  setNewWallet({ type: WalletType.BANK, color: '#00d293' });
                  setShowAddForm(true);
                }}
                className="w-8 h-8 rounded-full bg-[#00d293]/10 text-[#00d293] flex items-center justify-center active:scale-90 transition-transform"
              >
                <i className="fa-solid fa-plus text-xs"></i>
              </button>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 border-b border-white/5 mb-2">
                <div className="col-span-5">Wallet</div>
                <div className="col-span-3 text-center">Profit / Loss</div>
                <div className="col-span-4 text-right">Balance</div>
              </div>

              {assetRanking.map((asset) => (
                <div key={asset.id} className="group flex flex-col">
                  <div
                    onClick={() => setSelectedAssetId(selectedAssetId === asset.id ? null : asset.id)}
                    className={`grid grid-cols-12 px-4 py-4 items-center bg-zinc-900/10 border border-transparent hover:border-emerald-500/20 active:bg-zinc-900/40 rounded-2xl transition-all group cursor-pointer ${selectedAssetId === asset.id ? 'bg-zinc-900/50 border-emerald-500/30 shadow-lg' : ''}`}
                  >
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-emerald-500 transition-colors overflow-hidden">
                        <i className={`fa-solid ${asset.icon || 'fa-vault'} text-sm`}></i>
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold tracking-tight text-white uppercase">{asset.code || 'ASST'}</h4>
                        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest truncate max-w-[80px]">{asset.name}</p>
                      </div>
                    </div>
                    <div className={`col-span-3 text-center text-[10px] font-bold tabular-nums ${asset.topUps > 0 ? 'text-emerald-500' : asset.topUps < 0 ? 'text-rose-500' : 'text-zinc-500'}`}>
                      {asset.topUps > 0 ? '+' : ''}{formatIDR(asset.topUps)}
                    </div>
                    <div className="col-span-4 text-right flex items-center justify-end gap-3">
                      <div className="flex flex-col items-end">
                        <p className="text-[13px] font-black tracking-tight text-white mb-0.5">Rp{formatIDR(asset.currentBalance)}</p>
                        <div className={`text-[9px] font-bold tabular-nums ${asset.growthPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {asset.growthPercent >= 0 ? '+' : ''}{asset.growthPercent.toFixed(1)}%
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingWallet(asset);
                          setNewWallet({
                            name: asset.name,
                            balance: asset.balance,
                            type: asset.type,
                            color: asset.color,
                            icon: asset.icon,
                            code: asset.code
                          });
                          setShowAddForm(true);
                        }}
                        className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 active:scale-75 transition-all"
                        title="Edit Asset"
                      >
                        <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                      </button>
                    </div>
                  </div>

                  {/* Asset-Specific Quick History Mini list */}
                  {selectedAssetId === asset.id && (
                    <div className="mx-4 mt-2 mb-4 p-4 rounded-2xl bg-black/40 border border-white/5 animate-in slide-in-from-top-2 duration-300">
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3">Recent Activity</p>
                      <div className="space-y-3">
                        {transactions.filter(t => t.walletId === asset.id).slice(0, 5).length > 0 ? (
                          transactions.filter(t => t.walletId === asset.id).slice(0, 5).map((t, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                              <div className="flex flex-col">
                                <span className="font-bold text-white uppercase tracking-tight">{t.description}</span>
                                <span className="text-[8px] text-zinc-600 font-medium uppercase">{new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                              </div>
                              <span className={`font-black tabular-nums ${t.type === TransactionType.INCOME || t.type === TransactionType.RECEIVABLE ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {t.type === TransactionType.INCOME || t.type === TransactionType.RECEIVABLE ? '+' : '-'}Rp{formatIDR(t.amount)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-zinc-700 italic text-center py-2">No transaction history</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="px-6 pt-10">
          {/* Donut Chart for Allocation */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-8 mb-8 flex flex-col items-center">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-6 text-center w-full">Portfolio Distribution</p>
            <div className="h-[220px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="total"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#00d293' : index === 1 ? '#00a5ff' : '#ff4582'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: '#00d293' }}
                    formatter={(val: number) => `Rp${formatIDR(val)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Net Value</span>
                <span className="text-[16px] font-black text-white px-2">Rp{formatIDR(metrics.totalCurrent)}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {allocationData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-[#00d293]' : i === 1 ? 'bg-[#00a5ff]' : 'bg-[#ff4582]'}`} />
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{item.type}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {allocationData.map((item, i) => {
              const percent = (item.total / metrics.totalCurrent) * 100;
              return (
                <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-6 rounded-full ${i === 0 ? 'bg-[#00d293]' : i === 1 ? 'bg-[#00a5ff]' : 'bg-[#ff4582]'}`} />
                      <span className="text-[12px] font-semibold uppercase tracking-widest text-zinc-400">{item.type}</span>
                    </div>
                    <span className="text-[14px] font-bold tabular-nums">Rp{formatIDR(item.total)}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${i === 0 ? 'bg-[#00d293]' : i === 1 ? 'bg-[#00a5ff]' : 'bg-[#ff4582]'}`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">Target: Balanced Portfolio</span>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{percent.toFixed(1)}% Allocation</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Wallet Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAddForm(false)}></div>
          <div className="bg-zinc-900 w-full max-w-[320px] p-5 rounded-[2rem] border border-white/5 relative z-10 animate-in slide-in-from-bottom-10 duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 px-1">{editingWallet ? 'Edit Asset' : 'Link New Asset'}</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-times text-[10px]"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Asset Label</p>
                <input
                  type="text"
                  placeholder="e.g. ALLO BANK"
                  value={newWallet.name || ''}
                  className="w-full h-11 bg-black rounded-xl px-4 text-[13px] font-black text-white border border-white/5 focus:border-emerald-500/50 outline-none transition-all placeholder:text-zinc-800"
                  onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Code</p>
                  <input
                    type="text"
                    placeholder="BCA"
                    maxLength={4}
                    value={newWallet.code || ''}
                    className="w-full h-10 bg-black rounded-xl px-4 text-[12px] font-black text-white border border-white/5 focus:border-emerald-500/50 outline-none transition-all placeholder:text-zinc-800 uppercase tracking-widest"
                    onChange={(e) => setNewWallet({ ...newWallet, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Type</p>
                  <select
                    value={newWallet.type || WalletType.BANK}
                    className="w-full h-10 bg-black rounded-xl px-4 text-[12px] font-black text-white border border-white/5 focus:border-emerald-500/50 outline-none appearance-none transition-all"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23444\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '10px' }}
                    onChange={(e) => setNewWallet({ ...newWallet, type: e.target.value as WalletType })}
                  >
                    <option value={WalletType.BANK}>Bank</option>
                    <option value={WalletType.CASH}>Cash</option>
                    <option value={WalletType.EWALLET}>E-Wallet</option>
                    <option value={WalletType.INVESTMENT}>Investment (Saham / Reksa Dana)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">{editingWallet ? 'Current Balance' : 'Initial Balance'}</p>
                <input
                  type="text"
                  placeholder="0"
                  value={newWallet.balance ? Number(newWallet.balance).toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setNewWallet({ ...newWallet, balance: value ? Number(value) : 0 });
                  }}
                  className="w-full h-11 bg-black rounded-xl px-4 text-[13px] font-black text-white border border-white/5 focus:border-emerald-500/50 outline-none transition-all placeholder:text-zinc-800 tabular-nums"
                />
              </div>

              <div className="mt-5">
                <button
                  onClick={() => {
                    if (newWallet.name && newWallet.balance !== undefined) {
                      // Extract only database fields, excluding computed properties
                      const dbWallet: Wallet = {
                        id: editingWallet?.id || crypto.randomUUID(),
                        name: newWallet.name,
                        balance: newWallet.balance,
                        type: newWallet.type || WalletType.BANK,
                        color: newWallet.color || '#00d293',
                        icon: newWallet.icon || (newWallet.type === WalletType.BANK ? 'fa-building-columns' : (newWallet.type === WalletType.CASH ? 'fa-money-bill-wave' : (newWallet.type === WalletType.INVESTMENT ? 'fa-chart-line' : 'fa-mobile-screen'))),
                        code: newWallet.code,
                        detail: newWallet.detail,
                      };

                      onAdd(dbWallet);
                      setShowAddForm(false);
                      setEditingWallet(null);
                      setNewWallet({ type: WalletType.BANK, color: '#00d293' });
                    }
                  }}
                  className="w-full h-12 bg-emerald-500 text-black rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all"
                >
                  {editingWallet ? 'UPDATE' : 'LINK ASSET'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default WalletManagement;
