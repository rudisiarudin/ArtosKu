
import React, { useMemo } from 'react';
import { Wallet, Transaction, TransactionType, WalletType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  PlusCircle, 
  MinusCircle, 
  TrendingUp, 
  TrendingDown, 
  Vault, 
  Pencil, 
  Building2, 
  Smartphone, 
  Coins, 
  Wallet as WalletIcon,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

interface DepositProps {
    wallets: Wallet[];
    transactions: Transaction[];
    onDeposit: () => void; // Trigger TopupModal (Transfer In)
    onWithdraw: () => void; // Trigger TransferModal (Transfer Out)
    onUpdateBalance: (walletId: string, newBalance: number, diff: number) => void;
    onUpdateBalanceRequest: (wallet: Wallet) => void;
}

const Deposit: React.FC<DepositProps> = ({ wallets, transactions, onDeposit, onWithdraw, onUpdateBalance, onUpdateBalanceRequest }) => {
    const { lang, t } = useLanguage();

    const formatIDR = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            maximumFractionDigits: 0
        }).format(val);
    };

    // Filter only Investment wallets (which are treated as Deposits/Savings)
    const depositWallets = useMemo(() => {
        return wallets.filter(w => w.type === WalletType.INVESTMENT);
    }, [wallets]);

    const depositWalletIds = useMemo(() => new Set(depositWallets.map(w => w.id)), [depositWallets]);

    const depositTransactions = useMemo(() => {
        return transactions
            .filter(t => depositWalletIds.has(t.walletId))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, depositWalletIds]);

    const { totalDeposit, totalInvested, estimatedProfit, profitPercentage } = useMemo(() => {
        const currentTotal = depositWallets.reduce((sum, w) => sum + Number(w.balance), 0);

        let initialBalanceBacktracked = 0;
        let capitalInjections = 0;

        depositWallets.forEach(w => {
            const walletTx = transactions.filter(tx => tx.walletId === w.id);
            const netFlow = walletTx.reduce((sum, tx) => {
                const isIncrease = tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT;
                return sum + (isIncrease ? Number(tx.amount) : -Number(tx.amount));
            }, 0);
            initialBalanceBacktracked += (Number(w.balance) - netFlow);

            walletTx.forEach(tx => {
                const isCapital = tx.category === 'Topup' || tx.category === 'Transfer' || tx.category === 'Loan';
                const isIncrease = tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT;
                if (isCapital && isIncrease) capitalInjections += Number(tx.amount);
                if (isCapital && !isIncrease) capitalInjections -= Number(tx.amount);
            });
        });

        const totalCapital = initialBalanceBacktracked + capitalInjections;
        const profit = currentTotal - totalCapital;
        const percent = totalCapital !== 0 ? (profit / totalCapital) * 100 : 0;

        return {
            totalDeposit: currentTotal,
            totalInvested: totalCapital,
            estimatedProfit: profit,
            profitPercentage: percent
        };
    }, [depositWallets, transactions]);

    return (
        <div className="flex flex-col pb-32 animate-fade-in px-5">
            <div className="pb-8 pt-2">
                <section className="bg-gradient-to-br from-card to-muted/20 border border-border/10 rounded-[32px] p-7 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] pointer-events-none" />
                    
                    <div className="flex flex-col items-center text-center relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 mb-3">{t('savings.total_savings')}</span>
                        <h1 className="text-3xl font-black tracking-tighter tabular-nums mb-3 text-foreground">
                            Rp{formatIDR(totalDeposit)}
                        </h1>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black tabular-nums ${estimatedProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                            {estimatedProfit >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            <span>{estimatedProfit >= 0 ? '+' : ''}Rp{formatIDR(estimatedProfit)} <span className="opacity-40 ml-1">({profitPercentage.toFixed(1)}%)</span></span>
                        </div>
                        <p className="text-[9px] font-black text-muted-foreground/30 mt-6 tracking-widest uppercase">{t('savings.true_capital').replace('{amount}', `Rp${formatIDR(totalInvested)}`)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <button
                            onClick={onDeposit}
                            className="h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:bg-emerald-500 hover:text-white"
                        >
                            <PlusCircle size={14} className="opacity-70" />
                            <span>{t('savings.deposit')}</span>
                        </button>
                        <button
                            onClick={onWithdraw}
                            className="h-12 rounded-2xl bg-muted/30 border border-border/10 flex items-center justify-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:bg-muted hover:text-foreground"
                        >
                            <MinusCircle size={14} className="opacity-50" />
                            <span>{t('savings.withdraw')}</span>
                        </button>
                    </div>
                </section>
            </div>

            <section className="flex-1">
                <div className="flex items-center justify-between mb-5 px-1">
                    <h3 className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/40 uppercase">{t('savings.active_assets')}</h3>
                </div>

                <div className="space-y-3">
                    {depositWallets.length === 0 ? (
                        <div className="text-center py-16 bg-muted/10 rounded-[32px] border border-dashed border-border/20">
                            <Vault size={32} className="mx-auto mb-4 text-muted-foreground/20" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{t('savings.no_savings')}</p>
                        </div>
                    ) : (
                        depositWallets.map((w, idx) => (
                            <div key={w.id} className="bg-muted/20 border border-border/10 rounded-[28px] p-4 flex items-center justify-between group active:scale-[0.98] transition-all animate-in slide-in-from-bottom-2 duration-500 backdrop-blur-sm" style={{ animationDelay: `${idx * 100}ms` }}>
                                <div className="flex items-center gap-4">
                                    <div className="size-11 rounded-2xl bg-muted/40 border border-border/10 flex items-center justify-center text-muted-foreground group-hover:text-emerald-500 transition-colors">
                                        {w.type === WalletType.BANK ? <Building2 size={20} /> : w.type === WalletType.EWALLET ? <Smartphone size={20} /> : w.type === WalletType.CASH ? <Coins size={20} /> : <WalletIcon size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="text-[12px] font-black tracking-tight text-foreground/90 uppercase truncate max-w-[120px]">{w.name}</h4>
                                        <p className="text-[9px] font-bold text-muted-foreground/40 tracking-widest uppercase">{t(`wallet.${w.type.toLowerCase()}`)}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <p className="text-[13px] font-black tabular-nums text-foreground tracking-tight">
                                            Rp{formatIDR(w.balance)}
                                        </p>
                                        <p className="text-[8px] font-black text-muted-foreground/40 tracking-widest uppercase">{t('savings.live_balance')}</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdateBalanceRequest(w);
                                        }}
                                        className="size-9 rounded-xl bg-muted/30 border border-border/10 text-muted-foreground flex items-center justify-center hover:text-foreground hover:bg-muted transition-all active:scale-75"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="mt-10 mb-8">
                <div className="flex items-center justify-between mb-6 px-1">
                    <h3 className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/40 uppercase">{t('savings.recent_activity')}</h3>
                </div>

                <div className="space-y-6 px-1">
                    {depositTransactions.length === 0 ? (
                        <p className="text-[9px] text-muted-foreground/30 font-black uppercase tracking-widest text-center py-4">{t('savings.no_activity')}</p>
                    ) : (
                        depositTransactions.slice(0, 5).map((t_item, idx) => (
                            <div key={t_item.id} className="flex items-center justify-between group animate-in fade-in duration-700" style={{ animationDelay: `${idx * 150}ms` }}>
                                <div className="flex items-center gap-4">
                                    <div className={`size-8 rounded-xl flex items-center justify-center ${t_item.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {t_item.type === TransactionType.INCOME ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-foreground/80 uppercase tracking-tight">{t_item.description}</p>
                                        <p className="text-[8px] text-muted-foreground/40 font-black uppercase tracking-widest">{new Date(t_item.date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                </div>
                                <span className={`text-[11px] font-black tabular-nums tracking-tight ${t_item.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-muted-foreground/40'}`}>
                                    {t_item.type === TransactionType.INCOME ? '+' : '-'}Rp{formatIDR(t_item.amount)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
};

export default Deposit;
