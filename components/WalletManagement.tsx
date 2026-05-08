
import React, { useState, useMemo } from 'react';
import { Wallet, WalletType, Transaction, TransactionType, Debt } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Plus, 
  ArrowLeftRight, 
  LayoutGrid, 
  PieChart as LucidePieChart, 
  Gem, 
  ChevronDown, 
  Pencil,
  Trash2,
  Building2,
  Smartphone,
  Coins,
  Wallet as WalletIcon
} from 'lucide-react';
import Deposit from './Deposit';

interface WalletManagementProps {
  wallets: Wallet[];
  transactions: Transaction[];
  debts: Debt[];
  onAdd: (wallet: Wallet) => void;
  onDelete: (id: string) => void;
  theme: 'light' | 'dark';
  onTopup: (walletId: string) => void;
  onTransfer: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
  onUpdateBalance: (id: string, diff: number, isIncrease: boolean) => Promise<void>;
  onUpdateBalanceRequest: (id: string, diff: number, isIncrease: boolean) => void;
}

const WalletManagement: React.FC<WalletManagementProps> = React.memo(({ wallets, transactions, debts, onAdd, onDelete, theme, onTopup, onTransfer, onDeposit, onWithdraw, onUpdateBalance, onUpdateBalanceRequest }) => {
  const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'ALOKASI' | 'INVESTASI'>('PORTFOLIO');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [newWallet, setNewWallet] = useState<Partial<Wallet>>({
    type: WalletType.BANK,
    color: '#00d293'
  });
  const { lang, t } = useLanguage();

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
    const data = sorted.map(t_item => {
      const isIncrease = t_item.type === TransactionType.INCOME || t_item.type === TransactionType.DEBT;
      currentBalance += isIncrease ? Number(t_item.amount) : -Number(t_item.amount);
      const dateObj = new Date(t_item.date);
      return {
        date: dateObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric' }),
        fullDate: dateObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        value: currentBalance
      };
    });

    if (data.length === 0) return [{ date: 'Start', fullDate: t('wallet.initial_state'), value: initialAsset }, { date: 'Today', fullDate: t('wallet.current_state'), value: initialAsset }];
    return [{ date: 'Start', fullDate: t('wallet.initial_balance'), value: initialAsset }, ...data];
  }, [transactions, wallets, lang, t]);

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
    const types = [WalletType.BANK, WalletType.CASH, WalletType.EWALLET, WalletType.INVESTMENT];
    return types.map(type => {
      const total = assetRanking.filter(a => a.type === type).reduce((sum, a) => sum + a.currentBalance, 0);
      return { type, total };
    }).filter(t => t.total > 0);
  }, [assetRanking]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-32">
      {/* Institutional Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 max-w-md mx-auto px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <TrendingUp size={18} />
          </div>
          <h2 className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground">{t('wallet.performance')}</h2>
          <button
            onClick={onTransfer}
            className="size-10 rounded-2xl bg-muted/30 flex items-center justify-center text-foreground active:scale-90 transition-all border border-border/10 hover:bg-muted"
          >
            <ArrowLeftRight size={18} />
          </button>
        </div>

        <div className="flex bg-muted/30 rounded-2xl p-1 border border-border/10">
          {[
            { id: 'PORTFOLIO', label: 'Porto' },
            { id: 'ALOKASI', label: 'Alokasi' },
            { id: 'INVESTASI', label: 'Investasi' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 text-[10px] font-black tracking-widest uppercase transition-all rounded-xl ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-lg' 
                  : 'text-muted-foreground/50 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'PORTFOLIO' && (
        <div className="px-5 pb-8 pt-[calc(11.5rem+env(safe-area-inset-top))] space-y-8">
          {/* Summary Performance Card */}
          <section className="bg-gradient-to-br from-card via-card to-muted/30 rounded-[32px] p-7 border border-border/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">{t('wallet.true_net_worth')}</span>
              <ShieldCheck size={10} className="text-primary opacity-50" />
            </div>
            <div className="mb-10 flex items-end justify-between">
              <div>
                <h1 className={`text-3xl font-black tracking-tighter tabular-nums ${metrics.trueNetWorth >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                  Rp{formatIDR(metrics.trueNetWorth)}
                </h1>
                <p className="text-[10px] font-bold text-muted-foreground/60 tracking-widest mt-1 uppercase">{t('wallet.assets_minus_liabilities')}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-[10px] font-black tabular-nums flex items-center gap-1 border ${
                metrics.growth >= 0 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              }`}>
                {metrics.growth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(metrics.growthPercent).toFixed(1)}%
              </div>
            </div>

            <div className="h-[180px] w-full -mx-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', fontSize: '10px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    cursor={{ stroke: 'rgba(var(--text-muted-rgb, 150, 150, 150), 0.1)', strokeWidth: 1 }}
                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                    formatter={(value: any) => [`Rp${formatIDR(Number(value))}`, t('wallet.total_asset')]}
                  />
                  <XAxis
                    dataKey="date"
                    hide={chartData.length < 3}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-muted)', opacity: 0.5, fontSize: 8, fontWeight: 'bold' }}
                    minTickGap={40}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <ReferenceLine y={chartData[0]?.value} stroke="var(--border-subtle)" strokeDasharray="4 4" />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#growthGrad)"
                    animationDuration={1500}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 pt-6 border-t border-border/40 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{t('wallet.initial_value')}</span>
                <span className="text-[12px] font-black tabular-nums text-foreground/80">Rp{formatIDR(metrics.totalInitial)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{t('wallet.net_growth')}</span>
                <span className={`text-[12px] font-black tabular-nums flex items-center gap-1.5 ${metrics.growth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {metrics.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  Rp{formatIDR(Math.abs(metrics.growth))}
                </span>
              </div>

              {metrics.unpaidReceivable > 0 && (
                <div className="pt-4 border-t border-border/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest">{t('wallet.unrealized_piutang')}</span>
                    <span className="text-[11px] font-bold text-emerald-500/50 tabular-nums">Rp{formatIDR(metrics.unpaidReceivable)}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Asset List Section */}
          <section className="mt-8">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase flex items-center gap-2">
                {t('wallet.top_assets')} <ChevronDown size={10} className="opacity-30" />
              </h3>
              <button
                onClick={() => {
                  setEditingWallet(null);
                  setNewWallet({ type: WalletType.BANK, color: '#00d293' });
                  setShowAddForm(true);
                }}
                className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-all border border-primary/20 hover:bg-primary hover:text-primary-foreground"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-4 py-2 text-[9px] font-black tracking-[0.2em] text-muted-foreground opacity-30 uppercase border-b border-border/20 mb-2">
                <div className="flex-1 min-w-0 pr-2">{t('wallet.wallet_code')}</div>
                <div className="shrink-0 w-[80px] text-center">{t('wallet.profit')}</div>
                <div className="shrink-0 w-[110px] text-right">{t('wallet.balance')}</div>
              </div>

              {assetRanking.map((asset, idx) => (
                <div key={asset.id} className="group flex flex-col">
                  <div
                    onClick={() => setSelectedAssetId(selectedAssetId === asset.id ? null : asset.id)}
                    className={`flex items-center justify-between px-4 py-4 bg-muted/20 hover:bg-muted/30 active:scale-[0.98] rounded-3xl transition-all group cursor-pointer backdrop-blur-sm ${selectedAssetId === asset.id ? 'bg-primary/[0.05]' : ''}`}
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-4 pr-2">
                      <div className="size-11 shrink-0 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        {asset.type === WalletType.BANK ? <Building2 size={20} /> : asset.type === WalletType.EWALLET ? <Smartphone size={20} /> : asset.type === WalletType.CASH ? <Coins size={20} /> : <WalletIcon size={20} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[12px] font-black tracking-tight text-foreground/90 uppercase truncate">{asset.code || 'ASST'}</h4>
                        <p className="text-[9px] font-bold text-muted-foreground/40 tracking-widest truncate uppercase">{asset.name}</p>
                      </div>
                    </div>
                    <div className={`shrink-0 w-[80px] text-center text-[11px] font-black tabular-nums truncate ${asset.topUps > 0 ? 'text-emerald-500' : asset.topUps < 0 ? 'text-rose-500' : 'text-muted-foreground/30'}`}>
                      {asset.topUps !== 0 && (asset.topUps > 0 ? '↑' : '↓')}
                      {asset.topUps !== 0 ? formatIDR(Math.abs(asset.topUps)) : '—'}
                    </div>
                    <div className="shrink-0 w-[110px] text-right flex items-center justify-end gap-3">
                      <div className="flex flex-col items-end min-w-0">
                        <p className="text-[13px] font-black tracking-tight text-foreground mb-0.5 truncate max-w-full">Rp{formatIDR(asset.currentBalance)}</p>
                        <div className={`text-[9px] font-black tabular-nums ${asset.growthPercent >= 0 ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
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
                        className="size-8 shrink-0 rounded-xl bg-muted/30 border border-border/10 flex items-center justify-center text-muted-foreground active:scale-75 transition-all hover:text-foreground hover:bg-muted"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>

                  {selectedAssetId === asset.id && (
                    <div className="mx-2 mt-2 mb-4 p-4 rounded-2xl bg-[rgba(var(--bg-card-rgb),0.2)] border border-[var(--border-subtle)] animate-in slide-in-from-top-2 duration-300">
                      <p className="text-[8px] font-bold text-[var(--text-muted)] opacity-50 tracking-[0.2em] mb-4 uppercase">{t('wallet.recent_activity')}</p>
                      <div className="space-y-4">
                        {transactions.filter(t_item => t_item.walletId === asset.id).slice(0, 5).length > 0 ? (
                          transactions.filter(t_item => t_item.walletId === asset.id).slice(0, 5).map((t_item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-tight">{t_item.description}</span>
                                <span className="text-[7px] text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest">{new Date(t_item.date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' })}</span>
                              </div>
                              <span className={`text-[10px] font-bold tabular-nums ${t_item.type === TransactionType.INCOME || t_item.type === TransactionType.RECEIVABLE ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                                {t_item.type === TransactionType.INCOME || t_item.type === TransactionType.RECEIVABLE ? '+' : '-'}Rp{formatIDR(t_item.amount)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[9px] text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest text-center py-2">{t('wallet.no_history')}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'ALOKASI' && (
        <div className="px-6 pb-32 pt-[calc(11.5rem+env(safe-area-inset-top))]">
          {/* Donut Chart for Allocation */}
          <section className="bg-muted/10 border border-border/10 rounded-[32px] p-8 mb-8 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] pointer-events-none" />
            <p className="text-[10px] font-black text-muted-foreground/30 tracking-[0.2em] mb-8 text-center w-full uppercase">{t('wallet.portfolio_distribution')}</p>
            <div className="h-[220px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="total"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : index === 2 ? '#f43f5e' : '#f59e0b'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', fontSize: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    formatter={(val_item: number) => `Rp${formatIDR(val_item)}`}
                  />
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-black text-muted-foreground/30 tracking-widest uppercase">{t('wallet.net_value')}</span>
                <span className="text-[15px] font-black text-foreground tabular-nums tracking-tighter">Rp{formatIDR(metrics.totalCurrent)}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-5 mt-6">
              {allocationData.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`size-1.5 rounded-full ${i === 0 ? 'bg-[#10b981]' : i === 1 ? 'bg-[#3b82f6]' : i === 2 ? 'bg-[#f43f5e]' : 'bg-[#f59e0b]'}`} />
                  <span className="text-[9px] font-black text-muted-foreground tracking-widest uppercase">{t(`wallet.${item.type.toLowerCase()}`)}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-4">
            {allocationData.map((item, i) => {
              const percent = (item.total / metrics.totalCurrent) * 100;
              return (
                <div key={i} className="premium-glass rounded-[28px] p-5 border border-white/[0.05] animate-list-enter" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-4 rounded-full ${i === 0 ? 'bg-[#10b981]' : i === 1 ? 'bg-[#3b82f6]' : i === 2 ? 'bg-[#f43f5e]' : 'bg-[#f59e0b]'}`} />
                      <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">{t(`wallet.${item.type.toLowerCase()}`)}</span>
                    </div>
                    <span className="text-[12px] font-bold tabular-nums text-[var(--text-primary)]">Rp{formatIDR(item.total)}</span>
                  </div>
                  <div className="h-1 bg-[rgba(var(--bg-card-rgb),0.2)] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${i === 0 ? 'bg-[#10b981]' : i === 1 ? 'bg-[#3b82f6]' : i === 2 ? 'bg-[#f43f5e]' : 'bg-[#f59e0b]'}`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[8px] font-bold text-[var(--text-muted)] opacity-50 tracking-widest uppercase">{t('wallet.balanced_portfolio')}</span>
                    <span className="text-[9px] font-bold text-[var(--text-muted)] opacity-40 tracking-widest uppercase">{percent.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'INVESTASI' && (
        <div className="pt-[calc(11.5rem+env(safe-area-inset-top))]">
          <Deposit
            wallets={wallets}
            transactions={transactions}
            onDeposit={onDeposit}
            onWithdraw={onWithdraw}
            onUpdateBalance={(id, val, diff) => onUpdateBalance(id, diff, diff > 0)}
            onUpdateBalanceRequest={(w) => onUpdateBalanceRequest(w.id, 0, true)}
          />
        </div>
      )}

      {/* Add Wallet Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowAddForm(false)}></div>
          <div className="bg-card w-full max-w-[340px] p-8 rounded-[32px] border border-border/40 relative z-10 animate-in zoom-in duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">{editingWallet ? t('wallet.edit_asset') : t('wallet.link_new_asset')}</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="size-9 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border/10"
              >
                <Plus size={16} className="rotate-45" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2.5">
                <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] px-1">{t('wallet.asset_label')}</p>
                <input
                  type="text"
                  placeholder={t('wallet.asset_placeholder')}
                  value={newWallet.name || ''}
                  className="w-full h-12 bg-muted/20 rounded-2xl px-4 text-[13px] font-bold text-foreground border border-border/10 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/30"
                  onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] px-1">{t('wallet.code')}</p>
                  <input
                    type="text"
                    placeholder="BCA"
                    maxLength={4}
                    value={newWallet.code || ''}
                    className="w-full h-12 bg-muted/20 rounded-2xl px-4 text-[13px] font-black text-foreground border border-border/10 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/30 uppercase tracking-widest"
                    onChange={(e) => setNewWallet({ ...newWallet, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2.5">
                  <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] px-1">{t('wallet.type')}</p>
                  <select
                    value={newWallet.type || WalletType.BANK}
                    className="w-full h-12 bg-muted/20 rounded-2xl px-4 text-[12px] font-black text-foreground border border-border/10 focus:border-primary/50 outline-none appearance-none transition-all"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23666\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '10px' }}
                    onChange={(e) => setNewWallet({ ...newWallet, type: e.target.value as WalletType })}
                  >
                    <option value={WalletType.BANK}>{t('wallet.bank')}</option>
                    <option value={WalletType.CASH}>{t('wallet.cash')}</option>
                    <option value={WalletType.EWALLET}>{t('wallet.ewallet')}</option>
                    <option value={WalletType.INVESTMENT}>{t('wallet.investment')}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] px-1">{editingWallet ? t('wallet.current_balance') : t('wallet.initial_balance_label')}</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/30 uppercase">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={newWallet.balance ? Number(newWallet.balance).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US') : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setNewWallet({ ...newWallet, balance: value ? Number(value) : 0 });
                    }}
                    className="w-full h-12 bg-muted/20 rounded-2xl pl-10 pr-4 text-[14px] font-black text-foreground border border-border/10 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/30 tabular-nums"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                {editingWallet && (
                  <button
                    onClick={() => {
                      if (editingWallet.balance !== 0) {
                        alert(t('wallet.delete_error').replace('{amount}', formatIDR(editingWallet.balance)));
                        return;
                      }
                      onDelete(editingWallet.id);
                      setShowAddForm(false);
                      setEditingWallet(null);
                    }}
                    className="size-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center active:scale-95 transition-all hover:bg-rose-500 hover:text-white"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (newWallet.name && newWallet.balance !== undefined) {
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
                  className="flex-1 h-12 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  {editingWallet ? t('wallet.update_asset') : t('wallet.link_asset')}
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
