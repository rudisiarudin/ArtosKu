
import React, { useState, useMemo } from 'react';
import { Wallet, Transaction, TransactionType, WalletType } from '../types';
import { formatIDR } from '../lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DepositProps {
    wallets: Wallet[];
    transactions: Transaction[];
    onDeposit: () => void; // Trigger TopupModal (Transfer In)
    onWithdraw: () => void; // Trigger TransferModal (Transfer Out)
    onUpdateBalance: (walletId: string, newBalance: number, diff: number) => void;
    onUpdateBalanceRequest: (wallet: Wallet) => void;
}

const Deposit: React.FC<DepositProps> = ({ wallets, transactions, onDeposit, onWithdraw, onUpdateBalance, onUpdateBalanceRequest }) => {

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

        // To calculate "True Capital", we backtrack transactions.
        // CAPITAL = Initial Balance + Sum of Topups (Income with category 'Topup' or 'Loan' etc)
        // PROFIT = Growth beyond CAPITAL (Income from 'Investasi', 'Dividend', etc OR gains from Balance Updates)

        let initialBalanceBacktracked = 0;
        let capitalInjections = 0;

        depositWallets.forEach(w => {
            const walletTx = transactions.filter(t => t.walletId === w.id);
            const netFlow = walletTx.reduce((sum, t) => {
                const isIncrease = t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
                return sum + (isIncrease ? Number(t.amount) : -Number(t.amount));
            }, 0);
            initialBalanceBacktracked += (Number(w.balance) - netFlow);

            // Capital injections are Topups or Transfers into the account
            walletTx.forEach(t => {
                const isCapital = t.category === 'Topup' || t.category === 'Transfer' || t.category === 'Loan';
                const isIncrease = t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
                if (isCapital && isIncrease) capitalInjections += Number(t.amount);
                if (isCapital && !isIncrease) capitalInjections -= Number(t.amount);
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
        <div className="flex flex-col min-h-screen bg-black text-white pb-32 animate-in fade-in duration-500">
            <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-8 pb-4 bg-black/80 backdrop-blur-xl border-b border-white/5 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-zinc-500">My Savings</h2>
                </div>

                <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/5 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none -mr-16 -mt-16"></div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-2">Total Deposit</p>
                        <h1 className="text-[36px] font-black tracking-tighter text-white tabular-nums leading-none mb-2">
                            {formatIDR(totalDeposit)}
                        </h1>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${estimatedProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                            <i className={`fa-solid ${estimatedProfit >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-[10px]`}></i>
                            <span className="text-[10px] font-bold tracking-wider">
                                {estimatedProfit >= 0 ? '+' : ''}{formatIDR(estimatedProfit)} ({profitPercentage.toFixed(1)}%)
                            </span>
                        </div>
                        <p className="text-[9px] font-medium text-zinc-600 mt-2 uppercase tracking-widest leading-relaxed">
                            True Capital: {formatIDR(totalInvested)} <br />
                            <span className="opacity-40">(Baseline + Net Topups)</span>
                        </p>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <button
                            onClick={onDeposit}
                            className="h-12 bg-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-black shadow-[0_10px_20px_rgba(16,185,129,0.2)] active:scale-[0.98] transition-all group"
                        >
                            <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                <i className="fa-solid fa-arrow-down text-[10px]"></i>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Deposit In</span>
                        </button>
                        <button
                            onClick={onWithdraw}
                            className="h-12 bg-zinc-800 rounded-2xl flex items-center justify-center gap-2 text-white border border-white/5 active:scale-[0.98] transition-all group hover:bg-zinc-700"
                        >
                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                <i className="fa-solid fa-arrow-up text-[10px]"></i>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Withdraw</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Spacer for fixed header */}
            <div className="h-[380px]"></div>

            <section className="px-6 flex-1">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Active Assets</h3>
                </div>

                <div className="space-y-3">
                    {depositWallets.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <i className="fa-solid fa-vault text-4xl mb-3 text-zinc-700"></i>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500">No Deposit Assets Found</p>
                        </div>
                    ) : (
                        depositWallets.map(w => (
                            <div key={w.id} className="bg-zinc-900/40 border border-white/5 rounded-3xl p-4 flex items-center justify-between group active:scale-[0.98] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-[var(--text-muted)] group-hover:text-emerald-500 transition-colors">
                                        <i className={`fa-solid ${w.icon || 'fa-chart-line'} text-sm`}></i>
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-black uppercase tracking-tight text-white mb-0.5">{w.name}</h4>
                                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{w.type}</p>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[15px] font-black tabular-nums text-white leading-none">
                                            {formatIDR(w.balance)}
                                        </p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateBalanceRequest(w);
                                            }}
                                            className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all active:scale-90 relative z-20"
                                            title="Update Balance"
                                        >
                                            <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                                        </button>
                                    </div>
                                    <p className="text-[8px] font-bold text-zinc-700 uppercase tracking-[0.2em]">Live Balance</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="px-6 pb-20">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Recent Activity</h3>
                </div>

                <div className="space-y-4">
                    {depositTransactions.length === 0 ? (
                        <p className="text-[10px] text-zinc-600 text-center italic py-4">No recent history</p>
                    ) : (
                        depositTransactions.slice(0, 5).map(t => (
                            <div key={t.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        <i className={`fa-solid ${t.type === TransactionType.INCOME ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs transform rotate-45`}></i>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-white">{t.description}</p>
                                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{new Date(t.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className={`text-[11px] font-bold tabular-nums ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-white'}`}>
                                    {t.type === TransactionType.INCOME ? '+' : '-'}{formatIDR(t.amount)}
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
