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
import { WalletLogo } from './WalletLogo';

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
    walletId: wallets.filter(w => w.code !== 'STOCKS')[0]?.id || ''
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
      const defaultWalletId = wallets.filter(w => w.code !== 'STOCKS')[0]?.id || '';
      setFormData(prev => ({
        ...prev,
        amount: '0',
        type: prefilledData?.type || TransactionType.EXPENSE,
        category: prefilledData?.category || 'Makan',
        description: prefilledData?.description || '',
        walletId: prefilledData?.walletId || defaultWalletId
      }));
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

      <div className="relative w-full max-w-lg bg-[#0e121b] text-white rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[96vh] animate-modal-slide border border-white/[0.08] overflow-hidden">
        
        <div className="w-10 h-1 bg-zinc-700/80 rounded-full mx-auto mt-3 mb-1" />

        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-28">
          
          <div className="flex items-center justify-between py-4 mb-2">
            <div>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Transaksi Baru</p>
              <h2 className="text-lg font-bold text-white tracking-tight">Catat Transaksi</h2>
            </div>
            <button 
              onClick={onClose} 
              type="button"
              className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* AI Smart Fill Bar */}
          <div className="mb-5">
            <div className={`relative flex items-center gap-3 bg-zinc-900/90 rounded-2xl px-4 py-3 border border-white/[0.08] transition-all duration-300 ${isAiLoading ? 'ring-2 ring-emerald-500/40' : 'focus-within:border-emerald-500/50'}`}>
              <div className="flex-1 flex items-center gap-2.5">
                <Sparkles className={`w-4 h-4 ${isAiLoading ? 'animate-pulse text-emerald-400' : 'text-emerald-400/60'}`} />
                <input 
                  ref={aiInputRef}
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSmartFill()}
                  placeholder="Ketik cepat: 'Kopi 25rb' atau 'Gaji 10jt'..."
                  className="w-full bg-transparent border-none outline-none text-xs font-semibold text-white placeholder:text-zinc-600"
                />
              </div>
              <button 
                onClick={handleAiSmartFill}
                disabled={!aiInput.trim() || isAiLoading}
                type="button"
                className={`h-8 px-3 rounded-xl flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
                  aiInput.trim() ? 'bg-emerald-500 text-black shadow-md' : 'bg-white/5 text-zinc-600'
                }`}
              >
                {isAiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Isi</span>}
              </button>
            </div>
            {aiFeedback && (
              <div className="mt-2.5 px-4 py-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 animate-in slide-in-from-top-2 duration-200">
                <p className="text-[11px] font-medium text-emerald-300 leading-relaxed italic">{aiFeedback}</p>
              </div>
            )}
          </div>

          {/* Type Toggle: Pengeluaran vs Pemasukan */}
          <div className="flex bg-zinc-900 p-1 rounded-xl w-full max-w-xs mx-auto mb-4 border border-white/[0.08]">
            <button 
              type="button"
              onClick={() => { setFormData(d => ({ ...d, type: TransactionType.EXPENSE })); vibrate(5); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                formData.type === TransactionType.EXPENSE ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pengeluaran
            </button>
            <button 
              type="button"
              onClick={() => { setFormData(d => ({ ...d, type: TransactionType.INCOME })); vibrate(5); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                formData.type === TransactionType.INCOME ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pemasukan
            </button>
          </div>

          {/* Clean Amount Card */}
          <div className="mb-5 p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] text-center max-w-sm mx-auto">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Nominal {formData.type === TransactionType.EXPENSE ? 'Pengeluaran' : 'Pemasukan'}
            </p>
            <div className="inline-flex items-baseline justify-center gap-1.5">
              <span className="text-base font-bold text-zinc-500">Rp</span>
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
                className={`bg-transparent border-none outline-none text-3xl font-extrabold tabular-nums text-center tracking-tight ${
                  formData.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-white'
                }`}
                placeholder="0"
                style={{ width: `${Math.max(3, formData.amount.length + 0.5)}ch` }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-[24px] p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all" onClick={() => setIsWalletPickerOpen(!isWalletPickerOpen)}>
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-black/40 flex items-center justify-center text-primary shadow-inner">
                  <WalletLogo wallet={wallets.find(w => w.id === formData.walletId) || {} as any} size={20} />
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
                {wallets.filter(w => w.code !== 'STOCKS').map(w => (
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

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-zinc-900/80 border border-white/[0.08] rounded-xl p-3 flex flex-col gap-1 focus-within:border-emerald-500/40">
                <span className="text-[10px] font-semibold text-zinc-400">Catatan</span>
                <input type="text" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Contoh: Makan siang..." className="bg-transparent border-none outline-none text-xs font-semibold text-white placeholder:text-zinc-600" />
              </div>
              <div onClick={() => (dateInputRef.current as any)?.showPicker?.()} className="bg-zinc-900/80 border border-white/[0.08] rounded-xl p-3 flex flex-col gap-1 cursor-pointer active:scale-95 transition-all">
                <span className="text-[10px] font-semibold text-zinc-400">Tanggal</span>
                <span className="text-xs font-semibold text-white truncate">{new Date(formData.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                <input ref={dateInputRef} type="date" value={formData.date.split('T')[0]} onChange={e => setFormData(prev => ({ ...prev, date: `${e.target.value}T${new Date().toISOString().split('T')[1]}` }))} className="absolute opacity-0 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sheet CTA Button */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,16px))] bg-[#0e121b]/98 backdrop-blur-md border-t border-white/[0.08]">
          <button 
            onClick={handleSubmit}
            type="button"
            className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            Simpan Transaksi
          </button>
        </div>
      </div>
    </div>
  );
});

export default AddTransactionModal;
