import React, { useState, useEffect, useRef } from 'react';
import { TransactionType, Category, Wallet } from '../types';
import { formatIDR, vibrate, getLocalIsoString } from '@/lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { 
  ChevronRight, X, Sparkles, Check, Wallet as WalletIcon, Calendar, 
  Utensils, Car, Receipt, Gamepad2, ShoppingBag, HeartPulse, Banknote, 
  TrendingUp, Gift, Zap, Package, RefreshCw, ChevronDown
} from 'lucide-react';
import { WalletLogo } from './WalletLogo';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';

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
    'Makan': { icon: <Utensils className="size-3.5 shrink-0" />, label: 'Food' },
    'Transport': { icon: <Car className="size-3.5 shrink-0" />, label: 'Transport' },
    'Tagihan': { icon: <Receipt className="size-3.5 shrink-0" />, label: 'Bills' },
    'Hiburan': { icon: <Gamepad2 className="size-3.5 shrink-0" />, label: 'Play' },
    'Shop': { icon: <ShoppingBag className="size-3.5 shrink-0" />, label: 'Shop' },
    'Kesehatan': { icon: <HeartPulse className="size-3.5 shrink-0" />, label: 'Health' },
    'Gaji': { icon: <Banknote className="size-3.5 shrink-0" />, label: 'Salary' },
    'Investasi': { icon: <TrendingUp className="size-3.5 shrink-0" />, label: 'Invest' },
    'Hadiah': { icon: <Gift className="size-3.5 shrink-0" />, label: 'Gift' },
    'Bonus': { icon: <Zap className="size-3.5 shrink-0" />, label: 'Bonus' },
    'Others': { icon: <Package className="size-3.5 shrink-0" />, label: 'Misc' }
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end md:justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      {isSuccess && (
        <div className="absolute inset-0 z-[60] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center px-8 text-center animate-in zoom-in-95 duration-200">
          <div className="size-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
            <Check className="size-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Confirmed</h2>
          <p className="text-muted-foreground text-sm">Transaction recorded with precision.</p>
        </div>
      )}

      {/* Main Bottom Sheet Container with strict vertical flex hierarchy */}
      <div className="relative w-full max-w-lg bg-background rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] md:max-h-[88vh] border border-border overflow-hidden z-10">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mt-3 mb-1 shrink-0 md:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-border/40">
          <div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">New Entry</p>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Record Transaction</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="size-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </Button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-6">
          
          {/* Smart Fill Bar */}
          <div>
            <div className={cn(
              "relative flex items-center gap-3 bg-muted/70 hover:bg-muted rounded-2xl px-4 py-3 border border-border/60 transition-all",
              isAiLoading ? 'ring-2 ring-primary/40' : 'focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40'
            )}>
              <div className="flex-1 flex items-center gap-2.5">
                <Sparkles className={cn("size-4 shrink-0", isAiLoading ? 'animate-pulse text-primary' : 'text-primary')} />
                <input 
                  ref={aiInputRef}
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSmartFill()}
                  placeholder="Smart Fill: 'Kopi 25rb'..."
                  className="w-full bg-transparent border-none outline-none text-sm font-medium text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button 
                size="icon"
                onClick={handleAiSmartFill}
                disabled={!aiInput.trim() || isAiLoading}
                className="size-8 rounded-lg shrink-0"
              >
                {isAiLoading ? <RefreshCw className="size-3.5 animate-spin" /> : <ChevronRight className="size-4" />}
              </Button>
            </div>
            {aiFeedback && (
              <div className="mt-2.5 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl">
                <p className="text-xs font-medium text-primary leading-relaxed">{aiFeedback}</p>
              </div>
            )}
          </div>

          {/* Amount Hero Section */}
          <div className="text-center py-2">
            <div className="flex flex-col items-center justify-center">
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
                  className={cn(
                    "bg-transparent border-none outline-none font-extrabold tabular-nums text-center tracking-tight leading-none",
                    formData.type === TransactionType.INCOME ? 'text-primary' : 'text-foreground'
                  )}
                  style={{ fontSize: 'clamp(44px, 12vw, 76px)', width: '100%', height: 'auto' }}
                  placeholder="0"
                />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-2">Total Amount</span>
            </div>
            
            {/* Income / Expense Segmented Control */}
            <div className="flex bg-muted p-1 rounded-xl w-fit mx-auto mt-4 border border-border/60">
              <Button 
                type="button"
                variant={formData.type === TransactionType.EXPENSE ? "destructive" : "ghost"}
                size="sm"
                onClick={() => { setFormData(d => ({ ...d, type: TransactionType.EXPENSE })); vibrate(5); }}
                className={cn("px-6 font-semibold text-xs rounded-lg transition-all", formData.type === TransactionType.EXPENSE && "shadow-sm")}
              >
                Expense
              </Button>
              <Button 
                type="button"
                variant={formData.type === TransactionType.INCOME ? "default" : "ghost"}
                size="sm"
                onClick={() => { setFormData(d => ({ ...d, type: TransactionType.INCOME })); vibrate(5); }}
                className={cn("px-6 font-semibold text-xs rounded-lg transition-all", formData.type === TransactionType.INCOME && "shadow-sm")}
              >
                Income
              </Button>
            </div>
          </div>

          {/* Wallet Selector Card */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Source of Funds</Label>
            <Card 
              className="border border-border bg-card cursor-pointer hover:border-primary/40 active:scale-[0.99] transition-all shadow-sm"
              onClick={() => setIsWalletPickerOpen(!isWalletPickerOpen)}
            >
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                    <WalletLogo wallet={wallets.find(w => w.id === formData.walletId) || {} as any} size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground tracking-tight">{wallets.find(w => w.id === formData.walletId)?.name || 'Select Wallet'}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      Rp {formatIDR((wallets.find(w => w.id === formData.walletId)?.balance || 0).toString())}
                    </p>
                  </div>
                </div>
                <ChevronDown className={cn("size-4 text-muted-foreground transition-transform duration-200", isWalletPickerOpen ? 'rotate-180' : '')} />
              </CardContent>
            </Card>

            {isWalletPickerOpen && (
              <div className="grid grid-cols-1 gap-1.5 p-1.5 bg-muted/40 border border-border rounded-xl mt-1 animate-in fade-in-50 duration-150">
                {wallets.filter(w => w.code !== 'STOCKS').map(w => (
                  <Button 
                    key={w.id} 
                    variant={formData.walletId === w.id ? "default" : "ghost"}
                    onClick={() => { setFormData(prev => ({ ...prev, walletId: w.id })); setIsWalletPickerOpen(false); }}
                    className="w-full flex items-center justify-between p-3 rounded-lg h-auto text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <WalletLogo wallet={w} size={16} />
                      <span className="text-xs font-semibold">{w.name}</span>
                    </div>
                    <span className="text-xs font-medium tabular-nums opacity-80">Rp {formatIDR(w.balance.toString())}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Classification Section (Category Chips) */}
          <div className="space-y-2.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Classification</Label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CATEGORY_DATA)
                .filter(cat => {
                  const expenseCats = ['Makan', 'Transport', 'Shop', 'Hiburan', 'Kesehatan', 'Tagihan', 'Others'];
                  const incomeCats = ['Gaji', 'Investasi', 'Hadiah', 'Bonus', 'Others'];
                  return formData.type === TransactionType.INCOME ? incomeCats.includes(cat) : expenseCats.includes(cat);
                })
                .map(cat => {
                  const isSelected = formData.category === cat;
                  return (
                    <Button 
                      key={cat}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setFormData(prev => ({ ...prev, category: cat as any })); vibrate(5); }}
                      className={cn(
                        "h-9 px-3.5 rounded-xl font-semibold text-xs gap-1.5 transition-all",
                        isSelected 
                          ? 'bg-primary text-primary-foreground shadow-sm scale-105' 
                          : 'bg-card hover:bg-muted text-foreground border-border'
                      )}
                    >
                      {CATEGORY_DATA[cat].icon}
                      <span>{CATEGORY_DATA[cat].label}</span>
                    </Button>
                  );
                })}
            </div>
          </div>

          {/* Details (Memo & Date) */}
          <div className="grid grid-cols-2 gap-3 pb-2">
            <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col gap-1 focus-within:border-primary/50 transition-all shadow-sm">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Memo / Note</Label>
              <input 
                type="text" 
                value={formData.description} 
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                placeholder="Add detail..." 
                className="bg-transparent border-none outline-none text-xs font-medium text-foreground placeholder:text-muted-foreground" 
              />
            </div>
            
            <div 
              onClick={() => (dateInputRef.current as any)?.showPicker?.()} 
              className="bg-card border border-border rounded-xl p-3.5 flex flex-col gap-1 cursor-pointer hover:border-primary/50 active:scale-95 transition-all shadow-sm relative"
            >
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</Label>
              <span className="text-xs font-semibold text-foreground">
                {new Date(formData.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <input 
                ref={dateInputRef} 
                type="date" 
                value={formData.date.split('T')[0]} 
                onChange={e => setFormData(prev => ({ ...prev, date: `${e.target.value}T${new Date().toISOString().split('T')[1]}` }))} 
                className="absolute inset-0 opacity-0 pointer-events-none" 
              />
            </div>
          </div>

        </div>

        {/* Sticky Action Footer (Non-overlapping flex item) */}
        <div className="p-4 sm:p-5 bg-background/95 backdrop-blur-md border-t border-border shrink-0 z-10">
          <Button 
            onClick={handleSubmit}
            className="w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md"
            disabled={!formData.amount || formData.amount === '0'}
          >
            Confirm Transaction
          </Button>
        </div>

      </div>
    </div>
  );
});

export default AddTransactionModal;
