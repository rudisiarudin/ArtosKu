import React, { useState, useEffect, useRef } from 'react';
import { Wallet } from '../types';
import { searchUserByEmail, transferToUser, fetchFavorites, addToFavorites, removeFromFavorites } from '../lib/database';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { formatIDR, vibrate, cn } from '@/lib/utils';
import { X, AtSign, User, ArrowRight, ShieldCheck, CheckCircle2, Share2, Wallet as WalletIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';

interface InterUserTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onSuccess: () => void;
}

const InterUserTransferModal: React.FC<InterUserTransferModalProps> = ({ isOpen, onClose, wallets, onSuccess }) => {
  const { t } = useLanguage();
  const [fromWalletId, setFromWalletId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferResult, setTransferResult] = useState<any>(null);
  const [senderName, setSenderName] = useState<string>('');
  const [transferStep, setTransferStep] = useState<'INPUT' | 'PIN' | 'CONFIRM'>('INPUT');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [userSecurityPin, setUserSecurityPin] = useState<string | null>(null);

  useEffect(() => {
    if (wallets.length > 0 && !fromWalletId) {
      const firstNonInvestment = wallets.find(w => w.type !== 'INVESTMENT') || wallets[0];
      setFromWalletId(firstNonInvestment.id);
    }
    fetchCurrentUser();
  }, [wallets, fromWalletId]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name, security_pin, pin_enabled').eq('id', user.id).single();
        if (data) {
          setSenderName(data.full_name);
          setUserSecurityPin(data.security_pin);
          setIsPinEnabled(data.pin_enabled);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async () => {
    if (!recipientEmail.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const profile = await searchUserByEmail(recipientEmail.trim().toLowerCase());
      if (profile) {
        setRecipientName(profile.full_name || profile.username || 'User');
      } else {
        setError('User not found.');
        setRecipientName(null);
      }
    } catch (err) {
      setError('Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePinInput = (val: string) => {
    if (enteredPin.length < 6) {
      const nextPin = enteredPin + val;
      setEnteredPin(nextPin);
      if (nextPin.length === 6) {
        if (nextPin === userSecurityPin) {
          setTransferStep('CONFIRM');
          setEnteredPin('');
        } else {
          vibrate(50);
          setError('Invalid PIN.');
          setEnteredPin('');
        }
      }
    }
  };

  const handleNextStep = () => {
    if (transferStep === 'INPUT') {
      const numAmount = Number(amount.replace(/\D/g, ''));
      if (!recipientName || !recipientEmail || numAmount <= 0) {
        setError('Please complete the fields.');
        return;
      }
      if (isPinEnabled && userSecurityPin) {
        setTransferStep('PIN');
      } else {
        setTransferStep('CONFIRM');
      }
    } else if (transferStep === 'CONFIRM') {
      executeTransfer();
    }
  };

  const executeTransfer = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const numAmount = Number(amount.replace(/\D/g, ''));
      const res = await transferToUser(fromWalletId, recipientEmail, numAmount, description || 'Transfer');
      if (res && res.success) {
        setTransferResult({
          amount: numAmount,
          recipient: recipientName,
          id: res.transfer_id || 'TRX-' + Math.random().toString(36).substring(2, 8).toUpperCase()
        });
        setIsSuccess(true);
        onSuccess();
      } else {
        setError(res?.error || 'Transfer failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Transfer failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareProof = async () => {
    if (!transferResult) return;
    const text = `Proof: Rp${Number(transferResult.amount).toLocaleString('id-ID')} to ${transferResult.recipient}\nRef: ${transferResult.id}`;
    if (navigator.share) { try { await navigator.share({ title: 'Transfer Proof', text }); } catch (err) {} }
    else { navigator.clipboard.writeText(text); alert('Copied.'); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end md:justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-background rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] md:max-h-[88vh] border border-border overflow-hidden z-10">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mt-3 mb-1 shrink-0 md:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-border/40">
          <div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">P2P Network</p>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Kirim Uang (Antar Akun)</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="size-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </Button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-6">
          
          {transferStep === 'INPUT' && (
            <div className="space-y-6">
              {/* Recipient Search */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Email Penerima</Label>
                <div className={cn(
                  "relative flex items-center gap-3 bg-muted/70 hover:bg-muted rounded-2xl px-4 py-3 border border-border/60 transition-all",
                  isSearching ? "border-primary ring-2 ring-primary/20" : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
                )}>
                  {isSearching ? <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" /> : <AtSign className="size-4 text-primary shrink-0" />}
                  <Input 
                    type="email" 
                    value={recipientEmail} 
                    onChange={(e) => { setRecipientEmail(e.target.value); setRecipientName(null); setError(null); }} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
                    placeholder="Ketik email penerima..." 
                    className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-foreground placeholder:text-muted-foreground h-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                  />
                  <Button type="button" size="sm" onClick={handleSearch} disabled={!recipientEmail.trim() || isSearching} className="h-7 px-3 rounded-lg text-xs font-semibold">
                    Cek
                  </Button>
                </div>
                
                {recipientName && (
                  <div className="flex items-center gap-3.5 p-3.5 bg-primary/10 rounded-2xl border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Avatar className="size-10 rounded-xl bg-primary/20 text-primary shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">
                        <User className="size-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{recipientName}</p>
                      <p className="text-[11px] text-muted-foreground font-medium truncate uppercase">{recipientEmail}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div className="text-center py-2">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative z-10 flex items-center justify-center w-full">
                    <input 
                      type="text" 
                      inputMode="numeric" 
                      value={amount === '0' ? '' : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} 
                      onChange={(e) => { 
                        const val = e.target.value.replace(/\./g, ''); 
                        if (/^\d*$/.test(val)) setAmount(val || '0'); 
                      }} 
                      className="bg-transparent border-none outline-none font-extrabold tabular-nums text-center tracking-tight leading-none text-primary" 
                      style={{ fontSize: 'clamp(44px, 12vw, 76px)', width: '100%' }}
                      placeholder="0" 
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-2">Nominal Transfer</span>
                </div>
              </div>

              {/* Source Wallet Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Sumber Rekening / Dompet</Label>
                <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                  {wallets.filter(w => w.type !== 'INVESTMENT').map((w) => {
                    const isSelected = fromWalletId === w.id;
                    return (
                      <Button 
                        key={w.id} 
                        type="button"
                        variant={isSelected ? "default" : "outline"} 
                        onClick={() => setFromWalletId(w.id)} 
                        className={cn(
                          "px-4 py-3 rounded-xl text-xs font-semibold transition-all shrink-0 flex flex-col items-start gap-1 min-w-[130px] h-auto shadow-sm",
                          isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted/50"
                        )}
                      >
                        <p className="truncate w-full font-bold">{w.name}</p>
                        <p className={cn("text-[10px] font-medium tabular-nums", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          Rp {formatIDR(w.balance.toString())}
                        </p>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col gap-1 focus-within:border-primary/50 transition-all shadow-sm">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Catatan</Label>
                <Input 
                  type="text" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Misal: Bayar makan siang..." 
                  className="bg-transparent border-none outline-none text-xs font-medium text-foreground placeholder:text-muted-foreground h-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                />
              </div>

              {error && <p className="text-destructive text-xs font-semibold text-center">{error}</p>}
            </div>
          )}

          {transferStep === 'PIN' && (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShieldCheck className="size-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Verifikasi PIN Keamanan</h3>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">Masukkan 6-digit PIN Anda</p>
               
              <div className="flex gap-3 mb-8">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className={cn("size-3.5 rounded-full border-2 transition-all duration-200", enteredPin.length > idx ? "bg-primary border-primary scale-110" : "bg-transparent border-muted-foreground/30")} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'DEL'].map((val) => (
                  <Button 
                    key={val} 
                    variant={typeof val === 'number' ? "outline" : "ghost"} 
                    onClick={() => { 
                      if (val === 'C') setEnteredPin(''); 
                      else if (val === 'DEL') setEnteredPin(prev => prev.slice(0, -1)); 
                      else handlePinInput(val.toString()); 
                    }} 
                    className={cn(
                      "h-12 rounded-xl text-lg font-bold transition-all active:scale-95", 
                      typeof val === 'number' ? "bg-card border border-border text-foreground hover:border-primary/50 shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {val === 'DEL' ? '←' : val === 'C' ? 'CLR' : val}
                  </Button>
                ))}
              </div>
              {error && <p className="text-destructive text-xs font-semibold text-center mt-4">{error}</p>}
            </div>
          )}

          {transferStep === 'CONFIRM' && (
            <div className="py-2 space-y-4">
              <Card className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
                <CardContent className="p-0 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Transfer</p>
                  <p className="text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
                    Rp {Number(amount.replace(/\D/g, '')).toLocaleString('id-ID')}
                  </p>
                  <Separator className="bg-border/60" />
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Penerima</span>
                      <span className="font-bold text-foreground">{recipientName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Email</span>
                      <span className="font-semibold text-foreground">{recipientEmail}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Sumber Dana</span>
                      <span className="font-bold text-foreground">{wallets.find(w => w.id === fromWalletId)?.name}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {error && <p className="text-destructive text-xs font-semibold text-center">{error}</p>}
            </div>
          )}
        </div>

        {/* Sticky Action Footer (Non-overlapping flex item) */}
        <div className="p-4 sm:p-5 bg-background/95 backdrop-blur-md border-t border-border shrink-0 z-10">
          <Button 
            onClick={handleNextStep} 
            disabled={isProcessing} 
            className="w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md gap-2"
          >
            {isProcessing ? 'Memproses...' : transferStep === 'CONFIRM' ? 'Konfirmasi & Kirim' : 'Lanjutkan'}
          </Button>
        </div>

        {isSuccess && transferResult && (
          <div className="absolute inset-0 z-[60] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center px-8 text-center animate-in zoom-in-95 duration-300">
            <div className="size-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
              <CheckCircle2 className="size-10 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">Transfer Berhasil!</h2>
            <p className="text-2xl font-black text-foreground mb-8 tabular-nums tracking-tight">Rp {Number(transferResult.amount).toLocaleString('id-ID')}</p>
            <div className="w-full space-y-2.5 max-w-xs">
              <Button onClick={handleShareProof} variant="outline" className="w-full h-11 rounded-xl border-border text-foreground font-bold text-xs uppercase tracking-wider gap-2">
                <Share2 className="size-4" /> Bagikan Bukti
              </Button>
              <Button onClick={() => { setIsSuccess(false); onClose(); }} className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider">
                Selesai
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InterUserTransferModal;
