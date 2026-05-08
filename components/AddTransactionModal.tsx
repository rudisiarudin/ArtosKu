import React, { useState, useEffect, useRef } from 'react';
import { TransactionType, Category, Wallet } from '../types';
import { formatIDR, vibrate, getLocalIsoString } from '@/lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { 
  ChevronRight, X, Sparkles, Check, Wallet as WalletIcon, Calendar, 
  ArrowUpCircle, ArrowDownCircle, Utensils, Car, Receipt, Gamepad2, 
  ShoppingBag, HeartPulse, Banknote, TrendingUp, Gift, Zap, Package,
  RefreshCw
} from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (t: Omit<any, 'id'>) => void;
  wallets: Wallet[];
  transactions: any[];
  debts: any[];
  userName: string;
  prefilledData?: any;
  theme: 'light' | 'dark';
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = React.memo(({ 
  isOpen, onClose, onAdd, wallets, transactions, debts, userName, prefilledData, theme 
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    amount: '0',
    type: TransactionType.EXPENSE,
    category: 'Makan' as Category,
    date: getLocalIsoString(),
    description: '',
    walletId: wallets[0]?.id || ''
  });
  
  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  
  const dateInputRef = useRef<HTMLInputElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  const CATEGORY_DATA: Record<string, { icon: React.ReactNode; label: string }> = {
    'Makan': { icon: <Utensils className="w-3.5 h-3.5" />, label: 'Food' },
    'Transport': { icon: <Car className="w-3.5 h-3.5" />, label: 'Transport' },
    'Tagihan': { icon: <Receipt className="w-3.5 h-3.5" />, label: 'Bills' },
    'Hiburan': { icon: <Gamepad2 className="w-3.5 h-3.5" />, label: 'Play' },
    'Shop': { icon: <ShoppingBag className="w-3.5 h-3.5" />, label: 'Shop' },
    'Kesehatan': { icon: <HeartPulse className="w-3.5 h-3.5" />, label: 'Health' },
    'Gaji': { icon: <Banknote className="w-3.5 h-3.5" />, label: 'Salary' },
    'Investasi': { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Invest' },
    'Hadiah': { icon: <Gift className="w-3.5 h-3.5" />, label: 'Gift' },
    'Bonus': { icon: <Zap className="w-3.5 h-3.5" />, label: 'Bonus' },
    'Others': { icon: <Package className="w-3.5 h-3.5" />, label: 'Misc' }
  };

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      document.body.classList.add('modal-open');
      if (prefilledData) {
        setFormData(prev => ({
          ...prev,
          type: prefilledData.type || TransactionType.EXPENSE,
          category: prefilledData.category || 'Makan',
          description: prefilledData.description || '',
          walletId: prefilledData.walletId || wallets[0]?.id || ''
        }));
      }
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen, prefilledData, wallets]);

  const handleAiSmartFill = async () => {
    if (!aiInput.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiFeedback(null);

    try {
      // Use standard import if possible, or ensure dynamic is safe
      const aiModule = await import('../lib/ai');
      const response = await aiModule.sendAiMessage(
        [{ role: 'user', content: aiInput }],
        transactions,
        wallets,
        debts,
        userName,
        'id'
      );

      if (response && response.includes(':::RECORD_TRANSACTION:::')) {
        try {
          const parts = response.split(':::RECORD_TRANSACTION:::');
          const textContent = parts[0].trim();
          const jsonPart = parts[1].split(':::END_RECORD:::')[0].trim();
          const txData = JSON.parse(jsonPart);

          if (txData && typeof txData.amount !== 'undefined') {
            setFormData(prev => ({
              ...prev,
              amount: txData.amount.toString(),
              type: txData.type || prev.type,
              category: txData.category || prev.category,
              description: txData.description || prev.description,
              walletId: txData.walletId || prev.walletId
            }));
            
            setAiFeedback(textContent || "Information synchronized.");
            setAiInput('');
            vibrate(10);
          } else {
            setAiFeedback("AI returned incomplete data.");
          }
        } catch (jsonErr) {
          console.error('AI JSON Parse Error:', jsonErr);
          setAiFeedback("AI response format was invalid. Try again.");
        }
      } else {
        setAiFeedback(response || "No actionable data found.");
      }
    } catch (err) {
      console.error('AI General Error:', err);
      setAiFeedback("Service unavailable. Please check your connection.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = () => {
    const amount = parseFloat(formData.amount);
    if (amount <= 0 || !formData.walletId) return;

    setIsSuccess(true);
    vibrate(20);
    
    setTimeout(() => {
      onAdd({ ...formData, amount, description: formData.description.trim() || 'Untitled' });
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-end md:justify-center bg-black/60 backdrop-blur-[2px] animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      
      {isSuccess && (
        <div className="absolute inset-0 z-[1100] bg-[#0c0c0e] flex flex-col items-center justify-center animate-fade-in px-8 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 animate-scale-in">
              <i className="fa-solid fa-check text-3xl text-emerald-500" />
            </div>
            {/* Success particles or subtle glow could go here */}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Confirmed</h2>
          <p className="text-white/40 text-sm font-medium tracking-wide">Transaction recorded with precision.</p>
        </div>
      )}

      <div className="relative w-full max-w-lg bg-background rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[96vh] animate-modal-slide border border-border overflow-hidden">
        
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-4 mb-2" />

        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-40">
          
          <div className="flex items-center justify-between py-6 mb-2">
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">New Entry</p>
              <h2 className="text-xl font-black text-foreground tracking-tight">Record Transaction</h2>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-foreground active:scale-90 transition-all border border-border">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-8">
            <div className={`relative flex items-center gap-4 bg-zinc-900 rounded-[24px] px-5 py-4 transition-all duration-500 ${isAiLoading ? 'ring-2 ring-primary/40' : 'focus-within:ring-2 focus-within:ring-primary/20'}`}>
              <div className="flex-1 flex items-center gap-3">
                <Sparkles className={`w-5 h-5 ${isAiLoading ? 'animate-pulse text-primary' : 'text-primary/40'}`} />
                <input 
                  ref={aiInputRef}
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSmartFill()}
                  placeholder="Smart Fill: 'Kopi 25rb'..."
                  className="w-full bg-transparent border-none outline-none text-[15px] font-bold text-foreground placeholder:text-muted-foreground/10"
                />
              </div>
              <button 
                onClick={handleAiSmartFill}
                disabled={!aiInput.trim() || isAiLoading}
                className={`size-10 rounded-xl flex items-center justify-center transition-all ${
                  aiInput.trim() ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-white/5 text-white/10'
                }`}
              >
                {isAiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
            {aiFeedback && (
              <div className="mt-4 px-5 py-4 bg-primary/5 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                <p className="text-[11px] font-bold text-primary/60 leading-relaxed italic uppercase tracking-tight">{aiFeedback}</p>
              </div>
            )}
          </div>

          <div className="mb-10 text-center">
            <div className="flex flex-col items-center justify-center py-8 group relative overflow-hidden">
              <div className="relative z-10 flex items-center justify-center w-full">
                <input 
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={formData.amount === '0' ? '' : formData.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\./g, '');
                    if (/^\d*$/.test(val)) {
                      setFormData(prev => ({ ...prev, amount: val || '0' }));
                      vibrate(5);
                    }
                  }}
                  className={`bg-transparent border-none outline-none font-black tabular-nums text-center transition-all tracking-[-0.05em] leading-none ${
                    formData.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-foreground'
                  }`}
                  style={{ fontSize: 'clamp(48px, 15vw, 96px)', width: '100%', height: 'auto' }}
                  placeholder="0"
                />
              </div>
              <span className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.4em] mt-4">Total Amount</span>
            </div>
            
            <div className="flex bg-zinc-900 p-1 rounded-2xl w-fit mx-auto shadow-inner relative">
              <div 
                className={`absolute inset-1 w-[calc(50%-4px)] rounded-xl transition-all duration-500 ease-out shadow-lg ${
                  formData.type === TransactionType.EXPENSE ? 'translate-x-0 bg-rose-500' : 'translate-x-[calc(100%+8px)] bg-emerald-500'
                }`}
              />
              <button 
                onClick={() => { setFormData(d => ({ ...d, type: TransactionType.EXPENSE })); vibrate(5); }}
                className={`relative z-10 px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-colors duration-300 ${
                  formData.type === TransactionType.EXPENSE ? 'text-white' : 'text-muted-foreground/40'
                }`}
              >
                Expense
              </button>
              <button 
                onClick={() => { setFormData(d => ({ ...d, type: TransactionType.INCOME })); vibrate(5); }}
                className={`relative z-10 px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-colors duration-300 ${
                  formData.type === TransactionType.INCOME ? 'text-white' : 'text-muted-foreground/40'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-[24px] p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all" onClick={() => setIsWalletPickerOpen(!isWalletPickerOpen)}>
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-black/40 flex items-center justify-center text-primary shadow-inner">
                  <WalletIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[14px] font-black text-foreground tracking-tight">{wallets.find(w => w.id === formData.walletId)?.name || 'Select Wallet'}</p>
                  <p className="text-[8px] font-black text-muted-foreground/20 uppercase tracking-[0.1em] mt-0.5">Source of Funds</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground/10 transition-transform duration-500 ${isWalletPickerOpen ? 'rotate-90' : ''}`} />
            </div>

            {isWalletPickerOpen && (
              <div className="grid grid-cols-1 gap-1 animate-fade-in px-1">
                {wallets.map(w => (
                  <button 
                    key={w.id} 
                    onClick={() => { setFormData(prev => ({ ...prev, walletId: w.id })); setIsWalletPickerOpen(false); }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all ${formData.walletId === w.id ? 'bg-emerald-500/5 text-emerald-500' : 'text-white/30'}`}
                  >
                    <span className="text-[12px] font-bold">{w.name}</span>
                    <span className="text-[11px] font-medium tabular-nums opacity-40">Rp {formatIDR(w.balance.toString())}</span>
                  </button>
                ))}
              </div>
            )}

            <div>
              <h3 className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em] mb-4 px-1">Classification</h3>
              <div className="flex flex-wrap gap-2">
                {Object.keys(CATEGORY_DATA)
                  .filter(cat => {
                    const expenseCats = ['Makan', 'Transport', 'Shop', 'Hiburan', 'Kesehatan', 'Tagihan', 'Others'];
                    const incomeCats = ['Gaji', 'Investasi', 'Hadiah', 'Bonus', 'Others'];
                    return formData.type === TransactionType.INCOME ? incomeCats.includes(cat) : expenseCats.includes(cat);
                  })
                  .map(cat => (
                    <button 
                      key={cat}
                      onClick={() => { setFormData(prev => ({ ...prev, category: cat as any })); vibrate(5); }}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-[12px] font-black tracking-tight transition-all active:scale-95 ${
                        formData.category === cat 
                          ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105 z-10' 
                          : 'bg-zinc-900 text-muted-foreground/40 hover:text-muted-foreground'
                      }`}
                    >
                      <span className={`${formData.category === cat ? 'text-primary-foreground' : 'text-primary'}`}>
                        {CATEGORY_DATA[cat].icon}
                      </span>
                      {CATEGORY_DATA[cat].label}
                    </button>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1 focus-within:border-primary/40">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Memo</span>
                <input type="text" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="..." className="bg-transparent border-none outline-none text-[13px] font-semibold text-foreground placeholder:text-muted-foreground/20" />
              </div>
              <div onClick={() => (dateInputRef.current as any)?.showPicker?.()} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1 cursor-pointer active:scale-95 transition-all">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</span>
                <span className="text-[13px] font-semibold text-foreground truncate">{new Date(formData.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                <input ref={dateInputRef} type="date" value={formData.date.split('T')[0]} onChange={e => setFormData(prev => ({ ...prev, date: `${e.target.value}T${new Date().toISOString().split('T')[1]}` }))} className="absolute opacity-0 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background/90 backdrop-blur-md border-t border-border/40">
          <button 
            onClick={handleSubmit}
            className="w-full h-12 rounded-xl bg-[#10B981] text-white font-black text-[12px] uppercase tracking-[0.2em] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
          >
            Confirm Transaction
          </button>
        </div>
      </div>
    </div>
  );
});

export default AddTransactionModal;
