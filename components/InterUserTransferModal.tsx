import React, { useState, useEffect, useRef } from 'react';
import { Wallet } from '../types';
import { searchUserByEmail, transferToUser, fetchFavorites, addToFavorites, removeFromFavorites } from '../lib/database';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { formatIDR, vibrate } from '@/lib/utils';
import { X, AtSign, User, ArrowRight, ShieldCheck, CheckCircle2, Share2, Wallet as WalletIcon } from 'lucide-react';

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
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
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
    loadFavorites();
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
    } catch (err) { console.error(err); }
  };

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const favs = await fetchFavorites(user.id);
        setFavorites(favs);
      }
    } catch (err) { console.error(err); }
  };

  const handleSearch = async () => {
    if (!recipientEmail.includes('@')) {
      setError("Invalid email format");
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const user = await searchUserByEmail(recipientEmail.toLowerCase().trim());
      if (user) {
        setRecipientName(user.full_name);
        setIsFavorite(favorites.some(f => f.id === user.id));
      } else {
        setRecipientName(null);
        setError("User not found");
      }
    } catch (err: any) { setError("Error searching user"); } finally { setIsSearching(false); }
  };

  const handleToggleFavorite = async () => {
    if (!recipientEmail || !recipientName) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const searchedUser = await searchUserByEmail(recipientEmail.toLowerCase().trim());
      if (!searchedUser) return;
      if (isFavorite) await removeFromFavorites(user.id, searchedUser.id);
      else await addToFavorites(user.id, searchedUser.id);
      setIsFavorite(!isFavorite);
      loadFavorites();
    } catch (err) { console.error(err); }
  };

  const handleTransfer = async () => {
    const numAmount = Number(amount.replace(/\D/g, ''));
    if (!numAmount || !fromWalletId || !recipientEmail) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await transferToUser(fromWalletId, recipientEmail.toLowerCase().trim(), numAmount, description);
      if (result.success) {
        setTransferResult({ amount: numAmount, recipient: recipientName, email: recipientEmail, date: new Date().toISOString(), id: Math.random().toString(36).substring(2, 10).toUpperCase() });
        setIsSuccess(true);
        onSuccess();
      } else { setError(result.error || "Transfer failed"); }
    } catch (err: any) { setError("Processing error"); } finally { setIsProcessing(false); }
  };

  const handleNextStep = () => {
    if (transferStep === 'INPUT') {
      const numAmount = Number(amount.replace(/\D/g, ''));
      if (!numAmount || numAmount <= 0 || !recipientName) return;
      if (isPinEnabled && userSecurityPin) { setTransferStep('PIN'); setEnteredPin(''); }
      else setTransferStep('CONFIRM');
    } else if (transferStep === 'PIN') {
      if (enteredPin === userSecurityPin) setTransferStep('CONFIRM');
      else { setError("Invalid PIN"); setEnteredPin(''); }
    } else if (transferStep === 'CONFIRM') handleTransfer();
  };

  const handlePinInput = (num: string) => {
    if (enteredPin.length < 6) {
      const newPin = enteredPin + num;
      setEnteredPin(newPin);
      if (newPin.length === 6) {
        if (newPin === userSecurityPin) setTransferStep('CONFIRM');
        else { setError("Invalid PIN"); setEnteredPin(''); }
      }
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
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-end md:justify-center bg-black/60 backdrop-blur-[2px] animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#0e0e0e] rounded-t-[28px] md:rounded-[28px] shadow-2xl flex flex-col max-h-[94vh] animate-modal-slide border-t border-white/5 overflow-hidden">
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mt-4 mb-2" />

        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-28">
          <div className="flex items-center justify-between py-6">
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Transfer</p>
              <h2 className="text-xl font-black text-foreground tracking-tight">Send Money</h2>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-foreground active:scale-90 transition-all border border-border">
              <X className="w-5 h-5" />
            </button>
          </div>

          {transferStep === 'INPUT' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className={`relative flex items-center gap-3 bg-card border rounded-2xl px-5 py-4 transition-all ${isSearching ? 'border-primary ring-4 ring-primary/10' : 'border-border focus-within:border-primary/40'}`}>
                  {isSearching ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <AtSign className="w-5 h-5 text-muted-foreground/40" />}
                  <input type="email" value={recipientEmail} onChange={(e) => { setRecipientEmail(e.target.value); setRecipientName(null); setError(null); }} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Recipient Email..." className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-foreground placeholder:text-muted-foreground/30" />
                </div>
                {recipientName && (
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-foreground truncate">{recipientName}</p>
                      <p className="text-[10px] font-bold text-muted-foreground truncate uppercase">{recipientEmail}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center py-6 border-b border-border/50">
                <div className="inline-flex items-baseline gap-2 mb-2">
                  <span className="text-[18px] font-bold text-muted-foreground/40">IDR</span>
                  <input type="text" inputMode="numeric" value={amount === '0' ? '' : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} onChange={(e) => { const val = e.target.value.replace(/\./g, ''); if (/^\d*$/.test(val)) setAmount(val || '0'); }} className="w-[5ch] bg-transparent border-none outline-none text-4xl font-black tabular-nums text-center text-primary tracking-tight" placeholder="0" style={{ width: `${Math.max(3, amount.length + 0.5)}ch` }} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-1">Source</h3>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {wallets.filter(w => w.type !== 'INVESTMENT').map((w) => (
                    <button key={w.id} onClick={() => setFromWalletId(w.id)} className={`px-4 py-3 rounded-xl border text-[11px] font-bold transition-all shrink-0 flex flex-col items-start gap-1 min-w-[120px] ${fromWalletId === w.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/30'}`}>
                      <p className="truncate w-full">{w.name}</p>
                      <p className={`text-[9px] ${fromWalletId === w.id ? 'text-black/40' : 'text-white/10'}`}>Rp{formatIDR(w.balance.toString())}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/[0.03] rounded-xl p-4 flex flex-col gap-1">
                <span className="text-[9px] font-bold text-white/20 uppercase">Note</span>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="..." className="bg-transparent border-none outline-none text-[12px] font-bold text-white placeholder:text-white/5" />
              </div>
              {error && <p className="text-rose-500 text-[10px] font-bold text-center">{error}</p>}
            </div>
          )}

          {transferStep === 'PIN' && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Verify Security PIN</h3>
              <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-10">Enter your 6-digit PIN</p>
              
              <div className="flex gap-4 mb-16">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${enteredPin.length > idx ? 'bg-primary border-primary scale-110' : 'bg-transparent border-muted/30'}`} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'DEL'].map((val) => (
                  <button key={val} onClick={() => { if (val === 'C') setEnteredPin(''); else if (val === 'DEL') setEnteredPin(prev => prev.slice(0, -1)); else handlePinInput(val.toString()); }} className={`h-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${typeof val === 'number' ? 'bg-card border border-border text-foreground hover:border-primary/50 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{val === 'DEL' ? '←' : val === 'C' ? 'CLR' : val}</button>
                ))}
              </div>
            </div>
          )}

          {transferStep === 'CONFIRM' && (
            <div className="py-6 space-y-6">
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 text-center">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Total Transfer</p>
                <p className="text-3xl font-bold text-white tabular-nums">Rp {Number(amount.replace(/\D/g, '')).toLocaleString('id-ID')}</p>
                <div className="h-px bg-white/5 w-full my-6" />
                <div className="space-y-3 text-[11px]">
                  <div className="flex justify-between items-center"><span className="text-white/20">To</span><span className="font-bold">{recipientName}</span></div>
                  <div className="flex justify-between items-center"><span className="text-white/20">Source</span><span className="font-bold">{wallets.find(w => w.id === fromWalletId)?.name}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent pt-8">
          <button onClick={handleNextStep} disabled={isProcessing} className="w-full h-14 rounded-2xl bg-[#10B981] text-white font-black text-[14px] uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
            {isProcessing ? 'Processing...' : transferStep === 'CONFIRM' ? 'Confirm Transfer' : 'Continue'}
          </button>
        </div>

        {isSuccess && transferResult && (
          <div className="fixed inset-0 z-[2000] bg-background flex flex-col items-center justify-center px-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">Transfer Successful</h2>
            <p className="text-3xl font-black text-foreground mb-10 tracking-tight">Rp {Number(transferResult.amount).toLocaleString('id-ID')}</p>
            <div className="w-full space-y-3 mb-10">
              <button onClick={handleShareProof} className="w-full h-12 rounded-2xl bg-muted border border-border text-foreground font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" /> Share Proof
              </button>
              <button onClick={() => { setIsSuccess(false); onClose(); }} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-[12px] uppercase tracking-wider">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterUserTransferModal;
