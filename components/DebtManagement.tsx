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
}

const DebtManagement: React.FC<DebtManagementProps> = React.memo(({
  debts, wallets, onAddDebt, onUpdateDebt, onDeleteDebt, onBack, onAddTransaction
}) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
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

  const handleOpenAddForm = () => {
    setFormData({ title: '', phone: '', amount: '', dueDate: getLocalIsoDate(), type: TransactionType.DEBT, walletId: wallets[0]?.id || '' });
    setEditingDebtId(null);
    setIsSuccess(false);
    setShowAddForm(true);
  };

  const handleOpenEditForm = (debt: Debt) => {
    setFormData({ title: debt.title, phone: debt.phone || '', amount: debt.initialAmount.toString(), dueDate: debt.dueDate, type: debt.type, walletId: debt.walletId });
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
    setIsSuccess(true);
    setTimeout(() => {
      if (editingDebtId) {
        const existingDebt = debts.find(d => d.id === editingDebtId);
        if (existingDebt) {
          const paymentsMade = existingDebt.initialAmount - existingDebt.amount;
          const newAmount = Math.max(0, numericAmount - paymentsMade);
          onUpdateDebt({ ...existingDebt, title: formData.title, phone: formData.phone || undefined, initialAmount: numericAmount, amount: newAmount, dueDate: formData.dueDate, type: formData.type as any, isPaid: newAmount <= 0, walletId: formData.walletId });
        }
      } else {
        const newDebt: Debt = { id: Date.now().toString(), title: formData.title, phone: formData.phone || undefined, amount: numericAmount, initialAmount: numericAmount, dueDate: formData.dueDate, type: formData.type as any, isPaid: false, walletId: formData.walletId };
        onAddDebt(newDebt);
        onAddTransaction({ amount: newDebt.amount, type: newDebt.type, category: 'Loan', description: `Position: ${newDebt.title}`, date: new Date().toISOString(), walletId: newDebt.walletId });
      }
      setShowAddForm(false);
    }, 1200);
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
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-32 animate-in fade-in duration-500 overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-[100] px-6 pt-10 pb-4 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-foreground active:scale-90 transition-all border border-border">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t('debt.performance')}</h2>
          <button onClick={handleOpenAddForm} className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm active:scale-95 transition-all">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex justify-center">
          <div className="bg-card p-1.5 rounded-[20px] flex items-center gap-1 border border-border/50 shadow-sm">
            {['ACTIVE', 'HISTORY'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)} 
                className={`px-6 py-2 rounded-[16px] text-[10px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(`debt.${tab.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-6 pt-44 space-y-8">
        <section className="rounded-[32px] p-8 bg-card border border-border/50 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 relative z-10">{t('debt.net_debt_position')}</p>
          <h1 className={`text-4xl font-black tracking-tighter tabular-nums relative z-10 ${totals.netValue >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {totals.netValue >= 0 ? '+' : ''}Rp{formatIDR(Math.abs(totals.netValue))}
          </h1>
          <div className="grid grid-cols-2 gap-6 mt-8 pt-8 border-t border-border/50 relative z-10">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('debt.total_debt')}</p>
              <p className="text-[15px] font-bold text-foreground">Rp{formatIDR(totals.hutang)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('debt.receivable')}</p>
              <p className="text-[15px] font-bold text-foreground">Rp{formatIDR(totals.piutang)}</p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          {debts.filter(d => activeTab === 'ACTIVE' ? !d.isPaid : d.isPaid).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(debt => (
            <div key={debt.id} className="p-5 rounded-[28px] border border-border/50 bg-card hover:border-primary/20 transition-all shadow-sm">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${!debt.isPaid && new Date(debt.dueDate) < new Date() ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-muted/50 text-muted-foreground border-border'}`}>
                    <User className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[14px] font-bold text-foreground truncate uppercase tracking-tight">{debt.title}</h4>
                    <div className="flex items-center gap-1.5 opacity-60">
                      <Calendar className="w-3 h-3" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">{new Date(debt.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleOpenEditForm(debt)} className="text-muted-foreground/30 p-2 hover:text-foreground transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-end justify-between pt-4 border-t border-border/50">
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1">{debt.type === TransactionType.DEBT ? 'Due Amount' : 'Receivable Balance'}</p>
                  <p className="text-[17px] font-bold tabular-nums text-foreground tracking-tight">Rp{formatIDR(debt.amount)}</p>
                </div>
                {!debt.isPaid && (
                  <button onClick={() => setSelectedDebtForPayment(debt)} className="h-10 px-6 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/20">
                    Settle
                  </button>
                )}
              </div>
            </div>
          ))}
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
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 bg-card rounded-xl p-4 border border-border/50 flex flex-col gap-1 focus-within:border-primary/40 transition-all">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Counterparty Name</span>
                    <div className="flex items-center gap-3">
                      <User className="w-3.5 h-3.5 text-muted-foreground/40" />
                      <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="John Doe..." className="bg-transparent border-none outline-none text-[13px] font-bold text-foreground placeholder:text-muted-foreground/20 w-full" />
                    </div>
                  </div>
                  <button type="button" onClick={pickContact} className="w-12 rounded-xl bg-muted/30 border border-border flex items-center justify-center text-primary active:scale-95 transition-all">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card rounded-xl p-4 border border-border/50 flex flex-col gap-1 focus-within:border-primary/40 transition-all">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Due Date</span>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
                      <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="bg-transparent border-none outline-none text-[13px] font-bold text-foreground [color-scheme:dark] w-full" />
                    </div>
                  </div>
                  <div className="bg-card rounded-xl p-4 border border-border/50 flex flex-col gap-1 focus-within:border-primary/40 transition-all">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Account</span>
                    <div className="flex items-center gap-3">
                      <WalletIcon className="w-3.5 h-3.5 text-muted-foreground/40" />
                      <select value={formData.walletId} onChange={e => setFormData({ ...formData, walletId: e.target.value })} className="bg-transparent border-none outline-none text-[13px] font-bold text-foreground appearance-none w-full">
                        {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
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
