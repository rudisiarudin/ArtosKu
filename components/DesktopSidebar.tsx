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
    <aside className="fixed left-0 top-0 h-screen w-72 bg-black border-r border-white/5 z-50 flex flex-col p-8 animate-in slide-in-from-left duration-700">
      <div className="mb-14 px-4">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-[18px] bg-primary flex items-center justify-center text-black shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            <i className="fa-solid fa-vault text-2xl"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white leading-none tracking-tighter">
              ArtosKu
            </h1>
            <p className="text-[10px] text-primary font-black tracking-[0.3em] uppercase mt-1 opacity-80">
              Institutional
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-[22px] transition-all duration-500 group relative ${isActive 
                ? 'bg-primary/10 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-lg transition-all ${isActive ? 'text-primary scale-110' : 'opacity-40 group-hover:opacity-100'}`}></i>
              <span className={`text-[13px] font-black tracking-tight transition-all ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100 uppercase tracking-widest text-[11px]'}`}>{tab.label}</span>
              
              {isActive && (
                <div className="absolute right-3 top-4 bottom-4 w-[4px] bg-primary rounded-full shadow-[0_0_20px_#10b981]"></div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 pt-8 border-t border-white/5">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-6 px-4">Access Level</p>
        
        <div className="flex items-center gap-4 px-5 py-4 rounded-[24px] bg-white/[0.03] border border-white/5 group cursor-pointer hover:border-primary/30 transition-all duration-500" onClick={() => setActiveTab('profile')}>
          <div className="size-11 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
             <img src="https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png" alt="User" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-black text-white truncate">{userName}</p>
            <p className="text-[9px] text-primary font-black tracking-[0.2em] uppercase opacity-60">Elite Member</p>
          </div>
        </div>
      </div>
    </aside>
    </aside>
  );
};

export default DesktopSidebar;
