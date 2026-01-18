
import React from 'react';
import { Wallet, Debt, TransactionType } from '../types';

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    wallets: Wallet[];
    debts: Debt[];
    theme: 'light' | 'dark';
}

interface FinancialAlert {
    id: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    title: string;
    message: string;
    icon: string;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, wallets, debts }) => {
    const alerts = React.useMemo(() => {
        const list: FinancialAlert[] = [];
        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);

        // 1. Check for Low Balance
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

        // 2. Check for Upcoming Debts
        debts.filter(d => !d.isPaid).forEach(d => {
            const dueDate = new Date(d.dueDate);
            if (dueDate <= threeDaysFromNow && dueDate >= now) {
                list.push({
                    id: `debt-${d.id}`,
                    type: d.type === TransactionType.DEBT ? 'danger' : 'info',
                    title: d.type === TransactionType.DEBT ? 'Debt Due Soon' : 'Payment Expected',
                    message: `${d.title} is due on ${new Date(d.dueDate).toLocaleDateString('id-ID')}`,
                    icon: d.type === TransactionType.DEBT ? 'fa-hand-holding-dollar' : 'fa-hand-holding-hand'
                });
            }
        });

        return list;
    }, [wallets, debts]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-start justify-center pt-20 px-6">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            <div className="relative bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Activity Center</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 no-scrollbar">
                    {alerts.length > 0 ? (
                        alerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`p-4 rounded-2xl border flex items-start gap-4 transition-all hover:translate-x-1 ${alert.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                                        alert.type === 'danger' ? 'bg-rose-500/5 border-rose-500/20' :
                                            'bg-emerald-500/5 border-emerald-500/20'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.type === 'warning' ? 'bg-amber-500 text-amber-950' :
                                        alert.type === 'danger' ? 'bg-rose-500 text-rose-950' :
                                            'bg-emerald-500 text-emerald-950'
                                    }`}>
                                    <i className={`fa-solid ${alert.icon} text-sm`}></i>
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-[12px] font-bold text-white">{alert.title}</h4>
                                    <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{alert.message}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-600 mb-4">
                                <i className="fa-solid fa-bell-slash text-xl"></i>
                            </div>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Everything is on track</p>
                        </div>
                    )}
                </div>

                {alerts.length > 0 && (
                    <div className="p-4 bg-zinc-950/50 border-t border-white/5 text-center">
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                            Stay sharp with your finances
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationModal;
