
import React from 'react';
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
        { id: 'dashboard', icon: 'fa-house-chimney', label: t('nav.dashboard') },
        { id: 'stats', icon: 'fa-chart-pie', label: t('nav.stats') },
        { id: 'wallets', icon: 'fa-sack-dollar', label: t('nav.performance') },
        { id: 'deposit', icon: 'fa-vault', label: t('nav.savings') },
        { id: 'profile', icon: 'fa-circle-user', label: t('nav.profile') }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center z-[100] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pointer-events-none">
            <nav className="w-full max-w-[360px] premium-glass rounded-[28px] px-2 py-1.5 flex items-center justify-between shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] border border-white/10 animate-glow-breath pointer-events-auto">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as TabType);
                                vibrate(10);
                            }}
                            className={`group relative flex items-center justify-center transition-all duration-500 rounded-2xl h-11 px-4 ${isActive
                                ? 'bg-[#00fa9a] text-black shadow-lg shadow-[#00fa9a]/20 animate-nav-pop'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90'
                                }`}
                        >
                            <i className={`fa-solid ${tab.icon} ${isActive ? 'text-[13px]' : 'text-[16px]'} transition-all duration-300`}></i>

                            {isActive && (
                                <span className="ml-2 text-[10px] font-bold tracking-[0.05em] animate-fade-in uppercase whitespace-nowrap">
                                    {tab.label}
                                </span>
                            )}

                            {!isActive && (
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[rgba(var(--bg-card-rgb),0.9)] backdrop-blur-md text-[var(--text-primary)] text-[10px] font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/10 pointer-events-none tracking-widest whitespace-nowrap shadow-xl transform translate-y-2 group-hover:translate-y-0">
                                    {tab.label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
});

export default Navigation;
