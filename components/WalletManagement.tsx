import React, { useState, useMemo } from 'react';
import { Wallet, WalletType, Transaction, TransactionType } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface WalletManagementProps {
  wallets: Wallet[];
  transactions: Transaction[];
  onAdd: (wallet: Wallet) => void;
  onDelete: (id: string) => void;
  theme: 'light' | 'dark';
  onTopup: (walletId: string) => void;
}

const WalletManagement: React.FC<WalletManagementProps> = React.memo(({ wallets, transactions, onAdd, onDelete, theme, onTopup }) => {
  const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'ALLOCATION'>('PORTFOLIO');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
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
    const totalInitial = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    // Calculate current net worth based on transactions
    // INCOME & RECEIVABLE (Piutang) = uang masuk
    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME || t.type === TransactionType.RECEIVABLE)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    // EXPENSE & DEBT (Hutang) = uang keluar
    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE || t.type === TransactionType.DEBT)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalCurrent = totalInitial + totalIncome - totalExpense;
    const growth = totalCurrent - totalInitial;
    const growthPercent = totalInitial > 0 ? (growth / totalInitial) * 100 : 0;

    return { totalInitial, totalCurrent, growth, growthPercent };
  }, [wallets, transactions]);

  // 2. Chart Data Generation (Running Balance)
  const chartData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const initialAsset = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    let currentBalance = initialAsset;
    const data = sorted.map(t => {
      const isIncrease = t.type === TransactionType.INCOME || t.type === TransactionType.RECEIVABLE;
      currentBalance += isIncrease ? Number(t.amount) : -Number(t.amount);
      return {
        date: new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        value: currentBalance
      };
    });

    if (data.length === 0) return [{ date: 'Start', value: initialAsset }, { date: 'Today', value: initialAsset }];
    return [{ date: 'Start', value: initialAsset }, ...data];
  }, [transactions, wallets]);

  // 3. Top Assets List Data
  const assetRanking = useMemo(() => {
    return wallets.map(w => {
      const walletTransactions = transactions.filter(t => t.walletId === w.id);

      // Count only top-ups (INCOME transactions)
      const topUpCount = walletTransactions.filter(t => t.type === TransactionType.INCOME).length;

      // Calculate total top-ups
      const totalTopUps = walletTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const wIncome = walletTransactions
        .filter(t => t.type === TransactionType.INCOME || t.type === TransactionType.RECEIVABLE)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const wExpense = walletTransactions
        .filter(t => t.type === TransactionType.EXPENSE || t.type === TransactionType.DEBT)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const currentBalance = Number(w.balance) + wIncome - wExpense;

      // Calculate percentage based on top-ups
      const topUpBase = Number(w.balance) + totalTopUps;
      const growthPercent = topUpBase > 0 ? ((currentBalance - topUpBase) / topUpBase) * 100 : 0;

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
        topUps: totalTopUps,
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
      <header className="px-6 pt-12 text-center">
        <h2 className="text-[15px] font-bold tracking-tight mb-8">Performance</h2>
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

      {activeTab === 'PORTFOLIO' ? (
        <div className="px-5 pt-8 space-y-6">
          {/* Summary Chart Card */}
          <section className="bg-zinc-900/30 border border-white/5 rounded-[1.5rem] p-5">
            <div className="flex items-center gap-2 mb-2 text-zinc-500">
              <span className="text-[10px] font-semibold uppercase tracking-widest">Total Asset Value</span>
              <i className="fa-solid fa-circle-info text-[10px]"></i>
            </div>
            <div className="mb-6">
              <h1 className={`text-[24px] font-bold tracking-tighter ${metrics.growth >= 0 ? 'text-[#00d293]' : 'text-[#FF5252]'}`}>
                {metrics.growth >= 0 ? '+' : ''}{formatIDR(metrics.totalCurrent)}
              </h1>
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-1">Growth to Date</p>
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
                    contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px', fontSize: '10px' }}
                    itemStyle={{ color: '#00d293' }}
                    cursor={{ stroke: '#ffffff10' }}
                  />
                  <ReferenceLine y={chartData[0]?.value} stroke="#ffffff10" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="value" stroke="#00d293" strokeWidth={2} fill="url(#growthGrad)" />
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
                <div className="col-span-2 text-center">Top Up</div>
                <div className="col-span-5 text-right">Balance</div>
              </div>

              {assetRanking.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => {
                    setEditingWallet(asset);
                    setNewWallet({
                      name: asset.name,
                      balance: asset.balance,
                      type: asset.type,
                      color: asset.color,
                      icon: asset.icon,
                      detail: asset.detail
                    });
                    setShowAddForm(true);
                  }}
                  className="grid grid-cols-12 px-4 py-4 items-center bg-zinc-900/10 border border-transparent active:border-[#00d293]/30 active:bg-zinc-900/40 rounded-2xl transition-all group cursor-pointer"
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-active:text-[#00d293] transition-colors overflow-hidden">
                      <i className={`fa-solid ${asset.icon || 'fa-vault'} text-sm`}></i>
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold tracking-tight text-white uppercase">{asset.code || 'ASST'}</h4>
                      <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest truncate max-w-[80px]">{asset.name}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-center text-[10px] font-bold text-zinc-400 tabular-nums">
                    {asset.topUps > 0 ? `Rp${formatIDR(asset.topUps)}` : '-'}
                  </div>
                  <div className="col-span-5 text-right">
                    <p className="text-[13px] font-bold tracking-tight text-white mb-0.5">Rp{formatIDR(asset.currentBalance)}</p>
                    <p className={`text-[10px] font-medium tabular-nums ${asset.growthPercent >= 0 ? 'text-[#00d293]' : 'text-[#FF5252]'}`}>
                      {asset.growthPercent >= 0 ? '↑' : '↓'} {Math.abs(asset.growthPercent).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="px-6 pt-10">
          {/* Allocation Tab - Simplistic Breakdown */}
          <div className="space-y-4">
            {allocationData.map((item, i) => {
              const percent = (item.total / metrics.totalCurrent) * 100;
              return (
                <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 rounded-full bg-[#00d293]" />
                      <span className="text-[12px] font-semibold uppercase tracking-widest text-[#00d293]">{item.type}</span>
                    </div>
                    <span className="text-[14px] font-bold tabular-nums">Rp{formatIDR(item.total)}</span>
                  </div>
                  <div className="h-2 bg-zinc-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00d293] rounded-full"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-3 text-right">{percent.toFixed(1)}% Allocation</p>
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
          <div className="bg-zinc-900 w-full max-w-[360px] p-6 rounded-[2.5rem] border border-white/5 relative z-10 animate-in slide-in-from-bottom-10 duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-400 px-1">Link New Asset</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-times text-xs"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-1">Asset Label</p>
                <input
                  type="text"
                  placeholder="e.g. Stockbit RDN"
                  value={newWallet.name || ''}
                  className="w-full h-12 bg-black rounded-2xl px-5 text-[12px] font-semibold text-white border border-white/5 focus:border-[#00d293]/50 outline-none transition-all placeholder:text-zinc-700"
                  onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-1">Code</p>
                  <input
                    type="text"
                    placeholder="BCA"
                    maxLength={4}
                    value={newWallet.detail || ''}
                    className="w-full h-12 bg-black rounded-2xl px-5 text-[12px] font-semibold text-white border border-white/5 focus:border-[#00d293]/50 outline-none transition-all placeholder:text-zinc-700 uppercase"
                    onChange={(e) => setNewWallet({ ...newWallet, detail: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-1">Type</p>
                  <select
                    value={newWallet.type || WalletType.BANK}
                    className="w-full h-12 bg-black rounded-2xl px-5 text-[12px] font-semibold text-white border border-white/5 focus:border-[#00d293]/50 outline-none appearance-none transition-all"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23444\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '12px' }}
                    onChange={(e) => setNewWallet({ ...newWallet, type: e.target.value as WalletType })}
                  >
                    <option value={WalletType.BANK}>Bank</option>
                    <option value={WalletType.CASH}>Cash</option>
                    <option value={WalletType.EWALLET}>E-Wallet</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-1">Initial Balance</p>
                <input
                  type="text"
                  placeholder="0"
                  value={newWallet.balance ? Number(newWallet.balance).toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setNewWallet({ ...newWallet, balance: value ? Number(value) : 0 });
                  }}
                  className="w-full h-12 bg-black rounded-2xl px-5 text-[12px] font-semibold text-white border border-white/5 focus:border-[#00d293]/50 outline-none transition-all placeholder:text-zinc-700"
                />
              </div>

              <div className="flex gap-3 mt-4">
                {editingWallet && (
                  <button
                    onClick={() => {
                      if (confirm('Delete this wallet?')) {
                        onDelete(editingWallet.id);
                        setShowAddForm(false);
                        setEditingWallet(null);
                      }
                    }}
                    className="flex-shrink-0 h-14 px-6 bg-rose-500/10 text-rose-500 rounded-full text-[12px] font-semibold uppercase tracking-[0.2em] active:scale-[0.98] transition-all border border-rose-500/20"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => {
                    if (newWallet.name && newWallet.balance !== undefined) {
                      if (editingWallet) {
                        // Update existing wallet
                        onAdd({
                          ...editingWallet,
                          ...newWallet,
                        } as Wallet);
                      } else {
                        // Add new wallet
                        onAdd({
                          ...newWallet,
                          id: crypto.randomUUID(),
                          color: '#00d293',
                          icon: newWallet.type === WalletType.BANK ? 'fa-building-columns' : (newWallet.type === WalletType.CASH ? 'fa-money-bill-wave' : 'fa-mobile-screen'),
                        } as Wallet);
                      }
                      setShowAddForm(false);
                      setEditingWallet(null);
                      setNewWallet({ type: WalletType.BANK, color: '#00d293' });
                    }
                  }}
                  className="flex-1 h-14 bg-[#00d293] text-black rounded-full text-[12px] font-semibold uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(0,210,147,0.2)] active:scale-[0.98] transition-all"
                >
                  {editingWallet ? 'Update' : 'Save & Link'}
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
