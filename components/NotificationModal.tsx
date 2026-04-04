
import React from 'react';
import { Wallet, Debt, TransactionType } from '../types';
import { markNotificationRead } from '../lib/database';

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    wallets: Wallet[];
    debts: Debt[];
    theme: 'light' | 'dark';
    notifications?: any[];
    onRefresh?: () => void;
    onNavigate?: (tab: string) => void;
}

interface FinancialAlert {
    id: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    title: string;
    message: string;
    icon: string;
    isRead?: boolean;
    dbId?: string;
    date?: string;
    action?: string;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, wallets, debts, notifications = [], onRefresh, onNavigate }) => {
    const alerts = React.useMemo(() => {
        const list: FinancialAlert[] = [];
        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);

        // 1. Add DB Notifications
        notifications.forEach(n => {
            list.push({
                id: n.id,
                dbId: n.id,
                type: n.type as any,
                title: n.title,
                message: n.message,
                icon: n.type === 'success' ? 'fa-circle-check' : 'fa-bell',
                isRead: n.is_read,
                date: n.created_at
            });
        });

        // 2. Check for Low Balance
        wallets.forEach(w => {
            if (Number(w.balance) < 100000) {
                list.push({
                    id: `low-balance-${w.id}`,
                    type: 'warning',
                    title: 'Low Balance Alert',
                    message: `Your ${w.name} balance is below Rp 100.000`,
                    icon: 'fa-triangle-exclamation'
                });
            }
        });

        // 3. Check for Upcoming Debts
        debts.filter(d => !d.isPaid).forEach(d => {
            const dueDate = new Date(d.dueDate);
            if (dueDate <= threeDaysFromNow && dueDate >= now) {
                list.push({
                    id: `debt-${d.id}`,
                    type: d.type === TransactionType.DEBT ? 'danger' : 'info',
                    title: d.type === TransactionType.DEBT ? 'Debt Due Soon' : 'Payment Expected',
                    message: `${d.title} is due on ${new Date(d.dueDate).toLocaleDateString('id-ID')}`,
                    icon: d.type === TransactionType.DEBT ? 'fa-hand-holding-dollar' : 'fa-hand-holding-hand',
                    action: 'debt'
                });
            }
        });

        // 4. Check for Overdue Debts (past due date)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        debts.filter(d => !d.isPaid).forEach(d => {
            const dueDate = new Date(d.dueDate);
            const dueDateNorm = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            if (dueDateNorm < today) {
                const diffTime = today.getTime() - dueDateNorm.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                list.push({
                    id: `overdue-${d.id}`,
                    type: 'danger',
                    title: d.type === TransactionType.DEBT ? '⚠️ Hutang Jatuh Tempo!' : '⏰ Piutang Melewati Jatuh Tempo',
                    message: `${d.title} jatuh tempo pada ${dueDate.toLocaleDateString('id-ID')} (${diffDays} hari lalu) — Rp ${d.amount.toLocaleString('id-ID')}`,
                    icon: 'fa-clock-rotate-left',
                    action: 'debt'
                });
            }
        });

        // Sort by date (if available) and then unread status
        return list.sort((a, b) => {
            if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
            if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
            return 0;
        });
    }, [wallets, debts, notifications]);

    const handleAlertClick = async (alert: FinancialAlert) => {
        // Mark as read if it's a DB notification
        if (alert.dbId && !alert.isRead) {
            try {
                await markNotificationRead(alert.dbId);
                onRefresh?.();
            } catch (err) {
                console.error('Error marking notification read:', err);
            }
        }
        // Navigate if alert has an action
        if (alert.action && onNavigate) {
            onNavigate(alert.action);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-start justify-center pt-24 px-6 pointer-events-none">
            <div
                className="fixed inset-0 bg-[rgba(var(--bg-deep-rgb),0.4)] backdrop-blur-md animate-in fade-in duration-700 pointer-events-auto"
                onClick={onClose}
            ></div>

            <div className="relative bg-[rgba(var(--bg-deep-rgb),0.9)] w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-10 duration-700 elite-glow pointer-events-auto">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>

                <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <div>
                        <h3 className="text-[9px] font-bold tracking-[0.2em] text-[var(--text-muted)] opacity-50 uppercase">Activity Center</h3>
                        <p className="text-[8px] font-bold text-[var(--text-muted)] opacity-50 tracking-wider">Financial intelligence alerts</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all active:scale-90 press-scale">
                        <i className="fa-solid fa-chevron-up text-[10px]"></i>
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 no-scrollbar">
                    {alerts.length > 0 ? (
                        alerts.map((alert, i) => (
                            <div
                                key={alert.id}
                                onClick={() => handleAlertClick(alert)}
                                style={{ animationDelay: `${i * 100}ms` }}
                                className={`p-4 rounded-2xl border flex items-start gap-3 transition-all animate-fade-up relative ${alert.action ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''} ${alert.isRead ? 'opacity-40 grayscale-[0.5]' : ''} ${alert.type === 'warning' ? 'bg-amber-500/[0.03] border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]' :
                                    alert.type === 'danger' ? 'bg-rose-500/[0.03] border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.05)]' :
                                        alert.type === 'success' ? 'bg-emerald-500/[0.03] border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' :
                                            'bg-blue-500/[0.03] border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${alert.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                                    alert.type === 'danger' ? 'bg-rose-500/10 text-rose-500' :
                                        alert.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                                            'bg-blue-500/10 text-blue-400'
                                    }`}>
                                    <i className={`fa-solid ${alert.icon} text-xs`}></i>
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="text-[12px] font-bold text-[var(--text-primary)] tracking-tight truncate">{alert.title}</h4>
                                        {alert.date && (
                                            <span className="text-[7px] text-[var(--text-muted)] opacity-40 font-black uppercase tracking-tighter shrink-0">
                                                {new Date(alert.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-[var(--text-muted)] opacity-60 font-medium leading-relaxed">{alert.message}</p>
                                    {alert.action && (
                                        <div className="flex items-center gap-1 mt-1.5">
                                            <span className="text-[8px] font-bold text-[var(--text-primary)] opacity-50 tracking-wider uppercase">Lihat Detail</span>
                                            <i className="fa-solid fa-chevron-right text-[7px] text-[var(--text-primary)] opacity-40"></i>
                                        </div>
                                    )}
                                </div>
                                {!alert.isRead && alert.dbId && (
                                    <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-14 text-center flex flex-col items-center justify-center animate-fade-up">
                            <div className="w-20 h-20 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-5 shadow-inner">
                                <i className="fa-solid fa-face-smile-wink text-2xl opacity-40"></i>
                            </div>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] opacity-50 tracking-[0.15em] uppercase">Status: Optimal</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] opacity-50 mt-1">No pending alerts at this moment</p>
                        </div>
                    )}
                </div>

                <div className="p-5 bg-[rgba(var(--bg-deep-rgb),0.3)] border-t border-[var(--border-subtle)] flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-[8px] font-bold text-[var(--text-muted)] opacity-50 tracking-[0.2em] uppercase">
                        AI Shield Active
                    </p>
                </div>
            </div>
        </div >
    );
};

export default NotificationModal;
