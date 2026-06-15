import React from 'react';
import { TabType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { vibrate } from '../lib/utils';
import { Home, History, Wallet, PieChart, User, TrendingUp } from 'lucide-react';

interface NavigationProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ activeTab, setActiveTab }) => {
    const { t } = useLanguage();

    const tabs = [
        { id: 'dashboard',    icon: Home,       label: t('nav.dashboard') },
        { id: 'transactions', icon: History,     label: 'Riwayat' },
        { id: 'wallets',      icon: Wallet,      label: t('nav.performance') },
        { id: 'stocks',       icon: TrendingUp,  label: t('nav.stocks') },
        { id: 'stats',        icon: PieChart,    label: t('nav.stats') },
        { id: 'profile',      icon: User,        label: t('nav.profile') },
    ];

    return (
        <div
            className="fixed bottom-4 left-4 right-4 mx-auto max-w-[calc(448px-2rem)] z-[100] rounded-2xl border border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <nav className="flex items-stretch justify-around h-[56px]">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as TabType);
                                vibrate(10);
                            }}
                            className="relative flex flex-col items-center justify-center flex-1 gap-[3px] transition-all duration-200 active:scale-95 select-none"
                            aria-label={tab.label}
                        >


                            {/* Icon */}
                            <Icon
                                size={20}
                                strokeWidth={isActive ? 2.5 : 1.8}
                                className={`transition-all duration-200 ${
                                    isActive ? 'text-emerald-400' : 'text-zinc-500'
                                }`}
                            />

                            {/* Label */}
                            <span
                                className={`text-[9px] font-bold tracking-wide transition-all duration-200 leading-none ${
                                    isActive ? 'text-emerald-400' : 'text-zinc-600'
                                }`}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
});

Navigation.displayName = 'Navigation';

export default Navigation;
