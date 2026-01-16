
import React from 'react';
import { TabType } from '../types';

interface NavigationProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    onPlusClick: () => void;
    theme: 'light' | 'dark';
}

const Navigation: React.FC<NavigationProps> = React.memo(({ activeTab, setActiveTab, onPlusClick, theme }) => {
    const tabs = [
        { id: 'dashboard', icon: 'fa-house', label: 'Home' },
        { id: 'stats', icon: 'fa-chart-pie', label: 'Stats' },
        { id: 'wallets', icon: 'fa-wallet', label: 'Wallet' },
        { id: 'profile', icon: 'fa-user', label: 'Profile' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[var(--bg-deep)]/80 dark:bg-[#09090b]/80 backdrop-blur-2xl border-t border-[var(--border-subtle)] flex justify-around items-center z-[100] px-4 pb-4 shadow-[0_-8px_40px_rgba(0,0,0,0.04)] transition-colors duration-500">
            <div className="flex w-full max-w-md justify-around items-center relative gap-2">
                {tabs.slice(0, 2).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-500 min-w-[70px] relative ${activeTab === tab.id ? 'text-emerald-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                        {activeTab === tab.id && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-12 h-12 bg-emerald-500/10 blur-2xl rounded-full"></div>
                        )}
                        <div className={`relative ${activeTab === tab.id ? 'scale-110 -translate-y-0.5' : 'scale-100'} transition-all duration-500`}>
                            <i className={`fa-solid ${tab.icon} ${activeTab === tab.id ? 'text-lg' : 'text-base'}`}></i>
                            {activeTab === tab.id && (
                                <span className="absolute -top-1.5 -right-1.5 w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]"></span>
                            )}
                        </div>
                        <span className={`text-[8.5px] font-bold uppercase tracking-[0.1em] transition-opacity duration-500 ${activeTab === tab.id ? 'opacity-100' : 'opacity-40'}`}>
                            {tab.label}
                        </span>
                    </button>
                ))}

                <div className="w-14"></div> {/* Spacer where the button used to be */}

                {tabs.slice(2).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-500 min-w-[70px] relative ${activeTab === tab.id ? 'text-emerald-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                        {activeTab === tab.id && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-12 h-12 bg-emerald-500/10 blur-2xl rounded-full"></div>
                        )}
                        <div className={`relative ${activeTab === tab.id ? 'scale-110 -translate-y-0.5' : 'scale-100'} transition-all duration-500`}>
                            <i className={`fa-solid ${tab.icon} ${activeTab === tab.id ? 'text-lg' : 'text-base'}`}></i>
                            {activeTab === tab.id && (
                                <span className="absolute -top-1.5 -right-1.5 w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]"></span>
                            )}
                        </div>
                        <span className={`text-[8.5px] font-bold uppercase tracking-[0.1em] transition-opacity duration-500 ${activeTab === tab.id ? 'opacity-100' : 'opacity-40'}`}>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>
        </nav>
    );
});

export default Navigation;
