import React, { useTransition } from 'react';
import { TabType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { vibrate } from '../lib/utils';

interface NavigationProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ activeTab, setActiveTab }) => {
    const { t } = useLanguage();

    const tabs = [
        { id: 'dashboard', icon: 'fa-house', label: 'Home' },
        { id: 'transactions', icon: 'fa-clock-rotate-left', label: 'History' },
        { id: 'wallets', icon: 'fa-wallet', label: 'Wallet' },
        { id: 'stats', icon: 'fa-chart-pie', label: 'Reports' },
        { id: 'profile', icon: 'fa-user', label: 'Profile' }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center z-[100] px-4 pb-[calc(1rem+env(safe-area-inset-top))] pointer-events-none">
            <nav className="w-full max-w-[400px] bg-[var(--navbar-bg)]/80 backdrop-blur-xl rounded-[32px] px-2 py-2 flex items-center justify-between shadow-2xl pointer-events-auto transition-all duration-300">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as TabType);
                                vibrate(10);
                            }}
                            className={`flex flex-col items-center justify-center w-[64px] h-[52px] rounded-[24px] transition-all duration-300 ${isActive ? 'bg-[hsl(var(--active-tab-bg))]' : 'active:opacity-70'}`}
                        >
                            <div className={`mb-1 ${isActive ? 'text-[hsl(var(--active-tab-text))]' : 'text-muted-foreground'}`}>
                                <i className={`fa-solid ${tab.icon} text-[18px]`}></i>
                            </div>
                            <span className={`text-[10px] font-medium ${isActive ? 'text-[hsl(var(--active-tab-text))]' : 'text-muted-foreground'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
});

export default Navigation;
