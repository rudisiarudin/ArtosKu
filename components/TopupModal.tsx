import React, { useState, useEffect, useRef } from 'react';
import { TransactionType, Category, Wallet } from '../types';
import { formatIDR, vibrate, getLocalIsoString } from '@/lib/utils';
import { useLanguage } from '../context/LanguageContext';

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
        walletId: prefilledWalletId || wallets[0]?.id || ''
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
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-end md:justify-center bg-black/85 backdrop-blur-sm animate-backdrop">
      <div className="absolute inset-0" onClick={onClose} />
      
      {isSuccess && (
        <div className="absolute inset-0 z-[1100] bg-[#0e0e0e] flex flex-col items-center justify-center animate-fade-in px-8 text-center">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 animate-scale-spring">
            <i className="fa-solid fa-check text-4xl text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
          <p className="text-white/40 text-sm font-medium">Funds have been added.<br />Returning to home...</p>
        </div>
      )}

      <div className="relative w-full max-w-lg bg-[#0e0e0e] rounded-t-[32px] md:rounded-[32px] shadow-2xl flex flex-col max-h-[92vh] animate-modal-slide border-t border-white/10 overflow-hidden">
        
        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mt-3 mb-1" />

        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-24">
          
          {/* Elite Header */}
          <div className="flex items-center justify-between py-6">
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Funding Entry</p>
              <h2 className="text-2xl font-bold text-white">{title || 'Top Up'}</h2>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:scale-90 transition-all">
              <i className="fa-solid fa-times" />
            </button>
          </div>

          {/* Amount Hero Section */}
          <div className="mb-12 text-center py-4">
            <div className="inline-flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-500/50">Rp</span>
              <input 
                type="text"
                inputMode="numeric"
                value={formData.amount === '0' ? '' : formData.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                onChange={(e) => {
                  const val = e.target.value.replace(/\./g, '');
                  if (/^\d*$/.test(val)) setFormData(prev => ({ ...prev, amount: val || '0' }));
                }}
                className="w-[5ch] bg-transparent border-none outline-none text-6xl font-bold tabular-nums text-center text-emerald-500"
                placeholder="0"
                style={{ width: `${Math.max(3, formData.amount.length + 1)}ch` }}
                autoFocus
              />
            </div>
            <div className="mt-6 w-16 h-1 bg-emerald-500/20 rounded-full mx-auto blur-[1px]" />
          </div>

          <div className="space-y-10">
            
            {/* Source of Funds */}
            <div>
              <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4 px-1">Source of Funds</h3>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                <button
                  onClick={() => setSourceWalletId('EXTERNAL')}
                  className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all shrink-0 flex items-center gap-3 ${sourceWalletId === 'EXTERNAL' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/40'}`}
                >
                  <i className="fa-solid fa-bank text-[10px]" />
                  External Bank
                </button>
                {wallets.filter(w => w.id !== formData.walletId).map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setSourceWalletId(w.id)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all shrink-0 flex items-center gap-3 ${sourceWalletId === w.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/40'}`}
                  >
                    <i className={`fa-solid ${w.icon || 'fa-wallet'} text-[10px]`} />
                    {w.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Destination Wallet */}
            <div>
              <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4 px-1">Destination</h3>
              <div className="grid grid-cols-1 gap-3">
                {wallets.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setFormData(d => ({ ...d, walletId: w.id }))}
                    className={`flex items-center justify-between p-5 rounded-[24px] border transition-all ${formData.walletId === w.id ? 'bg-emerald-500/10 border-emerald-500/20 ring-1 ring-emerald-500/20' : 'bg-white/[0.03] border-white/5 opacity-50'}`}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60">
                        <i className={`fa-solid ${w.icon || 'fa-wallet'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{w.name}</p>
                        <p className="text-[10px] font-bold text-white/20 uppercase mt-0.5">{w.type}</p>
                      </div>
                    </div>
                    {formData.walletId === w.id && <i className="fa-solid fa-check-circle text-emerald-500" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Note Section */}
            <div className="bg-white/[0.04] rounded-[24px] p-5 flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Note</span>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Where is this money coming from?"
                className="bg-transparent border-none outline-none text-sm font-bold text-white placeholder:text-white/5"
              />
            </div>

          </div>
        </div>

        {/* Action Button */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/95 to-transparent pt-10">
          <button
            onClick={handleSubmit}
            className="w-full h-15 rounded-2xl bg-emerald-500 text-black font-black text-xs uppercase tracking-[0.3em] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20"
          >
            Deposit Funds
            <i className="fa-solid fa-arrow-right-long" />
          </button>
        </div>

      </div>
    </div>
  );
});

export default TopupModal;
