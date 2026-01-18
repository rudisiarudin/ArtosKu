import React from 'react';
import { TabType } from '../types';

interface NavigationProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'dashboard', icon: 'fa-house-chimney', label: 'Home' },
        { id: 'stats', icon: 'fa-chart-pie', label: 'Stats' },
        { id: 'wallets', icon: 'fa-sack-dollar', label: 'Assets' },
        { id: 'deposit', icon: 'fa-vault', label: 'Deposit' },
        { id: 'profile', icon: 'fa-circle-user', label: 'Profile' }
    ];

    return (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[360px] bg-zinc-900/90 backdrop-blur-xl border border-white/5 rounded-[2.5rem] px-2 py-2 flex items-center justify-between shadow-2xl z-50">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`group relative flex items-center justify-center transition-all duration-500 rounded-full h-11 px-5 ${isActive
                            ? 'bg-[#00d293] text-black shadow-[0_10px_25px_rgba(0,210,147,0.3)] scale-105'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <i className={`fa-solid ${tab.icon} ${isActive ? 'text-[14px]' : 'text-[16px]'} transition-all`}></i>

                        {isActive && (
                            <span className="ml-2 text-[10px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-left-2 duration-500">
                                {tab.label}
                            </span>
                        )}

                        {!isActive && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity border border-white/5 pointer-events-none uppercase tracking-widest whitespace-nowrap">
                                {tab.label}
                            </div>
                        )}
                    </button>
                );
            })}
        </nav>
    );
});

export default Navigation;
