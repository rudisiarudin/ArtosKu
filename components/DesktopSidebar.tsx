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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--bg-deep)] border-r border-[var(--border-subtle)] z-50 flex flex-col p-8 animate-in slide-in-from-left duration-700">
      <div className="mb-12 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <i className="fa-solid fa-vault text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] leading-tight tracking-tight">
              ArtosKu
            </h1>
            <p className="text-[9px] text-emerald-500 font-bold tracking-[0.2em] uppercase opacity-80 mt-0.5">
              Premium Finance
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${isActive 
                ? 'bg-emerald-500/10 text-emerald-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                : 'text-zinc-500 hover:text-[var(--text-primary)] hover:bg-white/5'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-lg transition-all ${isActive ? 'text-emerald-500 scale-110' : 'opacity-60'}`}></i>
              <span className={`text-[13px] font-bold tracking-tight transition-all ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{tab.label}</span>
              
              {isActive && (
                <div className="absolute right-2 top-3 bottom-3 w-[4px] bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981]"></div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 px-2">Quick Action</p>
        <button 
          onClick={() => setActiveTab('wallets')}
          className="w-full py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-[11px] uppercase tracking-wider hover:scale-[1.02] transition-all active:scale-95 shadow-xl mb-8 border border-white/5"
        >
          <i className="fa-solid fa-plus mr-2"></i>
          New Entry
        </button>

        <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-[var(--bg-inner)] border border-[var(--border-subtle)] group cursor-pointer hover:border-emerald-500/30 transition-all" onClick={() => setActiveTab('profile')}>
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-[var(--border-subtle)] overflow-hidden">
             <img src="https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png" alt="User" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-[var(--text-primary)] truncate">{userName}</p>
            <p className="text-[9px] text-emerald-500 font-bold tracking-[0.1em] uppercase">Premium Tier</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
