
import React, { useMemo } from 'react';
import { Wallet, Transaction, TransactionType, WalletType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
        <div className="flex flex-col pb-32 animate-fade-in">
            <div className="px-4 pb-6">
                <section className="bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] rounded-xl p-5 relative overflow-hidden animate-card-entrance">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex flex-col items-center text-center relative z-10">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60 mb-2">{t('savings.total_savings')}</span>
                        <h1 className="text-2xl font-bold tracking-tighter tabular-nums mb-2 text-[var(--text-primary)]">
                            Rp{formatIDR(totalDeposit)}
                        </h1>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold ${estimatedProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                            <i className={`fa-solid ${estimatedProfit >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
                            <span>{estimatedProfit >= 0 ? '+' : ''}Rp{formatIDR(estimatedProfit)} <span className="opacity-40 ml-1">({profitPercentage.toFixed(1)}%)</span></span>
                        </div>
                        <p className="text-[9px] font-bold text-[var(--text-muted)] opacity-50 mt-5 tracking-widest uppercase">{t('savings.true_capital').replace('{amount}', `Rp${formatIDR(totalInvested)}`)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button
                            onClick={onDeposit}
                            className="h-9 rounded-lg bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] flex items-center justify-center gap-2 text-emerald-500 font-bold text-[9px] uppercase tracking-widest active:scale-95 transition-all"
                        >
                            <i className="fa-solid fa-plus-circle text-xs opacity-50"></i>
                            <span>{t('savings.deposit')}</span>
                        </button>
                        <button
                            onClick={onWithdraw}
                            className="h-9 rounded-lg bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] flex items-center justify-center gap-2 text-[var(--text-muted)] opacity-60 font-bold text-[9px] uppercase tracking-widest active:scale-95 transition-all"
                        >
                            <i className="fa-solid fa-minus-circle text-sm opacity-20"></i>
                            <span>{t('savings.withdraw')}</span>
                        </button>
                    </div>
                </section>
            </div>

            <section className="px-5 flex-1">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[9px] font-bold tracking-[0.2em] text-[var(--text-muted)] opacity-60 uppercase">{t('savings.active_assets')}</h3>
                </div>

                <div className="space-y-2">
                    {depositWallets.length === 0 ? (
                        <div className="text-center py-12 opacity-30">
                            <i className="fa-solid fa-vault text-3xl mb-4 text-[var(--text-muted)] opacity-50"></i>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-primary)]">{t('savings.no_savings')}</p>
                        </div>
                    ) : (
                        depositWallets.map(w => (
                            <div key={w.id} className="bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center justify-between group active:scale-[0.98] transition-all animate-list-enter card-press" style={{ animationDelay: `${(depositWallets.indexOf(w)) * 80}ms` }}>
                                <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-lg bg-[rgba(var(--bg-inner-rgb),0.5)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] opacity-60 group-hover:text-emerald-500 transition-colors">
                                        <i className={`fa-solid ${w.icon || 'fa-chart-line'} text-xs`}></i>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-bold tracking-tight text-[var(--text-primary)] opacity-80 uppercase mb-0.5">{w.name}</h4>
                                        <p className="text-[8px] font-bold text-[var(--text-muted)] opacity-50 tracking-widest uppercase">{t(`wallet.${w.type.toLowerCase()}`)}</p>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[11px] font-bold tabular-nums text-[var(--text-primary)] opacity-90">
                                            Rp{formatIDR(w.balance)}
                                        </p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateBalanceRequest(w);
                                            }}
                                            className="size-6 rounded-md bg-[rgba(var(--bg-inner-rgb),0.5)] border border-[var(--border-subtle)] text-[var(--text-muted)] opacity-50 flex items-center justify-center hover:text-[var(--text-primary)] transition-all active:scale-90"
                                            title="Update Balance"
                                        >
                                            <i className="fa-solid fa-pen text-[8px]"></i>
                                        </button>
                                    </div>
                                    <p className="text-[8px] font-bold text-[var(--text-muted)] opacity-50 tracking-widest uppercase">{t('savings.live_balance')}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="px-5 pb-20 mt-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[9px] font-bold tracking-[0.2em] text-[var(--text-muted)] opacity-60 uppercase">{t('savings.recent_activity')}</h3>
                </div>

                <div className="space-y-5">
                    {depositTransactions.length === 0 ? (
                        <p className="text-[9px] text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest text-center py-4">{t('savings.no_activity')}</p>
                    ) : (
                        depositTransactions.slice(0, 5).map(t_item => (
                            <div key={t_item.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`size-7 rounded-lg flex items-center justify-center ${t_item.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        <i className={`fa-solid ${t_item.type === TransactionType.INCOME ? 'fa-arrow-down' : 'fa-arrow-up'} text-[10px] ${t_item.type === TransactionType.INCOME ? '' : 'rotate-180'}`}></i>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-[var(--text-primary)] opacity-70 uppercase tracking-tight">{t_item.description}</p>
                                        <p className="text-[7px] text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest">{new Date(t_item.date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold tabular-nums ${t_item.type === TransactionType.INCOME ? 'text-emerald-500/80' : 'text-[var(--text-secondary)] opacity-40'}`}>
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
