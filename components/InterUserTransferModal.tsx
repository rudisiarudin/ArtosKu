import React, { useState, useEffect } from 'react';
import { Wallet } from '../types';
import { searchUserByEmail, transferToUser, fetchFavorites, addToFavorites, removeFromFavorites } from '../lib/database';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

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
        } catch (err) {
            console.error('Error fetching current user:', err);
        }
    };

    const loadFavorites = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const favs = await fetchFavorites(user.id);
                setFavorites(favs);
            }
        } catch (err) {
            console.error('Error fetching favorites:', err);
        }
    };

    if (!isOpen) return null;

    const handleSearch = async () => {
        if (!recipientEmail.includes('@')) {
            setError(t('transfer.error_email'));
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
                setError(t('transfer.error_user_not_found'));
            }
        } catch (err: any) {
            setError(err.message || t('transfer.error_searching_user') || 'Error searching user');
        } finally {
            setIsSearching(false);
        }
    };

    const handleToggleFavorite = async () => {
        if (!recipientEmail || !recipientName) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const searchedUser = await searchUserByEmail(recipientEmail.toLowerCase().trim());
            if (!searchedUser) return;

            if (isFavorite) {
                await removeFromFavorites(user.id, searchedUser.id);
            } else {
                await addToFavorites(user.id, searchedUser.id);
            }
            setIsFavorite(!isFavorite);
            loadFavorites();
        } catch (err) {
            console.error('Error toggling favorite:', err);
        }
    };

    const handleTransfer = async () => {
        const numAmount = Number(amount.replace(/\D/g, ''));
        if (!numAmount || !fromWalletId || !recipientEmail) return;

        setIsProcessing(true);
        setError(null);
        try {
            const result = await transferToUser(fromWalletId, recipientEmail.toLowerCase().trim(), numAmount, description);
            if (result.success) {
                setTransferResult({
                    amount: numAmount,
                    recipient: recipientName,
                    email: recipientEmail,
                    date: new Date().toISOString(),
                    id: Math.random().toString(36).substring(2, 10).toUpperCase()
                });
                setIsSuccess(true);
                onSuccess();
            } else {
                setError(result.error || t('transfer.error_failed'));
            }
        } catch (err: any) {
            setError(err.message || t('transfer.error_process_failed'));
        } finally {
            setIsProcessing(false);
            if (!isSuccess) {
                // Keep the success result for the success screen
            }
        }
    };

    const handleNextStep = () => {
        if (transferStep === 'INPUT') {
            if (!amount || Number(amount) <= 0 || !recipientName) return;
            if (isPinEnabled && userSecurityPin) {
                setTransferStep('PIN');
                setEnteredPin('');
                setError(null);
            } else {
                setTransferStep('CONFIRM');
                setError(null);
            }
        } else if (transferStep === 'PIN') {
            if (enteredPin === userSecurityPin) {
                setTransferStep('CONFIRM');
                setError(null);
            } else {
                setError(t('transfer.pin_error'));
                setEnteredPin('');
            }
        } else if (transferStep === 'CONFIRM') {
            handleTransfer();
        }
    };

    const handlePinInput = (num: string) => {
        if (enteredPin.length < 6) {
            const newPin = enteredPin + num;
            setEnteredPin(newPin);
            if (newPin.length === 6) {
                // Auto-verify when 6 digits are entered
                if (newPin === userSecurityPin) {
                    setTransferStep('CONFIRM');
                    setError(null);
                } else {
                    setError(t('transfer.pin_error'));
                    setEnteredPin('');
                }
            }
        }
    };

    const handleShareProof = async () => {
        if (!transferResult) return;
        const text = `Bukti Transfer ArtosKu\n\nNominal: Rp${formatDisplayIDR(transferResult.amount.toString())}\nKe: ${transferResult.recipient}\nTanggal: ${new Date(transferResult.date).toLocaleString()}\nRef: ${transferResult.id}\n\nSent via ArtosKu`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Bukti Transfer ArtosKu',
                    text: text,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(text);
            alert('Bukti transfer disalin ke papan klip.');
        }
    };

    const formatDisplayIDR = (val: string) => {
        if (!val) return '0';
        const num = val.replace(/\D/g, '');
        return new Intl.NumberFormat('id-ID').format(Number(num));
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <div
                className="fixed inset-0 bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-md z-40 transition-opacity duration-700 fade-in"
                onClick={onClose}
            ></div>

            <div className="relative bg-[var(--bg-deep)] w-full h-[100dvh] shadow-2xl flex flex-col overflow-hidden z-50 modal-sheet">
                <div className="absolute top-0 left-0 w-64 h-64 bg-violet-500/5 blur-[120px] rounded-full -ml-32 -mt-32 pointer-events-none"></div>

                {/* Top Navigation */}
                <div className="flex items-center px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 justify-between relative z-10">
                    <button onClick={onClose} className="text-[var(--text-primary)] flex size-9 shrink-0 items-center justify-center rounded-full bg-[rgba(var(--bg-card-rgb),0.2)] transition-all active:scale-90">
                        <i className="fa-solid fa-xmark text-base"></i>
                    </button>
                    <h2 className="text-[var(--text-secondary)] text-sm font-medium leading-tight flex-1 text-center">{t('transfer.send_funds')}</h2>
                    <div className="flex items-center">
                        <i className="fa-solid fa-circle-question text-[var(--text-muted)] opacity-40 text-base"></i>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
                    {transferStep === 'INPUT' && (
                        <>
                            {/* Amount Input */}
                            <div className="flex flex-col items-center justify-center py-6 px-6">
                                <p className="text-[var(--text-muted)] text-[8px] font-black uppercase tracking-[0.3em] mb-4 opacity-50">{t('common.amount')}</p>
                                <div className="flex items-center justify-center gap-2 w-full">
                                    <span className="text-rose-500/40 text-lg font-black mb-1 shrink-0 tabular-nums">Rp</span>
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={amount === '0' ? '' : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\./g, '');
                                                if (/^\d*$/.test(val)) setAmount(val || '0');
                                            }}
                                            style={{
                                                fontSize: amount.length > 9 ? '26px' : amount.length > 7 ? '34px' : '42px',
                                                width: `${Math.max(1.8, (amount === '0' ? 1 : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".").length) * 0.8 + 0.8)}ch`,
                                                maxWidth: 'calc(100vw - 120px)'
                                            }}
                                            className="bg-transparent border-none outline-none text-rose-500 font-black text-center tracking-tight tabular-nums transition-all duration-300 placeholder:text-[var(--text-muted)] opacity-30 overflow-visible"
                                            placeholder="0"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Favorites List */}
                            {favorites.length > 0 && (
                                <section className="px-6 py-2">
                                    <h3 className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">{t('transfer.favorite_contacts')}</h3>
                                    <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 -mx-6 px-6">
                                        {favorites.map((fav) => (
                                            <button
                                                key={fav.id}
                                                onClick={() => {
                                                    setRecipientEmail(fav.email);
                                                    setRecipientName(fav.full_name);
                                                    setIsFavorite(true);
                                                }}
                                                className="flex flex-col items-center gap-2 shrink-0 active:scale-90 transition-transform"
                                            >
                                                <div className="w-11 h-11 rounded-full p-0.5 bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                                                    <img
                                                        src={fav.avatar_url || "https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png"}
                                                        alt={fav.full_name}
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                </div>
                                                <span className="text-[7px] font-black text-[var(--text-muted)] uppercase tracking-widest text-center truncate w-14 opacity-50">
                                                    {fav.full_name.split(' ')[0]}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section className="px-6 py-2">
                                <h3 className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">{t('transfer.recipient_identity')}</h3>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-[rgba(var(--bg-card-rgb),0.5)] border border-[var(--border-subtle)] rounded-2xl flex items-center px-4 focus-within:border-[#00d293]/30 transition-all h-12">
                                        <i className="fa-solid fa-at text-[var(--text-muted)] opacity-30 text-[12px] mr-3"></i>
                                        <input
                                            type="email"
                                            placeholder={t('transfer.search_placeholder')}
                                            value={recipientEmail}
                                            onChange={(e) => {
                                                setRecipientEmail(e.target.value);
                                                setRecipientName(null);
                                                setError(null);
                                            }}
                                            className="bg-transparent border-none outline-none text-[var(--text-primary)] text-[13px] font-bold w-full placeholder:text-[var(--text-muted)]"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSearch}
                                        disabled={isSearching || !recipientEmail}
                                        className="w-12 h-12 rounded-2xl bg-[#00d293]/10 border border-[#00d293]/20 text-[#00d293] flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
                                    >
                                        {isSearching ? <i className="fa-solid fa-spinner fa-spin text-sm"></i> : <i className="fa-solid fa-magnifying-glass text-sm"></i>}
                                    </button>
                                </div>

                                {recipientName && (
                                    <div className="mt-3 p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <i className="fa-solid fa-user text-[10px] text-emerald-500"></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[var(--text-primary)] text-[11px] font-black truncate">{recipientName}</p>
                                            <p className="text-[var(--text-muted)] text-[9px] font-bold truncate uppercase tracking-wider opacity-50">{recipientEmail}</p>
                                        </div>
                                        <button
                                            onClick={handleToggleFavorite}
                                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isFavorite ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-[#00d293]/10 text-[#00d293] border border-[#00d293]/20 active:scale-95'}`}
                                        >
                                            <i className={`fa-solid ${isFavorite ? 'fa-star' : 'fa-user-plus'} text-[12px] ${isFavorite ? 'animate-bounce-subtle' : ''}`}></i>
                                        </button>
                                    </div>
                                )}
                            </section>

                            {/* Source Wallet */}
                            <section className="px-6 py-4">
                                <h3 className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">{t('transfer.funding_source')}</h3>
                                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
                                    {wallets.filter(w => w.type !== 'INVESTMENT').map((w, i) => (
                                        <button
                                            key={w.id}
                                            onClick={() => setFromWalletId(w.id)}
                                            className={`flex-shrink-0 min-w-[120px] p-3.5 rounded-2xl border transition-all duration-500 text-left relative group active:scale-95 ${fromWalletId === w.id ? 'bg-[#00d293] border-[#00d293] shadow-lg shadow-emerald-500/20' : 'bg-[rgba(var(--bg-card-rgb),0.4)] border-[var(--border-subtle)] opacity-50'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-all ${fromWalletId === w.id ? 'bg-black/20 text-black' : 'bg-[rgba(var(--bg-inner-rgb),0.5)] text-[var(--text-muted)]'}`}>
                                                <i className={`fa-solid ${w.icon || 'fa-wallet'} text-[11px]`}></i>
                                            </div>
                                            <p className={`text-[8px] font-black uppercase tracking-wider mb-0.5 ${fromWalletId === w.id ? 'text-black/60' : 'text-[var(--text-muted)] opacity-50'}`}>{t(`wallet.${w.type.toLowerCase()}`) || w.type}</p>
                                            <p className={`text-[11px] font-black truncate tracking-tight ${fromWalletId === w.id ? 'text-black' : 'text-[var(--text-primary)]'}`}>{w.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Note & Error */}
                            <section className="px-6 py-2 pb-10">
                                <div className="bg-[rgba(var(--bg-card-rgb),0.5)] border border-[var(--border-subtle)] p-3 rounded-xl flex items-center gap-3 focus-within:border-[rgba(var(--bg-card-rgb),0.8)] transition-all">
                                    <i className="fa-solid fa-pen-to-square text-[var(--text-muted)] opacity-30 text-[10px]"></i>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="bg-transparent border-none outline-none text-[var(--text-primary)] text-[11px] font-bold w-full placeholder:text-[var(--text-muted)]"
                                        placeholder={t('common.add_note')}
                                    />
                                </div>

                                {error && (
                                    <div className="mt-4 p-3.5 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <i className="fa-solid fa-circle-exclamation text-rose-500 text-xs"></i>
                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.15em] leading-relaxed">{error}</p>
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    {transferStep === 'PIN' && (
                        <div className="flex flex-col items-center justify-center h-full px-6 py-10 fade-in">
                            <h3 className="text-[var(--text-primary)] text-lg font-black mb-2">{t('transfer.enter_pin')}</h3>
                            <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mb-10">{t('profile.security_pin')}</p>

                            <div className="flex gap-4 mb-12">
                                {[0, 1, 2, 3, 4, 5].map((idx) => (
                                    <div
                                        key={idx}
                                        className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${enteredPin.length > idx ? 'bg-[#00d293] border-[#00d293]' : 'bg-transparent border-[var(--border-subtle)]'}`}
                                    ></div>
                                ))}
                            </div>

                            {error && (
                                <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mb-8 animate-bounce">{error}</p>
                            )}

                            <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => handlePinInput(num.toString())}
                                        className="h-16 rounded-full bg-[rgba(var(--bg-card-rgb),0.4)] text-[var(--text-primary)] text-2xl font-black active:bg-[#00d293]/20 active:text-[#00d293] transition-all"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setEnteredPin('')}
                                    className="h-16 rounded-full flex items-center justify-center text-[var(--text-muted)] text-lg active:text-[var(--text-primary)] transition-all"
                                >
                                    <i className="fa-solid fa-rotate-left"></i>
                                </button>
                                <button
                                    onClick={() => handlePinInput('0')}
                                    className="h-16 rounded-full bg-[rgba(var(--bg-card-rgb),0.4)] text-[var(--text-primary)] text-2xl font-black active:bg-[#00d293]/20 active:text-[#00d293] transition-all"
                                >
                                    0
                                </button>
                                <button
                                    onClick={() => setEnteredPin(prev => prev.slice(0, -1))}
                                    className="h-16 rounded-full flex items-center justify-center text-[var(--text-muted)] text-lg active:text-rose-500 transition-all"
                                >
                                    <i className="fa-solid fa-delete-left"></i>
                                </button>
                            </div>

                            <button
                                onClick={() => setTransferStep('INPUT')}
                                className="mt-12 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest active:text-[var(--text-primary)] transition-all"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    )}

                    {transferStep === 'CONFIRM' && (
                        <div className="px-6 py-6 fade-in h-full flex flex-col">
                            <div className="bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] rounded-2xl p-6 mb-6">
                                <h3 className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-center opacity-70">{t('transfer.transfer_summary')}</h3>

                                <div className="flex flex-col items-center mb-8">
                                    <p className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest mb-2">{t('transfer.total_send')}</p>
                                    <p className="text-emerald-500 text-3xl font-black tabular-nums tracking-tight">Rp {formatDisplayIDR(amount)}</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-start pb-4 border-b border-[var(--border-subtle)]">
                                        <p className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest opacity-60">{t('transfer.recipient')}</p>
                                        <div className="text-right">
                                            <p className="text-[var(--text-primary)] text-[11px] font-black uppercase">{recipientName}</p>
                                            <p className="text-[var(--text-muted)] text-[9px] font-bold opacity-50">{recipientEmail}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-start pb-4 border-b border-[var(--border-subtle)]">
                                        <p className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest opacity-60">{t('transfer.funding_source')}</p>
                                        <div className="text-right">
                                            <p className="text-[var(--text-primary)] text-[11px] font-black uppercase">{wallets.find(w => w.id === fromWalletId)?.name}</p>
                                            <p className="text-[var(--text-muted)] text-[9px] font-bold opacity-50">ArtosKu Wallet</p>
                                        </div>
                                    </div>

                                    {description && (
                                        <div className="flex justify-between items-start">
                                            <p className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest opacity-60">{t('common.note')}</p>
                                            <p className="text-[var(--text-primary)] text-[10px] font-bold text-right max-w-[150px] italic">"{description}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setTransferStep(isPinEnabled ? 'PIN' : 'INPUT')}
                                className="mt-auto mb-4 w-full h-12 rounded-xl border border-[var(--border-subtle)] bg-[rgba(var(--bg-card-rgb),0.2)] text-[var(--text-muted)] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Bottom Action Area */}
                <div className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-md border-t border-[var(--border-subtle)] z-[100]">
                    <button
                        onClick={handleNextStep}
                        disabled={
                            (transferStep === 'INPUT' && (!amount || Number(amount) <= 0 || !recipientName || isSearching)) ||
                            (transferStep === 'PIN' && (enteredPin.length < 6 || isProcessing)) ||
                            isProcessing
                        }
                        className="w-full h-12 rounded-xl bg-[#00d293] text-black font-black text-[11px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 border-none uppercase tracking-[0.2em] disabled:opacity-30 disabled:grayscale"
                    >
                        {isProcessing ? (
                            <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                        ) : (
                            <>
                                <span>{transferStep === 'CONFIRM' ? t('transfer.confirm_transfer') : transferStep === 'PIN' ? t('common.confirm') : t('transfer.send_funds')}</span>
                                <i className={`fa-solid ${transferStep === 'CONFIRM' ? 'fa-check-circle' : 'fa-paper-plane'} text-[10px]`}></i>
                            </>
                        )}
                    </button>
                </div>

                {/* Success Screen Overlay */}
                {isSuccess && transferResult && (
                    <div className="fixed inset-0 z-[2000] bg-[var(--bg-deep)] flex flex-col items-center overflow-y-auto pt-10 pb-20 no-scrollbar">
                        <div className="w-full max-w-[340px] px-4 my-auto">
                            <div className="receipt-paper receipt-zigzag-top receipt-zigzag-bottom p-8 flex flex-col items-center">
                                {/* Logo & Header */}
                                <div className="mb-8 flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-7 h-7 rounded-full border-[2.5px] border-[#00a8e8] flex items-center justify-center">
                                            <div className="w-3.5 h-3.5 rounded-full bg-[#00a8e8]"></div>
                                        </div>
                                        <span className="text-[#00a8e8] font-black text-2xl tracking-tight">ArtosKu</span>
                                    </div>
                                    <div className="h-px bg-zinc-100 w-48 mb-6"></div>
                                    <h2 className="text-zinc-500 font-bold text-sm tracking-tight mb-2 leading-none">{t('transfer.transfer_successful')}</h2>
                                    <span className="text-zinc-900 font-black text-[28px] leading-tight">Rp {formatDisplayIDR(transferResult.amount.toString())}</span>
                                    <span className="text-zinc-400 font-bold text-[10px] tracking-tight mt-1">{t('transfer.transfer_out')}</span>
                                </div>

                                <div className="h-px bg-zinc-100 w-full mb-6"></div>

                                {/* Details Details */}
                                <div className="w-full space-y-6">
                                    <div className="space-y-1">
                                        <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-wider">{t('transfer.recipient')}</p>
                                        <p className="text-zinc-900 font-black text-sm uppercase">{transferResult.recipient}</p>
                                        <p className="text-zinc-500 font-bold text-[10px]">ArtosKu - {transferResult.email}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-wider">{t('transfer.sender')}</p>
                                        <p className="text-zinc-900 font-black text-sm uppercase">{senderName || 'MY ACCOUNT'}</p>
                                        <p className="text-zinc-500 font-bold text-[10px]">ArtosKu - Bank Artosku (******{wallets.find(w => w.id === fromWalletId)?.name.slice(-4) || '3258'})</p>
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100 w-full my-6"></div>

                                <div className="w-full space-y-4">
                                    <div className="flex justify-between items-start">
                                        <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-wider">{t('transfer.date_label')}</p>
                                        <p className="text-zinc-900 font-black text-[10px] text-right">
                                            {new Date(transferResult.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(transferResult.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-wider">{t('transfer.ref_id')}</p>
                                        <p className="text-zinc-900 font-black text-[10px] text-right tabular-nums">{transferResult.id}</p>
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-100 w-full my-6"></div>

                                <div className="text-center px-2">
                                    <p className="text-zinc-400 font-medium text-[9px] mb-2 leading-relaxed">
                                        {t('transfer.disclaimer')}
                                    </p>
                                    <p className="text-zinc-400 font-medium text-[9px] mb-4 leading-relaxed">
                                        {t('transfer.promo_text')} <br />
                                        <span className="text-[#00a8e8] underline">www.artosku.web.id</span>
                                    </p>
                                </div>

                                <div className="h-px bg-zinc-100 w-full mb-6"></div>

                                {/* Regulatory Footer */}
                                <div className="flex items-center gap-3 w-full">
                                    <div className="flex items-center gap-1 grayscale opacity-50 shrink-0">
                                        <div className="w-10 h-5 bg-emerald-700 rounded-sm flex items-center justify-center overflow-hidden">
                                            <span className="text-[7px] text-white font-black italic">AK</span>
                                        </div>
                                    </div>
                                    <p className="text-zinc-400 font-medium text-[7px] leading-tight">
                                        PT ArtosKu Finansial Terdaftar dan diawasi oleh OJK, Bank Indonesia dan merupakan peserta penjaminan LPS.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="w-full max-w-[340px] px-4 mt-12 space-y-3">
                            {!isFavorite && (
                                <button
                                    onClick={handleToggleFavorite}
                                    className="w-full h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all flex items-center justify-center gap-2 mb-2"
                                >
                                    <i className="fa-solid fa-user-plus text-sm"></i>
                                    <span>{t('transfer.save_contact')}</span>
                                </button>
                            )}
                            <button
                                onClick={handleShareProof}
                                className="w-full h-12 rounded-xl bg-zinc-900 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-share-nodes text-sm"></i>
                                <span>{t('transfer.share_proof')}</span>
                            </button>
                            <button
                                onClick={() => {
                                    setIsSuccess(false);
                                    onClose();
                                    setAmount('');
                                    setRecipientEmail('');
                                    setRecipientName(null);
                                    setDescription('');
                                }}
                                className="w-full h-12 rounded-xl bg-white border border-zinc-200 text-zinc-900 font-black text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-sm"
                            >
                                {t('common.done')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterUserTransferModal;

