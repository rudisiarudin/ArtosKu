import React, { useState } from 'react';
import { Wallet } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { WalletLogo } from './WalletLogo';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { cn, formatIDR } from '@/lib/utils';
import { X, ArrowDown, ArrowRight, Pencil } from 'lucide-react';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransfer: (fromWalletId: string, toWalletId: string, amount: number, description: string) => void;
    wallets: Wallet[];
    theme: 'light' | 'dark';
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onTransfer, wallets, theme }) => {
    const { t } = useLanguage();
    const filteredWallets = React.useMemo(() => wallets.filter(w => w.code !== 'STOCKS'), [wallets]);
    const [fromWalletId, setFromWalletId] = useState<string>(filteredWallets[0]?.id || '');
    const [toWalletId, setToWalletId] = useState<string>(filteredWallets[1]?.id || '');
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState<string>('');

    React.useEffect(() => {
        if (filteredWallets.length > 0) {
            if (!fromWalletId) setFromWalletId(filteredWallets[0].id);
            if (!toWalletId && filteredWallets.length > 1) setToWalletId(filteredWallets[1].id);
        }
    }, [filteredWallets]);

    if (!isOpen) return null;

    const handleTransfer = () => {
        const numAmount = Number(amount.replace(/\D/g, ''));
        if (numAmount > 0 && fromWalletId && toWalletId && fromWalletId !== toWalletId) {
            onTransfer(fromWalletId, toWalletId, numAmount, description || t('transfer.internal_description') || 'Internal Transfer');
            onClose();
            setAmount('');
            setDescription('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-end md:justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-background rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] md:max-h-[88vh] border border-border overflow-hidden z-10">
                {/* Mobile Drag Handle */}
                <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mt-3 mb-1 shrink-0 md:hidden" />

                {/* Top Navigation */}
                <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-border/40">
                    <div>
                        <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Internal Transfer</p>
                        <h2 className="text-lg font-bold text-foreground tracking-tight">{t('transfer.self_transfer') || 'Pindah Saldo'}</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="size-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
                        <X className="size-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-6">
                    {/* Amount Input Section */}
                    <div className="flex flex-col items-center justify-center py-4">
                        <div className="flex items-center justify-center w-full">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={amount === '0' ? '' : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\./g, '');
                                    if (/^\d*$/.test(val)) setAmount(val || '0');
                                }}
                                className="bg-transparent border-none outline-none font-extrabold tabular-nums text-center tracking-tight leading-none text-blue-500 placeholder:text-muted-foreground"
                                style={{ fontSize: 'clamp(44px, 12vw, 76px)', width: '100%' }}
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                        <Label className="text-muted-foreground text-[11px] font-semibold uppercase tracking-widest mt-2">{t('common.amount') || 'Nominal Transfer'}</Label>
                    </div>

                    {/* From Wallet Selector */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{t('transfer.from_wallet') || 'Sumber Dana'}</Label>
                        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                            {filteredWallets.map((w) => {
                                const isSelected = fromWalletId === w.id;
                                return (
                                    <button
                                        key={w.id}
                                        type="button"
                                        onClick={() => setFromWalletId(w.id)}
                                        className={cn(
                                            "min-w-[130px] p-3 rounded-xl border transition-all text-left active:scale-95 shadow-sm",
                                            isSelected 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-blue-600/20' 
                                                : 'bg-card border-border hover:bg-muted/50'
                                        )}
                                    >
                                        <div className={cn(
                                            "size-8 rounded-lg flex items-center justify-center mb-2",
                                            isSelected ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                                        )}>
                                            <WalletLogo wallet={w} size={16} />
                                        </div>
                                        <p className={cn(
                                            "text-[10px] font-semibold uppercase truncate mb-0.5",
                                            isSelected ? 'text-white/80' : 'text-muted-foreground'
                                        )}>{w.name}</p>
                                        <p className={cn(
                                            "text-xs font-bold tabular-nums",
                                            isSelected ? 'text-white' : 'text-foreground'
                                        )}>Rp {formatIDR(w.balance.toString())}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Divider Arrow */}
                    <div className="flex justify-center -my-2 relative z-10">
                        <div className="size-9 rounded-full bg-blue-500 flex items-center justify-center text-white border-2 border-background shadow-md">
                            <ArrowDown className="size-4" />
                        </div>
                    </div>

                    {/* To Wallet Selector */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{t('transfer.to_wallet') || 'Tujuan Transfer'}</Label>
                        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                            {filteredWallets.map((w) => {
                                const isSelected = toWalletId === w.id;
                                const isDisabled = fromWalletId === w.id;
                                return (
                                    <button
                                        key={w.id}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => setToWalletId(w.id)}
                                        className={cn(
                                            "min-w-[130px] p-3 rounded-xl border transition-all text-left active:scale-95 shadow-sm",
                                            isDisabled && "opacity-30 pointer-events-none",
                                            isSelected 
                                                ? 'bg-blue-500 border-blue-500 text-white shadow-blue-500/20' 
                                                : 'bg-card border-border hover:bg-muted/50'
                                        )}
                                    >
                                        <div className={cn(
                                            "size-8 rounded-lg flex items-center justify-center mb-2",
                                            isSelected ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                                        )}>
                                            <WalletLogo wallet={w} size={16} />
                                        </div>
                                        <p className={cn(
                                            "text-[10px] font-semibold uppercase truncate mb-0.5",
                                            isSelected ? 'text-white/80' : 'text-muted-foreground'
                                        )}>{w.name}</p>
                                        <p className={cn(
                                            "text-xs font-bold tabular-nums",
                                            isSelected ? 'text-white' : 'text-foreground'
                                        )}>Rp {formatIDR(w.balance.toString())}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Note Input */}
                    <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col gap-1 focus-within:border-primary/50 transition-all shadow-sm">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Catatan Transfer</Label>
                        <div className="flex items-center gap-2">
                            <Pencil className="size-3.5 text-muted-foreground shrink-0" />
                            <input
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="bg-transparent border-none outline-none text-foreground text-xs font-medium w-full placeholder:text-muted-foreground"
                                placeholder={t('transfer.add_note') || 'Misal: Simpan ke tabungan...'}
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Button */}
                <div className="p-4 sm:p-5 bg-background/95 backdrop-blur-md border-t border-border shrink-0 z-10">
                    <Button
                        onClick={handleTransfer}
                        disabled={!amount || amount === '0' || fromWalletId === toWalletId}
                        className="w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider shadow-md gap-2 bg-blue-600 hover:bg-blue-500 text-white"
                    >
                        <span>{t('transfer.execute_transfer') || 'Eksekusi Transfer'}</span>
                        <ArrowRight className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TransferModal;
