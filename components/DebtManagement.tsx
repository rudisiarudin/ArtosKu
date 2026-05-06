
import React, { useState, useMemo } from 'react';
import { TransactionType, Debt, Wallet } from '../types';
import { getLocalIsoDate } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import RepaymentModal from './RepaymentModal';
import { Contacts } from '@capacitor-community/contacts';

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
    const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        phone: '',
        amount: '',
        dueDate: getLocalIsoDate(),
        type: TransactionType.DEBT,
        walletId: wallets[0]?.id || ''
    });
    const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);
    const { lang, t } = useLanguage();

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

    const handleOpenEditForm = (debt: Debt) => {
        setFormData({
            title: debt.title,
            phone: debt.phone || '',
            amount: debt.initialAmount.toString(),
            dueDate: debt.dueDate,
            type: debt.type,
            walletId: debt.walletId
        });
        setEditingDebtId(debt.id);
        setShowAddForm(true);
    };

    const handleOpenAddForm = () => {
        setFormData({
            title: '',
            phone: '',
            amount: '',
            dueDate: getLocalIsoDate(),
            type: TransactionType.DEBT,
            walletId: wallets[0]?.id || ''
        });
        setEditingDebtId(null);
        setShowAddForm(true);
    };

    const pickContact = async () => {
        try {
            const permission = await Contacts.requestPermissions();
            if (permission.contacts === 'granted') {
                const result = await Contacts.pickContact({ projection: { name: true, phones: true } });
                if (result.contact) {
                    let newFormData = { ...formData };
                    if (result.contact.phones && result.contact.phones.length > 0) {
                        newFormData.phone = result.contact.phones[0].number || '';
                    }
                    if (result.contact.name?.display && !formData.title) {
                        newFormData.title = result.contact.name.display;
                    }
                    setFormData(newFormData);
                }
            }
        } catch (error) {
            console.error('Error picking contact:', error);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.amount || !formData.walletId) return;

        if (editingDebtId) {
            const existingDebt = debts.find(d => d.id === editingDebtId);
            if (existingDebt) {
                // Determine new 'amount' based on payments made
                const paymentsMade = existingDebt.initialAmount - existingDebt.amount;
                const newInitialAmount = parseFloat(formData.amount);
                const newAmount = Math.max(0, newInitialAmount - paymentsMade);

                onUpdateDebt({
                    ...existingDebt,
                    title: formData.title,
                    phone: formData.phone || undefined,
                    initialAmount: newInitialAmount,
                    amount: newAmount,
                    dueDate: formData.dueDate,
                    type: formData.type as TransactionType.DEBT | TransactionType.RECEIVABLE,
                    isPaid: newAmount <= 0,
                    walletId: formData.walletId
                });
            }
        } else {
            const newDebt: Debt = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                title: formData.title,
                phone: formData.phone || undefined,
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
                description: `New ${newDebt.type === TransactionType.DEBT ? t('debt.loan') : t('debt.receivable_label')}: ${newDebt.title}`,
                date: new Date().toISOString(),
                walletId: newDebt.walletId
            });
        }

        setFormData({ ...formData, title: '', amount: '', phone: '' });
        setShowAddForm(false);
        setEditingDebtId(null);
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
            description: `Payment for ${debt.title} (${amount >= debt.amount ? t('debt.payment_full') : t('debt.payment_partial')})`,
            date: new Date().toISOString(),
            walletId: debt.walletId
        });

        setSelectedDebtForPayment(null);
    };

    return (
        <div className="flex flex-col min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] pb-32 page-enter">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-3 text-center bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-xl border-b border-[var(--border-subtle)] max-w-md mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={onBack} className="size-9 rounded-full bg-[rgba(var(--bg-card-rgb),0.4)] flex items-center justify-center text-[var(--text-muted)] active:scale-90 transition-all">
                        <i className="fa-solid fa-arrow-left text-sm"></i>
                    </button>
                    <h2 className="text-[var(--text-secondary)] text-sm font-medium leading-tight flex-1 text-center">{t('debt.performance')}</h2>
                    <button onClick={handleOpenAddForm} className="size-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center active:scale-90 transition-all">
                        <i className="fa-solid fa-plus text-sm"></i>
                    </button>
                </div>

                <div className="flex">
                    {['ACTIVE', 'HISTORY'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-3 text-[10px] font-bold tracking-[0.2em] uppercase transition-all relative ${activeTab === tab ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}
                        >
                            {t(`debt.${tab.toLowerCase()}`)}
                            {activeTab === tab && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full" />}
                        </button>
                    ))}
                </div>
            </header>



            <div className="px-5 pb-8 pt-[calc(11rem+env(safe-area-inset-top))] space-y-6">
                {/* Summary View */}
                <section className="bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] rounded-2xl p-5 animate-card-entrance">
                    <div className="flex items-center gap-2 mb-1.5 opacity-40">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{t('debt.net_debt_position')}</span>
                    </div>
                    <div className="mb-8">
                        <h1 className={`text-3xl font-bold tracking-tighter tabular-nums ${totals.netValue >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {totals.netValue >= 0 ? '+' : ''}Rp{formatIDR(totals.netValue)}
                        </h1>
                        <p className="text-[10px] font-medium text-[var(--text-muted)] tracking-widest mt-1">{t('debt.unrealized_liability')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[var(--border-subtle)]">
                        <div className="space-y-1">
                            <p className="text-[9px] font-semibold text-rose-500 tracking-widest">{t('debt.total_debt')}</p>
                            <p className="text-[13px] font-bold tabular-nums text-[var(--text-primary)]">Rp{formatIDR(totals.hutang)}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-[9px] font-semibold text-emerald-500 tracking-widest">{t('debt.receivable')}</p>
                            <p className="text-[13px] font-bold tabular-nums text-[var(--text-primary)]">Rp{formatIDR(totals.piutang)}</p>
                        </div>
                    </div>
                </section>

                {/* Performance List */}
                <section>
                    <div className="grid grid-cols-12 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-30 border-b border-[var(--border-subtle)] mb-3">
                        <div className="col-span-6">{t('debt.label_code')}</div>
                        <div className="col-span-6 text-right">{t('debt.remaining_balance')}</div>
                    </div>

                    <div className="space-y-2">
                        {debts.filter(d => activeTab === 'ACTIVE' ? !d.isPaid : d.isPaid).sort((a, b) => {
                            const today = new Date();
                            const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            const aDue = new Date(new Date(a.dueDate).getFullYear(), new Date(a.dueDate).getMonth(), new Date(a.dueDate).getDate());
                            const bDue = new Date(new Date(b.dueDate).getFullYear(), new Date(b.dueDate).getMonth(), new Date(b.dueDate).getDate());
                            const aIsOverdue = !a.isPaid && aDue < todayNorm;
                            const bIsOverdue = !b.isPaid && bDue < todayNorm;

                            if (aIsOverdue && !bIsOverdue) return -1;
                            if (!aIsOverdue && bIsOverdue) return 1;
                            return aDue.getTime() - bDue.getTime();
                        }).map(debt => {
                            const dueDate = new Date(debt.dueDate);
                            const today = new Date();
                            const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            const dueDateNorm = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                            const isOverdue = !debt.isPaid && dueDateNorm < todayNorm;
                            const daysOverdue = isOverdue ? Math.ceil((todayNorm.getTime() - dueDateNorm.getTime()) / (1000 * 60 * 60 * 24)) : 0;

                            if (debt.isPaid) {
                                return (
                                    <div key={debt.id} className="p-3 border rounded-2xl transition-all group relative animate-list-enter bg-[rgba(var(--bg-card-rgb),0.2)] border-emerald-500/10 opacity-80" style={{ animationDelay: `${debts.filter(d => d.isPaid).indexOf(debt) * 70}ms` }}>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-8 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                    <i className="fa-solid fa-check"></i>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] truncate uppercase">{debt.title}</h4>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[6px] font-bold tracking-[0.2em] text-emerald-500/70 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase border border-emerald-500/10">
                                                            {t('debt.closed')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className="text-[6px] font-bold text-[var(--text-muted)] opacity-30 tracking-[0.15em] uppercase mb-0.5">{t('debt.total_paid')}</p>
                                                    <p className="text-[11px] font-black tracking-tight text-[var(--text-secondary)] tabular-nums">Rp{formatIDR(debt.initialAmount)}</p>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEditForm(debt);
                                                    }}
                                                    className="size-6 rounded-sm flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--bg-card-rgb),0.4)] transition-all text-[9px]"
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={debt.id} className={`p-4 border rounded-2xl transition-all active:scale-[0.98] group relative animate-list-enter card-press overflow-hidden ${isOverdue ? 'bg-rose-500/[0.03] border-rose-500/20 shadow-[0_10px_30px_rgba(244,63,94,0.05)]' : 'bg-[var(--bg-card)] dark:bg-[rgba(var(--bg-card-rgb),0.4)] border-[var(--border-subtle)] hover:border-emerald-500/20'}`} style={{ animationDelay: `${debts.filter(d => activeTab === 'ACTIVE' ? !d.isPaid : d.isPaid).indexOf(debt) * 70}ms` }}>
                                    {isOverdue && (
                                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-rose-500/0 via-rose-500/30 to-rose-500/0 animate-pulse"></div>
                                    )}
                                    <div className="flex justify-between items-start mb-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`size-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-inner border ${isOverdue ? 'bg-rose-500/5 text-rose-400 animate-pulse border-rose-500/10' : (debt.type === TransactionType.DEBT ? 'bg-rose-500/5 text-rose-500 border-rose-500/10' : 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10')}`}>
                                                {isOverdue ? <i className="fa-solid fa-clock-rotate-left text-[10px]" /> : debt.title.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-[10px] font-bold tracking-wider text-[var(--text-primary)] opacity-80 truncate uppercase mb-0.5">{debt.title}</h4>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-[7px] font-semibold text-[var(--text-muted)] opacity-50 tracking-widest truncate uppercase">
                                                        {t('debt.due_date_label')}{(() => {
                                                            const d = new Date(debt.dueDate);
                                                            return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' });
                                                        })()}
                                                    </p>
                                                    {isOverdue && (
                                                        <span className="text-[5px] font-black tracking-[0.1em] text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/20 uppercase whitespace-nowrap">
                                                            {t('debt.days_late').replace('{days}', String(daysOverdue))}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenEditForm(debt);
                                            }}
                                            className="size-8 rounded-full flex flex-shrink-0 items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--bg-inner-rgb),0.5)] transition-all text-[10px]"
                                        >
                                            <i className="fa-solid fa-pen"></i>
                                        </button>
                                    </div>

                                    <div className="flex items-end justify-between mt-2 pt-3 border-t border-[var(--border-subtle)]">
                                        <div>
                                            <p className="text-[8px] font-black text-[var(--text-muted)] opacity-50 tracking-[0.1em] uppercase mb-1">{t('debt.remaining_bill')}</p>
                                            <p className="text-[15px] font-black tracking-tight text-[var(--text-primary)] tabular-nums">Rp{formatIDR(debt.amount)}</p>
                                        </div>

                                        <div className="flex items-center gap-2 flex-nowrap">
                                            {!debt.isPaid && debt.phone && (
                                                <a
                                                    href={`https://wa.me/${debt.phone.replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(t('debt.wa_message').replace('{title}', debt.title).replace('{amount}', formatIDR(debt.amount)).replace('{date}', new Date(debt.dueDate).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US')))}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`h-8 w-8 flex-shrink-0 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border ${isOverdue ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-[var(--bg-inner)] dark:bg-[var(--bg-inner)] text-emerald-600 dark:text-emerald-500 border-[var(--border-subtle)] hover:bg-emerald-500/10 hover:border-emerald-500/20'}`}
                                                >
                                                    <i className="fa-brands fa-whatsapp text-[14px]"></i>
                                                </a>
                                            )}

                                            {!debt.isPaid && (
                                                <button
                                                    onClick={() => setSelectedDebtForPayment(debt)}
                                                    className={`h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border flex-shrink-0 ${isOverdue
                                                        ? 'bg-rose-500 text-white border-rose-500 shadow-[0_8px_20px_rgba(244,63,94,0.2)]'
                                                        : 'bg-slate-900 dark:bg-[var(--text-primary)] text-white dark:text-[var(--bg-deep)] border-slate-900 dark:border-[var(--text-primary)] shadow-sm'}`}
                                                >
                                                    <span className="whitespace-nowrap">{isOverdue ? t('debt.pay_now') : t('debt.settle')}</span>
                                                    {isOverdue && <i className="fa-solid fa-chevron-right text-[7px]"></i>}
                                                </button>
                                            )}
                                            {debt.isPaid && (
                                                <div className="h-8 px-3 rounded-xl bg-[rgba(var(--text-primary-rgb),0.02)] flex items-center justify-center gap-1.5 border border-[var(--border-subtle)]">
                                                    <i className="fa-solid fa-check text-emerald-500 text-[8px]"></i>
                                                    <span className="text-[8px] font-black uppercase shadow-inner tracking-widest text-emerald-500 opacity-60">{t('debt.closed')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {debts.filter(d => activeTab === 'ACTIVE' ? !d.isPaid : d.isPaid).length === 0 && (
                            <div className="py-20 text-center rounded-2xl border border-[var(--border-subtle)] bg-[rgba(var(--bg-inner-rgb),0.5)] flex flex-col items-center justify-center">
                                <i className="fa-solid fa-layer-group text-3xl text-[var(--text-muted)] opacity-20 mb-4"></i>
                                <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase opacity-50">{t('debt.no_items').replace('{tab}', t(`debt.${activeTab.toLowerCase()}`))}</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Add form modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[rgba(var(--bg-deep-rgb),0.8)] modal-backdrop" onClick={() => setShowAddForm(false)}></div>
                    <div className="bg-[var(--bg-card)] w-full max-w-[360px] p-6 rounded-xl border border-[var(--border-subtle)] relative z-10 modal-sheet">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[12px] font-semibold tracking-[0.2em] text-[var(--text-muted)] px-1">{editingDebtId ? t('debt.edit_position') : t('debt.modal_title')}</h3>
                            <button onClick={() => { setShowAddForm(false); setEditingDebtId(null); }} className="w-9 h-9 rounded-full bg-[rgba(var(--bg-inner-rgb),0.5)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                                <i className="fa-solid fa-times text-xs"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <p className="text-[9px] font-semibold text-[var(--text-muted)] opacity-50 tracking-widest px-1">{t('debt.counterparty')}</p>
                                <input
                                    type="text"
                                    placeholder={t('debt.counterparty_placeholder')}
                                    className="w-full h-12 bg-[var(--bg-inner)] rounded-2xl px-5 text-[12px] font-semibold text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[#00d293]/50 outline-none transition-all"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[9px] font-semibold text-[var(--text-muted)] opacity-50 tracking-widest px-1">{t('debt.phone_optional')}</p>
                                <div className="flex gap-2">
                                    <input
                                        type="tel"
                                        placeholder={t('debt.phone_placeholder')}
                                        className="flex-1 h-12 bg-[var(--bg-inner)] rounded-2xl px-5 text-[12px] font-semibold text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[#00d293]/50 outline-none transition-all"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={pickContact}
                                        className="w-12 h-12 shrink-0 rounded-2xl bg-[#00d293]/10 text-[#00d293] flex items-center justify-center active:scale-95 transition-all outline-none"
                                        title="Pick contact from phonebook"
                                    >
                                        <i className="fa-regular fa-address-book text-lg"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-semibold text-[var(--text-muted)] opacity-50 tracking-widest px-1">{t('debt.amount')}</p>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        className="w-full h-11 bg-[var(--bg-inner)] rounded-xl px-5 text-[12px] font-semibold text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[#00d293]/50 outline-none transition-all tabular-nums"
                                        value={formData.amount ? Number(formData.amount).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US') : ''}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setFormData({ ...formData, amount: val });
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-semibold text-[var(--text-muted)] opacity-50 tracking-widest px-1">{t('debt.due_date')}</p>
                                    <input
                                        type="date"
                                        className="w-full h-11 bg-[var(--bg-inner)] rounded-xl px-5 text-[12px] font-semibold text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[#00d293]/50 outline-none transition-all"
                                        value={formData.dueDate}
                                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: TransactionType.DEBT })}
                                    className={`h-11 rounded-xl text-[10px] font-semibold tracking-widest transition-all ${formData.type === TransactionType.DEBT ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10' : 'bg-[var(--bg-inner)] border border-[var(--border-subtle)] text-[var(--text-muted)]'}`}
                                >
                                    {t('debt.loan')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: TransactionType.RECEIVABLE })}
                                    className={`h-11 rounded-xl text-[10px] font-semibold tracking-widest transition-all ${formData.type === TransactionType.RECEIVABLE ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' : 'bg-[var(--bg-inner)] border border-[var(--border-subtle)] text-[var(--text-muted)]'}`}
                                >
                                    {t('debt.receivable_label')}
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[9px] font-semibold text-[var(--text-muted)] opacity-50 tracking-widest px-1">{t('debt.settlement_wallet')}</p>
                                <select
                                    className="w-full h-11 bg-[var(--bg-inner)] rounded-xl px-5 text-[12px] font-semibold text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[#00d293]/50 outline-none appearance-none"
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23888\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '12px' }}
                                    value={formData.walletId}
                                    onChange={e => setFormData({ ...formData, walletId: e.target.value })}
                                >
                                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full h-13 py-3 rounded-xl bg-emerald-500 text-black text-[11px] font-bold tracking-[0.2em] shadow-2xl shadow-emerald-500/25 active:scale-[0.98] transition-all mt-4 uppercase border-none"
                            >
                                {editingDebtId ? t('debt.save_changes') : t('debt.open_position')}
                            </button>

                            {editingDebtId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm(t('debt.delete_confirm'))) {
                                            onDeleteDebt(editingDebtId);
                                            setShowAddForm(false);
                                            setEditingDebtId(null);
                                        }
                                    }}
                                    className="w-full py-3 rounded-xl bg-transparent border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-[10px] font-bold tracking-[0.2em] transition-all mt-2 uppercase"
                                >
                                    {t('debt.delete_bill')}
                                </button>
                            )}
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
