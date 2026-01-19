import React, { useState, useMemo } from 'react';
import { TransactionType, Debt, Wallet } from '../types';
import { getLocalIsoDate } from '../lib/utils';
import RepaymentModal from './RepaymentModal';

interface DebtManagementProps {
    debts: Debt[];
    wallets: Wallet[];
    onAddDebt: (debt: Debt) => void;
    onUpdateDebt: (debt: Debt) => void;
    onDeleteDebt: (id: string) => void;
    onBack: () => void;
    onAddTransaction: (t: any) => void;
}

const DebtManagement: React.FC<DebtManagementProps> = React.memo(({
    debts,
    wallets,
    onAddDebt,
    onUpdateDebt,
    onDeleteDebt,
    onBack,
    onAddTransaction
}) => {
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        dueDate: getLocalIsoDate(),
        type: TransactionType.DEBT,
        walletId: wallets[0]?.id || ''
    });
    const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);

    const formatIDR = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            maximumFractionDigits: 0
        }).format(val);
    };

    const totals = useMemo(() => {
        const hutang = debts
            .filter(d => d.type === TransactionType.DEBT && !d.isPaid)
            .reduce((sum, d) => sum + d.amount, 0);
        const piutang = debts
            .filter(d => d.type === TransactionType.RECEIVABLE && !d.isPaid)
            .reduce((sum, d) => sum + d.amount, 0);
        const netValue = piutang - hutang;
        return { hutang, piutang, netValue };
    }, [debts]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.amount || !formData.walletId) return;

        const newDebt: Debt = {
            id: crypto.randomUUID(),
            title: formData.title,
            amount: parseFloat(formData.amount),
            initialAmount: parseFloat(formData.amount),
            dueDate: formData.dueDate,
            type: formData.type as TransactionType.DEBT | TransactionType.RECEIVABLE,
            isPaid: false,
            walletId: formData.walletId
        };

        onAddDebt(newDebt);

        onAddTransaction({
            amount: newDebt.amount,
            type: newDebt.type,
            category: 'Loan',
            description: `New ${newDebt.type === TransactionType.DEBT ? 'Hutang' : 'Piutang'}: ${newDebt.title}`,
            date: new Date().toISOString(),
            walletId: newDebt.walletId
        });

        setFormData({ ...formData, title: '', amount: '' });
        setShowAddForm(false);
    };

    const handlePaymentConfirm = (amount: number) => {
        if (!selectedDebtForPayment) return;
        const debt = selectedDebtForPayment;

        const newAmount = debt.amount - amount;
        const isNowPaid = newAmount <= 0;

        onUpdateDebt({
            ...debt,
            amount: Math.max(0, newAmount),
            isPaid: isNowPaid
        });

        onAddTransaction({
            amount: amount,
            type: debt.type === TransactionType.DEBT ? TransactionType.EXPENSE : TransactionType.INCOME,
            category: 'Others',
            description: `Payment for ${debt.title} (${amount >= debt.amount ? 'Full' : 'Partial'})`,
            date: new Date().toISOString(),
            walletId: debt.walletId
        });

        setSelectedDebtForPayment(null);
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white pb-32 animate-in fade-in duration-500">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-12 pb-6 text-center bg-black/80 backdrop-blur-xl border-b border-white/5 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={onBack} className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white transition-colors border border-white/5">
                        <i className="fa-solid fa-arrow-left text-xs"></i>
                    </button>
                    <h2 className="text-[15px] font-bold tracking-tight">Debt Performance</h2>
                    <button onClick={() => setShowAddForm(true)} className="w-9 h-9 rounded-full bg-[#00d293]/10 text-[#00d293] flex items-center justify-center active:scale-90 transition-transform">
                        <i className="fa-solid fa-plus text-xs"></i>
                    </button>
                </div>

                <div className="flex border-b border-white/5">
                    {['ACTIVE', 'HISTORY'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-3 text-[11px] font-semibold tracking-[0.2em] transition-all relative ${activeTab === tab ? 'text-[#00d293]' : 'text-zinc-600'}`}
                        >
                            {tab}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00d293] shadow-[0_0_10px_rgba(0,210,147,0.5)]" />}
                        </button>
                    ))}
                </div>
            </header>

            {/* Spacer for fixed header */}
            <div className="h-[220px]"></div>

            <div className="px-5 pt-8 space-y-6">
                {/* Summary View */}
                <section className="bg-zinc-900/30 border border-white/5 rounded-[1.5rem] p-5">
                    <div className="flex items-center gap-2 mb-2 text-zinc-500">
                        <span className="text-[10px] font-semibold uppercase tracking-widest">Net Debt Position</span>
                        <i className="fa-solid fa-circle-info text-[10px]"></i>
                    </div>
                    <div className="mb-6">
                        <h1 className={`text-[24px] font-bold tracking-tighter ${totals.netValue >= 0 ? 'text-[#00d293]' : 'text-[#FF5252]'}`}>
                            {totals.netValue >= 0 ? '+' : ''}Rp{formatIDR(totals.netValue)}
                        </h1>
                        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-1">Unrealized Liability</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                        <div className="space-y-1">
                            <p className="text-[9px] font-semibold text-rose-500 uppercase tracking-widest">TOTAL DEBT</p>
                            <p className="text-[13px] font-bold tabular-nums">Rp{formatIDR(totals.hutang)}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-widest">RECEIVABLE</p>
                            <p className="text-[13px] font-bold tabular-nums">Rp{formatIDR(totals.piutang)}</p>
                        </div>
                    </div>
                </section>

                {/* Performance List */}
                <section className="mt-8">
                    <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 border-b border-white/5 mb-2">
                        <div className="col-span-6">Label / Code</div>
                        <div className="col-span-6 text-right">Remaining P&L</div>
                    </div>

                    <div className="space-y-1">
                        {debts.filter(d => activeTab === 'ACTIVE' ? !d.isPaid : d.isPaid).map(debt => (
                            <div key={debt.id} className="grid grid-cols-12 px-4 py-4 items-center bg-zinc-900/10 border border-transparent active:border-[#00d293]/30 active:bg-zinc-900/40 rounded-2xl transition-all group overflow-hidden">
                                <div className="col-span-6 flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${debt.type === TransactionType.DEBT ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        {debt.title.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[12px] font-bold tracking-tight text-white uppercase truncate">{debt.title}</h4>
                                        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest truncate">
                                            {(() => {
                                                const d = new Date(debt.dueDate);
                                                // Ensure local display by using properties instead of just UTC
                                                return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                                            })()}
                                        </p>
                                    </div>
                                </div>
                                <div className="col-span-6 text-right">
                                    <p className="text-[13px] font-bold tracking-tight text-white mb-0.5 tabular-nums">Rp{formatIDR(debt.amount)}</p>
                                    <div className="flex items-center justify-end gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${debt.isPaid ? 'bg-zinc-700' : (debt.type === TransactionType.DEBT ? 'bg-rose-500' : 'bg-emerald-500')}`} />
                                        <p className={`text-[10px] font-medium tabular-nums ${debt.isPaid ? 'text-zinc-500' : (debt.type === TransactionType.DEBT ? 'text-rose-400' : 'text-emerald-400')}`}>
                                            {debt.isPaid ? 'CLOSED' : (debt.amount < (debt.initialAmount || debt.amount) ? 'PARTIAL' : 'OPEN')}
                                        </p>
                                    </div>

                                    {!debt.isPaid && (
                                        <div className="flex justify-end gap-2 mt-3 scale-90 origin-right">
                                            <button
                                                onClick={() => setSelectedDebtForPayment(debt)}
                                                className="px-4 py-1.5 rounded-lg bg-zinc-800 text-white text-[9px] font-semibold uppercase tracking-widest hover:bg-zinc-700"
                                            >
                                                Pay / Settle
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {debts.filter(d => activeTab === 'ACTIVE' ? !d.isPaid : d.isPaid).length === 0 && (
                            <div className="py-20 text-center rounded-[2rem] border border-white/5 bg-zinc-900/10 flex flex-col items-center justify-center opacity-60">
                                <i className="fa-solid fa-layer-group text-2xl text-zinc-800 mb-4"></i>
                                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.2em]">No {activeTab.toLowerCase()} items</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Add form modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAddForm(false)}></div>
                    <div className="bg-zinc-900 w-full max-w-[360px] p-6 rounded-[2.5rem] border border-white/5 relative z-10 animate-in slide-in-from-bottom-10 duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-400 px-1">Pinjam / Pinjamkan Uang</h3>
                            <button onClick={() => setShowAddForm(false)} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                                <i className="fa-solid fa-times text-xs"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-1">Counterparty / Label</p>
                                <input
                                    type="text"
                                    placeholder="e.g. Hutang Teman"
                                    className="w-full h-12 bg-black rounded-2xl px-5 text-[12px] font-semibold text-white border border-white/5 focus:border-[#00d293]/50 outline-none transition-all"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-1">Amount (IDR)</p>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        className="w-full h-12 bg-black rounded-2xl px-5 text-[12px] font-semibold text-white border border-white/5 focus:border-[#00d293]/50 outline-none transition-all tabular-nums"
                                        value={formData.amount ? Number(formData.amount).toLocaleString('id-ID') : ''}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setFormData({ ...formData, amount: val });
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-1">Due Date</p>
                                    <input
                                        type="date"
                                        className="w-full h-12 bg-black rounded-2xl px-5 text-[12px] font-semibold text-white border border-white/5 focus:border-[#00d293]/50 outline-none transition-all"
                                        value={formData.dueDate}
                                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: TransactionType.DEBT })}
                                    className={`h-12 rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-all ${formData.type === TransactionType.DEBT ? 'bg-rose-500 text-white' : 'bg-black border border-white/5 text-zinc-500'}`}
                                >
                                    HUTANG
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: TransactionType.RECEIVABLE })}
                                    className={`h-12 rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-all ${formData.type === TransactionType.RECEIVABLE ? 'bg-emerald-500 text-black' : 'bg-black border border-white/5 text-zinc-500'}`}
                                >
                                    PIUTANG
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest px-1">Settlement Wallet</p>
                                <select
                                    className="w-full h-12 bg-black rounded-2xl px-5 text-[12px] font-semibold text-white border border-white/5 focus:border-[#00d293]/50 outline-none appearance-none"
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23444\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '12px' }}
                                    value={formData.walletId}
                                    onChange={e => setFormData({ ...formData, walletId: e.target.value })}
                                >
                                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full h-14 bg-[#00d293] text-black rounded-full text-[12px] font-semibold uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(0,210,147,0.2)] active:scale-[0.98] transition-all mt-4"
                            >
                                Open Position
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <RepaymentModal
                isOpen={!!selectedDebtForPayment}
                onClose={() => setSelectedDebtForPayment(null)}
                debt={selectedDebtForPayment}
                onConfirm={handlePaymentConfirm}
            />
        </div>
    );
});

export default DebtManagement;
