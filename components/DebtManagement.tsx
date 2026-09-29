import React, { useState, useMemo, useEffect } from 'react';
import { TransactionType, Debt, Wallet } from '../types';
import { getLocalIsoDate, formatIDR, vibrate } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../lib/translations';
import RepaymentModal from './RepaymentModal';
import { Contacts } from '@capacitor-community/contacts';
import { ArrowLeft, Plus, History, Activity, Calendar, Wallet as WalletIcon, User, MoreVertical, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface DebtManagementProps {
  debts: Debt[];
  wallets: Wallet[];
  onAddDebt: (debt: Debt) => void;
  onUpdateDebt: (debt: Debt) => void;
  onDeleteDebt: (id: string) => void;
  onBack: () => void;
  onAddTransaction: (t: any) => void;
  isMobile?: boolean;
}

export interface InstallmentMeta {
  isInstallment: boolean;
  item: string;
  totalTenor: number;
  paidTenor: number;
  monthlyAmount: number;
}

export const parseDebtMeta = (rawTitle: string): { name: string; installment: InstallmentMeta | null } => {
  const match = rawTitle.match(/^(.*?)(\s*\[CICILAN:(\d+):(\d+):(\d+(?:\.\d+)?):(.*?)\])?$/);
  if (!match || !match[2]) {
    return { name: rawTitle, installment: null };
  }
  return {
    name: match[1].trim(),
    installment: {
      isInstallment: true,
      totalTenor: parseInt(match[3], 10),
      paidTenor: parseInt(match[4], 10),
      monthlyAmount: parseFloat(match[5]),
      item: match[6] || ''
    }
  };
};

export const buildDebtTitle = (name: string, installment: InstallmentMeta | null): string => {
  if (!installment || !installment.isInstallment) return name.trim();
  return `${name.trim()} [CICILAN:${installment.totalTenor}:${installment.paidTenor}:${installment.monthlyAmount}:${installment.item.trim()}]`;
};

const DebtManagement: React.FC<DebtManagementProps> = React.memo(({
  debts, wallets, onAddDebt, onUpdateDebt, onDeleteDebt, onBack, onAddTransaction, isMobile = false
}) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CICILAN' | 'PIUTANG' | 'HUTANG'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  
  // Installment form state
  const [isInstallmentMode, setIsInstallmentMode] = useState(false);
  const [installmentItem, setInstallmentItem] = useState('');
  const [installmentTenor, setInstallmentTenor] = useState('6');
  const [installmentMonthly, setInstallmentMonthly] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    phone: '',
    amount: '',
    dueDate: getLocalIsoDate(),
    type: TransactionType.DEBT,
    walletId: wallets[0]?.id || ''
  });
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);
  const { lang, t } = useLanguage();

  const totals = useMemo(() => {
    const hutang = debts.filter(d => d.type === TransactionType.DEBT && !d.isPaid).reduce((sum, d) => sum + d.amount, 0);
    const piutang = debts.filter(d => d.type === TransactionType.RECEIVABLE && !d.isPaid).reduce((sum, d) => sum + d.amount, 0);
    const netValue = piutang - hutang;
    return { hutang, piutang, netValue };
  }, [debts]);

  const handleOpenAddForm = (forceCicilan = false) => {
    setFormData({ 
      title: '', 
      phone: '', 
      amount: '', 
      dueDate: getLocalIsoDate(), 
      type: forceCicilan ? TransactionType.RECEIVABLE : TransactionType.DEBT, 
      walletId: wallets[0]?.id || '' 
    });
    setIsInstallmentMode(forceCicilan);
    setInstallmentItem('');
    setInstallmentTenor('6');
    setInstallmentMonthly('');
    setEditingDebtId(null);
    setIsSuccess(false);
    setShowAddForm(true);
  };

  const handleOpenEditForm = (debt: Debt) => {
    const { name, installment } = parseDebtMeta(debt.title);
    setFormData({ 
      title: name, 
      phone: debt.phone || '', 
      amount: debt.initialAmount.toString(), 
      dueDate: debt.dueDate, 
      type: debt.type, 
      walletId: debt.walletId 
    });
    if (installment) {
      setIsInstallmentMode(true);
      setInstallmentItem(installment.item);
      setInstallmentTenor(installment.totalTenor.toString());
      setInstallmentMonthly(installment.monthlyAmount.toString());
    } else {
      setIsInstallmentMode(false);
      setInstallmentItem('');
      setInstallmentTenor('6');
      setInstallmentMonthly('');
    }
    setEditingDebtId(debt.id);
    setIsSuccess(false);
    setShowAddForm(true);
  };

  const pickContact = async () => {
    try {
      const permission = await Contacts.requestPermissions();
      if (permission.contacts === 'granted') {
        const result = await Contacts.pickContact({ projection: { name: true, phones: true } });
        if (result.contact) {
          let newFormData = { ...formData };
          if (result.contact.phones?.[0]?.number) newFormData.phone = result.contact.phones[0].number;
          if (result.contact.name?.display && !formData.title) newFormData.title = result.contact.name.display;
          setFormData(newFormData);
        }
      }
    } catch (error) { console.error(error); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(formData.amount);
    if (!formData.title || !numericAmount || !formData.walletId) return;

    let finalTitle = formData.title;
    if (isInstallmentMode) {
      const tenor = Math.max(1, parseInt(installmentTenor, 10) || 6);
      const monthly = parseFloat(installmentMonthly) || Math.round(numericAmount / tenor);
      finalTitle = buildDebtTitle(formData.title, {
        isInstallment: true,
        item: installmentItem || 'Barang/Pinjaman',
        totalTenor: tenor,
        paidTenor: 0,
        monthlyAmount: monthly
      });
    }

    setIsSuccess(true);
    setTimeout(() => {
      if (editingDebtId) {
        const existingDebt = debts.find(d => d.id === editingDebtId);
        if (existingDebt) {
          const paymentsMade = existingDebt.initialAmount - existingDebt.amount;
          const newAmount = Math.max(0, numericAmount - paymentsMade);
          const { installment: prevInst } = parseDebtMeta(existingDebt.title);
          
          let updatedTitle = finalTitle;
          if (isInstallmentMode && prevInst) {
            const tenor = Math.max(1, parseInt(installmentTenor, 10) || 6);
            const monthly = parseFloat(installmentMonthly) || Math.round(numericAmount / tenor);
            updatedTitle = buildDebtTitle(formData.title, {
              isInstallment: true,
              item: installmentItem || 'Barang/Pinjaman',
              totalTenor: tenor,
              paidTenor: prevInst.paidTenor,
              monthlyAmount: monthly
            });
          }

          onUpdateDebt({ 
            ...existingDebt, 
            title: updatedTitle, 
            phone: formData.phone || undefined, 
            initialAmount: numericAmount, 
            amount: newAmount, 
            dueDate: formData.dueDate, 
            type: formData.type as any, 
            isPaid: newAmount <= 0, 
            walletId: formData.walletId 
          });
        }
      } else {
        const newDebt: Debt = { 
          id: Date.now().toString(), 
          title: finalTitle, 
          phone: formData.phone || undefined, 
          amount: numericAmount, 
          initialAmount: numericAmount, 
          dueDate: formData.dueDate, 
          type: formData.type as any, 
          isPaid: false, 
          walletId: formData.walletId 
        };
        onAddDebt(newDebt);
        // Hutang pribadi: catat transaksi pengeluaran/pemasukan dari saldo dompet.
        // Cicilan kartu kredit: TIDAK memotong saldo dompet pribadi saat awal!
        if (!isInstallmentMode) {
          onAddTransaction({ 
            amount: newDebt.amount, 
            type: newDebt.type, 
            category: 'Loan', 
            description: `Position: ${newDebt.title}`, 
            date: new Date().toISOString(), 
            walletId: newDebt.walletId 
          });
        }
      }
      setShowAddForm(false);
    }, 1200);
  };

  const handlePayInstallment = (debt: Debt, installment: InstallmentMeta) => {
    const { name } = parseDebtMeta(debt.title);
    const nextPaidTenor = installment.paidTenor + 1;
    const payAmount = Math.min(debt.amount, installment.monthlyAmount);
    const newAmount = Math.max(0, debt.amount - payAmount);
    const isPaid = newAmount <= 0 || nextPaidTenor >= installment.totalTenor;

    const updatedTitle = buildDebtTitle(name, {
      ...installment,
      paidTenor: nextPaidTenor
    });

    onUpdateDebt({
      ...debt,
      title: updatedTitle,
      amount: newAmount,
      isPaid
    });

    onAddTransaction({
      amount: payAmount,
      type: debt.type === TransactionType.DEBT ? TransactionType.EXPENSE : TransactionType.INCOME,
      category: 'Loan',
      description: `Cicilan (${nextPaidTenor}/${installment.totalTenor}): ${installment.item || 'Barang'} - ${name}`,
      date: new Date().toISOString(),
      walletId: debt.walletId
    });

    vibrate(15);
  };

  const handlePaymentConfirm = (amount: number) => {
    if (!selectedDebtForPayment) return;
    const debt = selectedDebtForPayment;
    const newAmount = Math.max(0, debt.amount - amount);
    onUpdateDebt({ ...debt, amount: newAmount, isPaid: newAmount <= 0 });
    onAddTransaction({ amount, type: debt.type === TransactionType.DEBT ? TransactionType.EXPENSE : TransactionType.INCOME, category: 'Others', description: `Settlement: ${debt.title}`, date: new Date().toISOString(), walletId: debt.walletId });
    setSelectedDebtForPayment(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-24 animate-in fade-in duration-500 overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-[100] px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-2.5 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between mb-2.5 max-w-5xl mx-auto">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-foreground active:scale-90 transition-all border border-border">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t('debt.performance')}</h2>
          <button onClick={() => handleOpenAddForm(false)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm active:scale-95 transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-1.5 max-w-5xl mx-auto">
          <div className="bg-card p-1 rounded-xl flex items-center gap-1 border border-border/50 shadow-sm">
            {['ACTIVE', 'HISTORY'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)} 
                className={`px-4 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(`debt.${tab.toLowerCase()}`)}
              </button>
            ))}
          </div>

          {activeTab === 'ACTIVE' && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'CICILAN', label: '📦 Cicilan' },
                { id: 'PIUTANG', label: 'Piutang' },
                { id: 'HUTANG', label: 'Hutang' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterMode(f.id as any)}
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight transition-all select-none ${
                    filterMode === f.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                      : 'bg-muted/40 text-muted-foreground border border-border/40 hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className={`px-4 pt-36 space-y-4 ${isMobile ? 'max-w-md mx-auto' : 'max-w-5xl mx-auto'}`}>
        <section className="rounded-2xl p-5 bg-card border border-border/50 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl -mr-12 -mt-12" />
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 relative z-10">{t('debt.net_debt_position')}</p>
          <h1 className={`text-2xl md:text-3xl font-black tracking-tight tabular-nums relative z-10 ${totals.netValue >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {totals.netValue >= 0 ? '+' : ''}Rp{formatIDR(Math.abs(totals.netValue))}
          </h1>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50 relative z-10">
            <div>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{t('debt.total_debt')}</p>
              <p className="text-[13px] font-bold text-foreground">Rp{formatIDR(totals.hutang)}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{t('debt.receivable')}</p>
              <p className="text-[13px] font-bold text-foreground">Rp{formatIDR(totals.piutang)}</p>
            </div>
          </div>
        </section>

        <div className={isMobile ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
          {debts
            .filter(d => activeTab === 'ACTIVE' ? !d.isPaid : d.isPaid)
            .filter(d => {
              if (activeTab === 'HISTORY') return true;
              const { installment } = parseDebtMeta(d.title);
              if (filterMode === 'CICILAN') return installment !== null;
              if (filterMode === 'PIUTANG') return d.type === TransactionType.RECEIVABLE && installment === null;
              if (filterMode === 'HUTANG') return d.type === TransactionType.DEBT && installment === null;
              return true;
            })
            .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .map(debt => {
              const { name, installment } = parseDebtMeta(debt.title);
              const progressPct = installment 
                ? Math.min(100, Math.round((installment.paidTenor / installment.totalTenor) * 100))
                : 0;

              return (
                <div key={debt.id} className="p-4 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                        installment 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : (!debt.isPaid && new Date(debt.dueDate) < new Date() 
                              ? 'bg-destructive/10 text-destructive border-destructive/20' 
                              : 'bg-muted/50 text-muted-foreground border-border')
                      }`}>
                        {installment ? (
                          <span className="text-base">📦</span>
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[13px] font-bold text-foreground truncate uppercase tracking-tight">{name}</h4>
                          {installment && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Cicilan
                            </span>
                          )}
                        </div>
                        {installment ? (
                          <p className="text-[10px] font-medium text-emerald-400/90 truncate">
                            {installment.item || 'Barang / Kredit'}
                          </p>
                        ) : (
                          <div className="flex items-center gap-1 opacity-60">
                            <Calendar className="w-2.5 h-2.5" />
                            <p className="text-[9px] font-bold uppercase tracking-widest">
                              {new Date(debt.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleOpenEditForm(debt)} className="text-muted-foreground/30 p-1 hover:text-foreground transition-colors flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Cicilan Progress Bar */}
                  {installment && (
                    <div className="mb-3 p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                      <div className="flex justify-between items-center text-[9px] font-bold mb-1">
                        <span className="text-muted-foreground">
                          Angsuran: {installment.paidTenor}/{installment.totalTenor} bln
                        </span>
                        <span className="text-emerald-400 font-mono">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8px] text-muted-foreground mt-1.5">
                        <span>Tagihan: <strong className="text-foreground">Rp{formatIDR(installment.monthlyAmount)}/bln</strong></span>
                        <span>Sisa: <strong className="text-foreground">{Math.max(0, installment.totalTenor - installment.paidTenor)} bln</strong></span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-end justify-between pt-2.5 border-t border-border/50">
                    <div>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-0.5">
                        {debt.type === TransactionType.DEBT ? 'Sisa Hutang' : 'Sisa Piutang'}
                      </p>
                      <p className="text-[14px] font-bold tabular-nums text-foreground tracking-tight">
                        Rp{formatIDR(debt.amount)}
                      </p>
                    </div>

                    {!debt.isPaid && (
                      <div className="flex items-center gap-1.5">
                        {installment ? (
                          <button 
                            onClick={() => handlePayInstallment(debt, installment)} 
                            className="h-8 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Bayar</span>
                          </button>
                        ) : null}
                        <button 
                          onClick={() => setSelectedDebtForPayment(debt)} 
                          className={`h-8 px-2.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all ${
                            installment 
                              ? 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                              : 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                          }`}
                        >
                          {installment ? 'Lunas' : 'Settle'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-end md:justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-lg bg-background rounded-t-[32px] md:rounded-[32px] shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-10 duration-500 border border-border overflow-hidden">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-4 mb-2" />
            
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-28">
              <div className="flex items-center justify-between py-6">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Position Entry</p>
                  <h2 className="text-xl font-black text-foreground">{editingDebtId ? 'Modify Record' : 'New Loan Record'}</h2>
                </div>
                <button onClick={() => setShowAddForm(false)} className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-foreground active:scale-90 transition-all border border-border">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-10 text-center">
                <div className="inline-flex items-baseline gap-2 mb-8">
                  <span className={`text-[18px] font-bold transition-colors ${formData.type === TransactionType.DEBT ? 'text-destructive/40' : 'text-primary/40'}`}>IDR</span>
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    value={formData.amount === '0' ? '' : formData.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} 
                    onChange={(e) => { const val = e.target.value.replace(/\./g, ''); if (/^\d*$/.test(val)) setFormData(prev => ({ ...prev, amount: val || '0' })); }} 
                    className={`w-[5ch] bg-transparent border-none outline-none text-4xl font-black tabular-nums text-center transition-all tracking-tighter ${formData.type === TransactionType.DEBT ? 'text-destructive' : 'text-primary'}`} 
                    placeholder="0" 
                    style={{ width: `${Math.max(3, formData.amount.length + 0.5)}ch` }} 
                  />
                </div>
                
                {/* Mode Selector: Regular vs Installment */}
                <div className="flex bg-muted/60 p-1 rounded-2xl w-full max-w-xs mx-auto mb-4 border border-border/50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInstallmentMode(false);
                      setFormData(prev => ({ ...prev, type: TransactionType.DEBT }));
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                      !isInstallmentMode 
                        ? 'bg-card text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🤝 Hutang Biasa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInstallmentMode(true);
                      setFormData(prev => ({ ...prev, type: TransactionType.RECEIVABLE }));
                      const num = parseFloat(formData.amount) || 0;
                      const t = parseInt(installmentTenor, 10) || 6;
                      if (num > 0) setInstallmentMonthly(Math.round(num / t).toString());
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                      isInstallmentMode 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    📦 Skema Cicilan
                  </button>
                </div>

                {!isInstallmentMode ? (
                  <div className="flex bg-muted/50 p-1.5 rounded-[18px] w-fit mx-auto border border-border shadow-inner">
                    <button 
                      onClick={() => setFormData(d => ({ ...d, type: TransactionType.DEBT }))} 
                      className={`px-6 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                        formData.type === TransactionType.DEBT 
                          ? 'bg-[#EF4444] text-white shadow-lg shadow-red-500/20' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      I Owe Money
                    </button>
                    <button 
                      onClick={() => setFormData(d => ({ ...d, type: TransactionType.RECEIVABLE }))} 
                      className={`px-6 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                        formData.type === TransactionType.RECEIVABLE 
                          ? 'bg-[#10B981] text-white shadow-lg shadow-emerald-500/20' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      They Owe Me
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] font-semibold text-emerald-400">
                    Orang mencicil ke Anda (Piutang Angsuran)
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 bg-card rounded-xl p-4 border border-border/50 flex flex-col gap-1 focus-within:border-primary/40 transition-all">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                      {isInstallmentMode ? 'Nama Debitur / Peminjam' : 'Counterparty Name'}
                    </span>
                    <div className="flex items-center gap-3">
                      <User className="w-3.5 h-3.5 text-muted-foreground/40" />
                      <input 
                        type="text" 
                        value={formData.title} 
                        onChange={e => setFormData({ ...formData, title: e.target.value })} 
                        placeholder={isInstallmentMode ? "Contoh: Budi Santoso" : "John Doe..."} 
                        className="bg-transparent border-none outline-none text-[13px] font-bold text-foreground placeholder:text-muted-foreground/20 w-full" 
                      />
                    </div>
                  </div>
                  <button type="button" onClick={pickContact} className="w-12 rounded-xl bg-muted/30 border border-border flex items-center justify-center text-primary active:scale-95 transition-all">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {isInstallmentMode && (
                  <>
                    <div className="bg-card rounded-xl p-4 border border-border/50 flex flex-col gap-1 focus-within:border-emerald-500/40 transition-all">
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                        Nama Barang / Catatan Cicilan
                      </span>
                      <input 
                        type="text" 
                        value={installmentItem} 
                        onChange={e => setInstallmentItem(e.target.value)} 
                        placeholder="Contoh: iPhone 13 128GB / Pinjaman Modal" 
                        className="bg-transparent border-none outline-none text-[13px] font-bold text-foreground placeholder:text-muted-foreground/30 w-full" 
                      />
                    </div>

                    <div className="bg-card rounded-xl p-4 border border-border/50 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          Tenor (Bulan)
                        </span>
                        <span className="text-[11px] font-bold text-emerald-400">
                          {installmentTenor} Bulan
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {['3', '6', '10', '12'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setInstallmentTenor(t);
                              const num = parseFloat(formData.amount) || 0;
                              if (num > 0) setInstallmentMonthly(Math.round(num / parseInt(t, 10)).toString());
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              installmentTenor === t 
                                ? 'bg-emerald-500 text-black shadow-md' 
                                : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {t} Bln
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-card rounded-xl p-4 border border-border/50 flex flex-col gap-1 focus-within:border-emerald-500/40 transition-all">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                        Angsuran / Bulan (IDR)
                      </span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={installmentMonthly ? installmentMonthly.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} 
                        onChange={e => {
                          const val = e.target.value.replace(/\./g, '');
                          if (/^\d*$/.test(val)) setInstallmentMonthly(val);
                        }} 
                        placeholder="0" 
                        className="bg-transparent border-none outline-none text-[15px] font-bold text-emerald-400 tabular-nums w-full" 
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card rounded-xl p-4 border border-border/50 flex flex-col gap-1 focus-within:border-primary/40 transition-all">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                      {isInstallmentMode ? 'Jatuh Tempo Bulanan' : 'Due Date'}
                    </span>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
                      <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="bg-transparent border-none outline-none text-[13px] font-bold text-foreground [color-scheme:dark] w-full" />
                    </div>
                  </div>
                  <div className="bg-card rounded-xl p-4 border border-border/50 flex flex-col gap-1 focus-within:border-primary/40 transition-all">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                      {isInstallmentMode ? 'Dompet Penampung' : 'Sumber Dompet'}
                    </span>
                    <div className="flex items-center gap-3">
                      <WalletIcon className="w-3.5 h-3.5 text-muted-foreground/40" />
                      <select value={formData.walletId} onChange={e => setFormData({ ...formData, walletId: e.target.value })} className="bg-transparent border-none outline-none text-[13px] font-bold text-foreground appearance-none w-full">
                        {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {isInstallmentMode && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                    <span className="text-base leading-none">💳</span>
                    <p className="text-[10px] text-amber-200/90 leading-relaxed font-medium">
                      <strong>Sumber: Kartu Kredit</strong>. Saldo dompet Anda saat ini <strong>tidak akan terpotong</strong>. Saat orang membayar angsuran bulanan, uang akan otomatis masuk ke dompet penampung yang Anda pilih.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-background/90 backdrop-blur-md border-t border-border/40">
              <button 
                onClick={handleSubmit} 
                className={`w-full h-12 rounded-xl text-white font-black text-[12px] uppercase tracking-[0.2em] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 ${
                  formData.type === TransactionType.DEBT 
                    ? 'bg-[#EF4444] shadow-red-500/20' 
                    : 'bg-[#10B981] shadow-emerald-500/20'
                }`}
              >
                {editingDebtId ? 'Update Position' : 'Authorize Position'}
              </button>
            </div>
          </div>
        </div>
      )}

      <RepaymentModal isOpen={!!selectedDebtForPayment} onClose={() => setSelectedDebtForPayment(null)} debt={selectedDebtForPayment} onConfirm={handlePaymentConfirm} />
    </div>
  );
});

export default DebtManagement;
