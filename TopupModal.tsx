import React, { useState, useEffect } from 'react';
import { TransactionType, Category, Wallet } from '../types';
import { formatIDR, vibrate, getLocalIsoString } from '@/lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { X, Check, ArrowRight, Building2 } from 'lucide-react';
import { WalletLogo } from './WalletLogo';

interface TopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (t: any) => void;
  wallets: Wallet[];
  prefilledWalletId?: string;
  onTransfer?: (fromId: string, toId: string, amount: number, description: string) => Promise<void>;
  theme: 'light' | 'dark';
  title?: string;
  defaultDescription?: string;
}

const TopupModal: React.FC<TopupModalProps> = React.memo(({ 
  isOpen, onClose, onAdd, onTransfer, wallets, prefilledWalletId, theme, title, defaultDescription 
}) => {
  const { t } = useLanguage();
  const [sourceWalletId, setSourceWalletId] = useState<string | 'EXTERNAL'>('EXTERNAL');
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    amount: '0',
    type: TransactionType.INCOME,
    category: 'Topup' as Category,
    date: getLocalIsoString(),
    description: '',
    walletId: ''
  });

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setFormData({
        amount: '0',
        type: TransactionType.INCOME,
        category: 'Topup' as Category,
        date: getLocalIsoString(),
        description: defaultDescription || '',
        walletId: prefilledWalletId || wallets.filter(w => w.code !== 'STOCKS')[0]?.id || ''
      });
      setSourceWalletId('EXTERNAL');
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [isOpen, prefilledWalletId, wallets, defaultDescription]);

  const handleSubmit = () => {
    const numericAmount = parseFloat(formData.amount);
    if (numericAmount <= 0 || !formData.walletId) return;

    setIsSuccess(true);
    vibrate([10, 30, 10]);

    setTimeout(() => {
      if (sourceWalletId !== 'EXTERNAL' && onTransfer && formData.walletId) {
        onTransfer(sourceWalletId, formData.walletId, numericAmount, formData.description || 'Quick Deposit');
      } else {
        onAdd({
          ...formData,
          amount: numericAmount,
          description: formData.description.trim() || 'Top Up'
        });
      }
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
          <h2 className="text-xl font-bold text-foreground mb-2">Success!</h2>
          <p className="text-muted-foreground text-sm">Funds have been added.</p>
        </div>
      )}

      {/* Main Bottom Sheet Container with strict vertical flex hierarchy */}
      <div className="relative w-full max-w-lg bg-background rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] md:max-h-[88vh] border border-border overflow-hidden z-10">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mt-3 mb-1 shrink-0 md:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-border/40">
          <div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Funding Entry</p>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{title || 'Top Up'}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="size-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </Button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-6">
          
          {/* Amount Hero Section */}
          <div className="text-center py-4">
            <div className="flex flex-col items-center justify-center">
              <div className="relative z-10 flex items-center justify-center w-full">
                <input 
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={formData.amount === '0' ? '' : formData.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\./g, '');
                    if (/^\d*$/.test(val)) setFormData(prev => ({ ...prev, amount: val || '0' }));
                  }}
                  className="bg-transparent border-none outline-none font-extrabold tabular-nums text-center tracking-tight leading-none text-primary"
                  style={{ fontSize: 'clamp(44px, 12vw, 76px)', width: '100%', height: 'auto' }}
                  placeholder="0"
                />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-2">Nominal Deposit</span>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Source of Funds */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Source of Funds</Label>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <Button
                  type="button"
                  variant={sourceWalletId === 'EXTERNAL' ? "default" : "outline"}
                  onClick={() => setSourceWalletId('EXTERNAL')}
                  className={cn("shrink-0 gap-2 h-10 px-4 rounded-xl font-semibold text-xs", sourceWalletId === 'EXTERNAL' && "shadow-sm")}
                >
                  <Building2 className="size-4" />
                  External Bank / Cash
                </Button>
                {wallets.filter(w => w.id !== formData.walletId && w.code !== 'STOCKS').map((w) => (
                  <Button
                    key={w.id}
                    type="button"
                    variant={sourceWalletId === w.id ? "default" : "outline"}
                    onClick={() => setSourceWalletId(w.id)}
                    className={cn("shrink-0 gap-2 h-10 px-4 rounded-xl font-semibold text-xs", sourceWalletId === w.id && "shadow-sm")}
                  >
                    <WalletLogo wallet={w} size={16} />
                    {w.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Destination Wallet */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Destination Wallet</Label>
              <div className="grid grid-cols-1 gap-2.5">
                {wallets.filter(w => w.code !== 'STOCKS').map((w) => {
                  const isSelected = formData.walletId === w.id;
                  return (
                    <Card 
                      key={w.id}
                      className={cn(
                        "cursor-pointer transition-all border shadow-sm active:scale-[0.99]",
                        isSelected 
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30' 
                          : 'border-border bg-card hover:bg-muted/50'
                      )}
                      onClick={() => setFormData(d => ({ ...d, walletId: w.id }))}
                    >
                      <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                            <WalletLogo wallet={w} size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground tracking-tight">{w.name}</p>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                              Saldo: Rp {formatIDR(w.balance.toString())}
                            </p>
                          </div>
                        </div>
                        {isSelected && <Check className="size-5 text-primary" />}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Note Section */}
            <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col gap-1 focus-within:border-primary/50 transition-all shadow-sm">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Note / Source Description</Label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. Salary, ATM Deposit..."
                className="bg-transparent border-none outline-none text-xs font-medium text-foreground placeholder:text-muted-foreground"
              />
            </div>

          </div>
        </div>

        {/* Sticky Action Footer (Non-overlapping flex item) */}
        <div className="p-4 sm:p-5 bg-background/95 backdrop-blur-md border-t border-border shrink-0 z-10">
          <Button
            onClick={handleSubmit}
            className="w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md gap-2"
            disabled={!formData.amount || formData.amount === '0'}
          >
            <span>Deposit Funds</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>

      </div>
    </div>
  );
});

export default TopupModal;
