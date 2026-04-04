import React from 'react';
import { TabType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DesktopSidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  userName: string;
}

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab, setActiveTab, userName }) => {
  const { t } = useLanguage();

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: 'fa-table-cells-large' },
    { id: 'transactions', label: t('history.title'), icon: 'fa-receipt' },
    { id: 'stats', label: t('nav.stats'), icon: 'fa-chart-area' },
    { id: 'wallets', label: t('nav.performance'), icon: 'fa-credit-card' },
    { id: 'debt', label: t('nav.active'), icon: 'fa-hand-holding-dollar' },
    { id: 'deposit', label: t('nav.savings'), icon: 'fa-piggy-bank' },
    { id: 'profile', label: t('nav.profile'), icon: 'fa-gear' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0d0d0d] border-r border-[#1a1a1a] z-50 flex flex-col p-8 animate-in slide-in-from-left duration-700">
      <div className="mb-14 px-2">
        <h1 className="text-xl font-black text-white leading-tight tracking-[0.05em] uppercase">
          Neon Vault
        </h1>
        <p className="text-[9px] text-[#00fa9a] font-bold tracking-[0.25em] uppercase opacity-80 mt-1.5">
          Premium Finance
        </p>
      </div>

      <nav className="flex-1 space-y-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative ${isActive 
                ? 'bg-white/5 text-white' 
                : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-lg transition-all ${isActive ? 'text-[#00fa9a]' : 'opacity-60'}`}></i>
              <span className={`text-[13px] font-bold tracking-tight ${isActive ? 'opacity-100' : 'opacity-80'}`}>{tab.label}</span>
              
              {isActive && (
                <div className="absolute right-0 top-3 bottom-3 w-[3px] bg-[#00fa9a] rounded-l-full shadow-[0_0_15px_#00fa9a]"></div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 pt-8 border-t border-white/5">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-5 px-5">Quick Action</p>
        <button 
          onClick={() => setActiveTab('wallets')}
          className="w-full py-4 rounded-[18px] bg-emerald-500 text-black font-black text-[13px] uppercase tracking-wider hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_10px_25px_rgba(16,185,129,0.3)] mb-8"
        >
          New Transfer
        </button>

        <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/5 border border-white/5 group cursor-pointer hover:bg-white/10 transition-all">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 overflow-hidden">
             <img src="https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png" alt="User" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-white truncate">{userName}</p>
            <p className="text-[9px] text-[#00fa9a] font-bold tracking-[0.1em] uppercase">Gold Member</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
