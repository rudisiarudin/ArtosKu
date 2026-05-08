import React from 'react';
import { Wallet, Debt, TransactionType } from '../types';
import { markNotificationRead } from '../lib/database';
import { 
  Bell, X, ShieldCheck, AlertTriangle, Clock, 
  HandCoins, CheckCircle2, ChevronRight, Zap, Info
} from 'lucide-react';
import { vibrate } from '@/lib/utils';

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
    icon: React.ElementType;
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
                icon: n.type === 'success' ? CheckCircle2 : Bell,
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
                    title: 'Liquidity Alert',
                    message: `${w.name} balance is critically low: Rp ${Number(w.balance).toLocaleString('id-ID')}`,
                    icon: AlertTriangle
                });
            }
        });

        // 3. Check for Upcoming/Overdue Debts
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
                    title: 'Payment Overdue',
                    message: `${d.title} is ${diffDays} days past due — Rp ${Number(d.amount).toLocaleString('id-ID')}`,
                    icon: Clock,
                    action: 'debt'
                });
            } else if (dueDateNorm <= threeDaysFromNow) {
                list.push({
                    id: `debt-${d.id}`,
                    type: d.type === TransactionType.DEBT ? 'warning' : 'info',
                    title: 'Upcoming Settlement',
                    message: `${d.title} settlement expected on ${dueDate.toLocaleDateString('id-ID')}`,
                    icon: HandCoins,
                    action: 'debt'
                });
            }
        });

        return list.sort((a, b) => {
            if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
            if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
            return 0;
        });
    }, [wallets, debts, notifications]);

    const handleAlertClick = async (alert: FinancialAlert) => {
        vibrate(5);
        if (alert.dbId && !alert.isRead) {
            try {
                await markNotificationRead(alert.dbId);
                onRefresh?.();
            } catch (err) {
                console.error('Error marking notification read:', err);
            }
        }
        if (alert.action && onNavigate) {
            onNavigate(alert.action);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-start bg-black/60 backdrop-blur-sm pt-20 px-6 animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-zinc-950 border border-white/5 rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-10 duration-500">
                {/* Institutional Header */}
                <div className="px-6 py-5 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                    <div>
                        <h3 className="text-[10px] font-black tracking-[0.4em] text-primary uppercase">Activity Hub</h3>
                        <p className="text-[9px] font-medium text-muted-foreground/30 tracking-tight mt-0.5">Real-time intelligence feed</p>
                    </div>
                    <button onClick={onClose} className="size-9 rounded-xl bg-zinc-900 flex items-center justify-center text-muted-foreground active:scale-90 transition-all">
                        <X size={18} strokeWidth={1.5} />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2 no-scrollbar">
                    {alerts.length > 0 ? (
                        alerts.map((alert, i) => (
                            <div
                                key={alert.id}
                                onClick={() => handleAlertClick(alert)}
                                className={`p-4 rounded-2xl flex items-start gap-4 transition-all relative ${alert.action ? 'cursor-pointer active:scale-[0.98]' : ''} ${alert.isRead ? 'opacity-20' : 'bg-zinc-900/50 hover:bg-zinc-900'}`}
                            >
                                <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                                    alert.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                                    alert.type === 'danger' ? 'bg-rose-500/10 text-rose-500' :
                                    alert.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                                    'bg-blue-500/10 text-blue-400'
                                }`}>
                                    <alert.icon size={18} strokeWidth={1.5} />
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="text-[13px] font-black text-foreground tracking-tight truncate">{alert.title}</h4>
                                        {alert.date && (
                                            <span className="text-[8px] text-muted-foreground/40 font-black uppercase tracking-tight shrink-0">
                                                {new Date(alert.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground/60 font-medium leading-relaxed">{alert.message}</p>
                                    {alert.action && (
                                        <div className="flex items-center gap-1 mt-2">
                                            <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Review Record</span>
                                            <ChevronRight size={10} className="text-primary" />
                                        </div>
                                    )}
                                </div>
                                {!alert.isRead && (
                                    <div className="absolute top-4 right-4 size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--accent-primary-rgb),0.6)]"></div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-16 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="size-20 rounded-full bg-zinc-900 flex items-center justify-center text-muted-foreground/10 mb-6 shadow-inner">
                                <ShieldCheck size={40} strokeWidth={1} />
                            </div>
                            <p className="text-[10px] font-black text-muted-foreground/20 tracking-[0.3em] uppercase">Security Level: Optimal</p>
                            <p className="text-[9px] font-medium text-muted-foreground/20 mt-1">No anomalies detected in your portfolio</p>
                        </div>
                    )}
                </div>

                {/* Footer Insight */}
                <div className="p-4 bg-zinc-900/30 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap size={12} className="text-primary" />
                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Institutional Shield</span>
                    </div>
                    <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                </div>
            </div>
        </div>
    );
};

export default NotificationModal;
