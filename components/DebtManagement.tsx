import React, { useState, useMemo, useEffect } from 'react';
import { TransactionType, Debt, Wallet } from '../types';
import { getLocalIsoDate, formatIDR, vibrate } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../lib/translations';
import RepaymentModal from './RepaymentModal';
import { Contacts } from '@capacitor-community/contacts';
import { ArrowLeft, Plus, History, Activity, Calendar, Wallet as WalletIcon, User, MoreVertical, CheckCircle2, AlertCircle, X, Receipt, CreditCard } from 'lucide-react';

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

  const filteredDebts = useMemo(() => {
    return debts
      .filter(d => activeTab === 'ACTIVE' ? !d.isPaid : d.isPaid)
      .filter(d => {
        if (activeTab === 'HISTORY') return true;
        const { installment } = parseDebtMeta(d.title);
        if (filterMode === 'CICILAN') return installment !== null;
        if (filterMode === 'PIUTANG') return d.type === TransactionType.RECEIVABLE && installment === null;
        if (filterMode === 'HUTANG') return d.type === TransactionType.DEBT && installment === null;
        return true;
      })
      .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [debts, activeTab, filterMode]);

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-foreground pb-28 animate-in fade-in duration-300 overflow-x-hidden font-sans">
      {/* Sticky Header with NO Collision */}
      <header className="sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 pt-[calc(0.75rem+env(safe-area-inset-top,16px))] pb-3.5">
        <div className="flex items-center justify-between mb-3 max-w-md md:max-w-5xl mx-auto">
          <button 
            onClick={onBack} 
            type="button"
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="text-center">
            <h2 className="text-sm font-bold text-white tracking-tight">Cicilan & Hutang</h2>
            <p className="text-[10px] text-zinc-500 font-medium">Kelola Tagihan & Piutang</p>
          </div>

          <button 
            onClick={() => handleOpenAddForm(filterMode === 'CICILAN')} 
            type="button"
            className="h-9 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)] active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Tambah</span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-2.5 max-w-md md:max-w-5xl mx-auto">
          {/* Segmented Control */}
          <div className="bg-zinc-900/90 p-1 rounded-xl flex items-center gap-1 border border-white/[0.08] w-full max-w-xs shadow-inner">
            {[
              { id: 'ACTIVE', label: 'Tagihan Aktif' },
              { id: 'HISTORY', label: 'Riwayat Lunas' }
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                type="button"
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'ACTIVE' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full justify-center">
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'CICILAN', label: 'Cicilan' },
                { id: 'PIUTANG', label: 'Piutang' },
                { id: 'HUTANG', label: 'Hutang' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterMode(f.id as any)}
                  type="button"
                  className={`px-3 py-1 rounded-full text-xs font-semibold tracking-tight transition-all select-none cursor-pointer ${
                    filterMode === f.id
                      ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/25'
                      : 'bg-zinc-900 text-zinc-400 border border-white/[0.08] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`px-4 pt-4 space-y-4 ${isMobile ? 'max-w-md mx-auto' : 'max-w-5xl mx-auto'}`}>
        {/* Net Balance Card with Real Depth */}
        <section className="rounded-2xl p-5 bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-white/[0.08] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <p className="text-[11px] font-semibold text-zinc-400 mb-1">Posisi Saldo Bersih</p>
          <h1 className={`text-3xl font-extrabold tracking-tight tabular-nums ${totals.netValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totals.netValue >= 0 ? '+' : ''}Rp{formatIDR(Math.abs(totals.netValue))}
          </h1>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/[0.06]">
            <div>
              <p className="text-[11px] font-medium text-zinc-500 mb-0.5">Total Hutang (Saya)</p>
              <p className="text-sm font-bold text-rose-400 tabular-nums">Rp{formatIDR(totals.hutang)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-zinc-500 mb-0.5">Piutang & Cicilan (Orang)</p>
              <p className="text-sm font-bold text-emerald-400 tabular-nums">Rp{formatIDR(totals.piutang)}</p>
            </div>
          </div>
        </section>

        {/* List Section or Empty State */}
        {filteredDebts.length === 0 ? (
          <div className="py-12 px-6 rounded-2xl bg-zinc-900/40 border border-white/[0.06] text-center flex flex-col items-center justify-center mt-2 shadow-inner">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              {filterMode === 'CICILAN' ? (
                <CreditCard className="w-7 h-7" />
              ) : (
                <Receipt className="w-7 h-7" />
              )}
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {activeTab === 'HISTORY' ? 'Belum Ada Riwayat Pelunasan' : 'Belum Ada Catatan'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed mb-5">
              {activeTab === 'HISTORY'
                ? 'Catatan cicilan atau hutang yang sudah lunas akan tersimpan di sini.'
                : filterMode === 'CICILAN'
                  ? 'Catat barang atau uang yang dicicil orang lain dari kartu kredit Anda.'
                  : 'Mulai kelola cicilan barang dan catatan hutang piutang dengan rapi.'}
            </p>
            {activeTab === 'ACTIVE' && (
              <button
                onClick={() => handleOpenAddForm(filterMode === 'CICILAN')}
                type="button"
                className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{filterMode === 'CICILAN' ? 'Tambah Cicilan Baru' : 'Tambah Catatan Baru'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className={isMobile ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
            {filteredDebts.map(debt => {
              const { name, installment } = parseDebtMeta(debt.title);
              const progressPct = installment 
                ? Math.min(100, Math.round((installment.paidTenor / installment.totalTenor) * 100))
                : 0;

              return (
                <div key={debt.id} className="p-4 rounded-2xl border border-white/[0.08] bg-zinc-900/70 hover:border-emerald-500/30 transition-all shadow-md">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                        installment 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : (!debt.isPaid && new Date(debt.dueDate) < new Date() 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                              : 'bg-zinc-800 text-zinc-400 border-white/5')
                      }`}>
                        {installment ? (
                          <CreditCard className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[13px] font-bold text-white truncate uppercase tracking-tight">{name}</h4>
                          {installment && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Cicilan
                            </span>
                          )}
                        </div>
                        {installment ? (
                          <p className="text-[11px] font-medium text-emerald-400/90 truncate mt-0.5">
                            {installment.item || 'Barang / Kredit'}
                          </p>
                        ) : (
                          <div className="flex items-center gap-1 text-zinc-500 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <p className="text-[10px] font-medium">
                              {new Date(debt.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleOpenEditForm(debt)} className="text-zinc-500 hover:text-white p-1 transition-colors flex-shrink-0 cursor-pointer">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Cicilan Progress Bar */}
                  {installment && (
                    <div className="mb-3 p-3 rounded-xl bg-black/40 border border-white/[0.04]">
                      <div className="flex justify-between items-center text-[10px] font-semibold mb-1.5">
                        <span className="text-zinc-400">
                          Angsuran: {installment.paidTenor} dari {installment.totalTenor} bulan
                        </span>
                        <span className="text-emerald-400 font-mono font-bold">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-2">
                        <span>Tagihan: <strong className="text-white">Rp{formatIDR(installment.monthlyAmount)}/bln</strong></span>
                        <span>Sisa: <strong className="text-white">{Math.max(0, installment.totalTenor - installment.paidTenor)} bln lagi</strong></span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-end justify-between pt-3 border-t border-white/[0.06]">
                    <div>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                        {debt.type === TransactionType.DEBT ? 'Sisa Hutang' : 'Sisa Tagihan'}
                      </p>
                      <p className="text-base font-bold tabular-nums text-white tracking-tight">
                        Rp{formatIDR(debt.amount)}
                      </p>
                    </div>

                    {!debt.isPaid && (
                      <div className="flex items-center gap-1.5">
                        {installment ? (
                          <button 
                            onClick={() => handlePayInstallment(debt, installment)} 
                            className="h-8 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold tracking-tight active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Bayar Angsuran</span>
                          </button>
                        ) : null}
                        <button 
                          onClick={() => setSelectedDebtForPayment(debt)} 
                          className={`h-8 px-3 rounded-lg border text-[11px] font-bold tracking-tight active:scale-95 transition-all cursor-pointer ${
                            installment 
                              ? 'bg-zinc-800 border-white/10 text-zinc-300 hover:text-white'
                              : 'bg-emerald-500 text-black border-transparent shadow-md shadow-emerald-500/20'
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
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-end md:justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-lg bg-[#0e121b] text-white rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-8 duration-300 border border-white/[0.08] overflow-hidden">
            <div className="w-10 h-1 bg-zinc-700/80 rounded-full mx-auto mt-3 mb-1" />
            
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-24">
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Pencatatan Keuangan</p>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {editingDebtId ? 'Edit Catatan' : isInstallmentMode ? 'Catat Cicilan Kartu Kredit' : 'Catat Hutang / Piutang'}
                  </h2>
                </div>
                <button 
                  onClick={() => setShowAddForm(false)} 
                  type="button"
                  className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Selector: Regular vs Installment */}
              <div className="flex bg-zinc-900 p-1 rounded-xl w-full max-w-sm mx-auto mb-6 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setIsInstallmentMode(true);
                    setFormData(prev => ({ ...prev, type: TransactionType.RECEIVABLE }));
                    const num = parseFloat(formData.amount) || 0;
                    const t = parseInt(installmentTenor, 10) || 6;
                    if (num > 0) setInstallmentMonthly(Math.round(num / t).toString());
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                    isInstallmentMode 
                      ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  💳 Cicilan Kartu Kredit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsInstallmentMode(false);
                    setFormData(prev => ({ ...prev, type: TransactionType.DEBT }));
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                    !isInstallmentMode 
                      ? 'bg-zinc-800 text-white font-bold shadow-sm' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🤝 Hutang Uang Kas
                </button>
              </div>

              {/* Big Amount Input */}
              <div className="mb-6 text-center">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  {isInstallmentMode ? 'Total Harga Barang / Tagihan KK' : 'Nominal Pinjaman'}
                </p>
                <div className="inline-flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-zinc-500">Rp</span>
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    value={formData.amount === '0' ? '' : formData.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} 
                    onChange={(e) => { 
                      const val = e.target.value.replace(/\./g, ''); 
                      if (/^\d*$/.test(val)) {
                        setFormData(prev => ({ ...prev, amount: val || '0' })); 
                        if (isInstallmentMode) {
                          const num = parseFloat(val) || 0;
                          const t = parseInt(installmentTenor, 10) || 6;
                          if (num > 0) setInstallmentMonthly(Math.round(num / t).toString());
                        }
                      }
                    }} 
                    className="bg-transparent border-none outline-none text-3xl font-extrabold tabular-nums text-center text-white tracking-tight" 
                    placeholder="0" 
                    style={{ width: `${Math.max(3, formData.amount.length + 0.5)}ch` }} 
                  />
                </div>
              </div>

              {!isInstallmentMode ? (
                <div className="flex bg-zinc-900 p-1 rounded-xl w-full max-w-xs mx-auto mb-6 border border-white/[0.08]">
                  <button 
                    type="button"
                    onClick={() => setFormData(d => ({ ...d, type: TransactionType.DEBT }))} 
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      formData.type === TransactionType.DEBT 
                        ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20' 
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Saya Berhutang
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData(d => ({ ...d, type: TransactionType.RECEIVABLE }))} 
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      formData.type === TransactionType.RECEIVABLE 
                        ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20' 
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Orang Berhutang
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6 flex items-start gap-2.5">
                  <span className="text-base leading-none">💳</span>
                  <p className="text-[11px] text-emerald-200/90 leading-relaxed font-medium">
                    <strong>Sumber: Kartu Kredit Anda</strong>. Saldo dompet Anda saat ini <strong>tidak akan terpotong</strong>. Saat debitur membayar tiap bulan, uang angsuran akan masuk ke dompet penampung Anda.
                  </p>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-3.5">
                <div className="flex gap-2.5">
                  <div className="flex-1 bg-zinc-900/80 rounded-xl p-3 border border-white/[0.08] flex flex-col gap-1 focus-within:border-emerald-500/40 transition-all">
                    <span className="text-[10px] font-semibold text-zinc-400">
                      {isInstallmentMode ? 'Nama Debitur / Yang Mencicil' : 'Nama Pihak Kedua'}
                    </span>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <input 
                        type="text" 
                        value={formData.title} 
                        onChange={e => setFormData({ ...formData, title: e.target.value })} 
                        placeholder={isInstallmentMode ? "Contoh: Budi Santoso" : "Nama teman / relasi"} 
                        className="bg-transparent border-none outline-none text-xs font-semibold text-white placeholder:text-zinc-600 w-full" 
                      />
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={pickContact} 
                    className="w-11 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-emerald-400 hover:text-emerald-300 active:scale-95 transition-all cursor-pointer flex-shrink-0"
                    title="Pilih dari Kontak"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {isInstallmentMode && (
                  <>
                    <div className="bg-zinc-900/80 rounded-xl p-3 border border-white/[0.08] flex flex-col gap-1 focus-within:border-emerald-500/40 transition-all">
                      <span className="text-[10px] font-semibold text-emerald-400">
                        Nama Barang / Keperluan Cicilan
                      </span>
                      <input 
                        type="text" 
                        value={installmentItem} 
                        onChange={e => setInstallmentItem(e.target.value)} 
                        placeholder="Contoh: iPhone 15 Pro 128GB / Laptop Asus" 
                        className="bg-transparent border-none outline-none text-xs font-semibold text-white placeholder:text-zinc-600 w-full" 
                      />
                    </div>

                    <div className="bg-zinc-900/80 rounded-xl p-3 border border-white/[0.08] flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-semibold text-zinc-400">
                          Pilihan Tenor Pembayaran
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          {installmentTenor} Bulan
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {['3', '6', '12', '24'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setInstallmentTenor(t);
                              const num = parseFloat(formData.amount) || 0;
                              if (num > 0) setInstallmentMonthly(Math.round(num / parseInt(t, 10)).toString());
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              installmentTenor === t 
                                ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20' 
                                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {t} Bln
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-zinc-900/80 rounded-xl p-3 border border-white/[0.08] flex flex-col gap-1 focus-within:border-emerald-500/40 transition-all">
                      <span className="text-[10px] font-semibold text-zinc-400">
                        Nominal Angsuran per Bulan (Bisa disesuaikan manual)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-500">Rp</span>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={installmentMonthly ? installmentMonthly.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''} 
                          onChange={e => {
                            const val = e.target.value.replace(/\./g, '');
                            if (/^\d*$/.test(val)) setInstallmentMonthly(val);
                          }} 
                          placeholder="0" 
                          className="bg-transparent border-none outline-none text-sm font-bold text-emerald-400 tabular-nums w-full" 
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-zinc-900/80 rounded-xl p-3 border border-white/[0.08] flex flex-col gap-1 focus-within:border-emerald-500/40 transition-all">
                    <span className="text-[10px] font-semibold text-zinc-400">
                      {isInstallmentMode ? 'Jatuh Tempo Tiap Bln' : 'Jatuh Tempo'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <input 
                        type="date" 
                        value={formData.dueDate} 
                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })} 
                        className="bg-transparent border-none outline-none text-xs font-semibold text-white [color-scheme:dark] w-full" 
                      />
                    </div>
                  </div>

                  <div className="bg-zinc-900/80 rounded-xl p-3 border border-white/[0.08] flex flex-col gap-1 focus-within:border-emerald-500/40 transition-all">
                    <span className="text-[10px] font-semibold text-zinc-400">
                      {isInstallmentMode ? 'Dompet Penampung' : 'Sumber Dompet'}
                    </span>
                    <div className="flex items-center gap-2">
                      <WalletIcon className="w-3.5 h-3.5 text-zinc-500" />
                      <select 
                        value={formData.walletId} 
                        onChange={e => setFormData({ ...formData, walletId: e.target.value })} 
                        className="bg-transparent border-none outline-none text-xs font-semibold text-white appearance-none w-full cursor-pointer"
                      >
                        {wallets.map(w => <option key={w.id} value={w.id} className="bg-zinc-900 text-white">{w.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sheet CTA Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#0e121b]/95 backdrop-blur-md border-t border-white/[0.08]">
              <button 
                onClick={handleSubmit} 
                type="button"
                className="w-full h-11 rounded-xl text-black font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all shadow-lg bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                {editingDebtId ? 'Perbarui Catatan' : 'Simpan Catatan'}
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
