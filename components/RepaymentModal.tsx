import React, { useState, useEffect } from 'react';
import { Debt, TransactionType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { formatIDR, vibrate, cn } from '@/lib/utils';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Check, X, Info, ShieldCheck, ChevronRight } from 'lucide-react';

interface RepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  onConfirm: (amount: number) => void;
}

const RepaymentModal: React.FC<RepaymentModalProps> = ({ isOpen, onClose, debt, onConfirm }) => {
  const { t, lang } = useLanguage();
  const [amount, setAmount] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && debt) {
      setAmount('');
      setIsSuccess(false);
    }
  }, [isOpen, debt]);

  if (!isOpen || !debt) return null;

  const handleConfirm = () => {
    const numAmount = Number(amount.replace(/\D/g, ''));
    if (numAmount > 0) {
      setIsSuccess(true);
      vibrate([10, 30, 10]);
      setTimeout(() => {
        onConfirm(numAmount);
        onClose();
      }, 1200);
    }
  };

  const handlePayFull = () => {
    setAmount(debt.amount.toString());
    vibrate(10);
  };

  const isDebt = debt.type === TransactionType.DEBT;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end md:justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-background rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] md:max-h-[88vh] border border-border overflow-hidden z-10">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mt-3 mb-1 shrink-0 md:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-border/40">
          <div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Settlement</p>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{isDebt ? 'Pelunasan Hutang' : 'Penerimaan Piutang'}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="size-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </Button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-6">
          <Card className="bg-card border border-border rounded-xl shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                  <Info className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Sisa Tagihan: {debt.title}</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">Rp {formatIDR(debt.amount)}</p>
                </div>
              </div>
              <Button onClick={handlePayFull} variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs font-semibold text-emerald-500 hover:bg-emerald-500/10">
                Lunasi Semua
              </Button>
            </CardContent>
          </Card>

          <div className="text-center py-4">
            <div className="flex flex-col items-center justify-center">
              <div className="relative z-10 flex items-center justify-center w-full">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount === '0' ? '' : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\./g, '');
                    if (/^\d*$/.test(val) && Number(val) <= debt.amount) setAmount(val || '0');
                  }}
                  className="bg-transparent border-none outline-none font-extrabold tabular-nums text-center tracking-tight leading-none text-foreground placeholder:text-muted-foreground"
                  style={{ fontSize: 'clamp(44px, 12vw, 76px)', width: '100%' }}
                  placeholder="0"
                  autoFocus
                />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-2">Nominal Pembayaran</span>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-3">
            <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
            <p className="text-xs font-medium text-emerald-500 leading-relaxed">Dana akan otomatis disesuaikan pada dompet terkait.</p>
          </div>
        </div>

        {/* Sticky Action Footer (Non-overlapping flex item) */}
        <div className="p-4 sm:p-5 bg-background/95 backdrop-blur-md border-t border-border shrink-0 z-10">
          <Button
            onClick={handleConfirm}
            disabled={!amount || Number(amount) <= 0}
            className={cn(
              "w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md gap-2",
              isDebt ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"
            )}
          >
            <span>Konfirmasi Pembayaran</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {isSuccess && (
          <div className="absolute inset-0 z-[60] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center px-8 text-center animate-in zoom-in-95 duration-200">
            <div className="size-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <Check className="size-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Pelunasan Berhasil!</h2>
            <p className="text-muted-foreground text-sm font-medium">Data transaksi dan saldo berhasil diperbarui.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default RepaymentModal;
