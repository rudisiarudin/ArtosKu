import React from 'react';
import { TabType, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DesktopHeaderProps {
  activeTab: TabType;
  userName: string;
  profile: UserProfile | null;
  onSearch: () => void;
  onShowNotifications: () => void;
  hasUnreadNotifications: boolean;
  setActiveTab: (tab: TabType) => void;
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({ 
  activeTab, 
  userName, 
  profile, 
  onSearch, 
  onShowNotifications, 
  hasUnreadNotifications,
  setActiveTab
}) => {
  const { t } = useLanguage();

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return t('nav.dashboard');
      case 'transactions': return t('history.title');
      case 'stats': return t('nav.stats');
      case 'wallets': return t('nav.performance');
      case 'debt': return t('nav.active');
      case 'deposit': return t('nav.savings');
      case 'profile': return t('nav.profile');
      default: return 'ArtosKu';
    }
  };

  return (
    <header className="sticky top-0 z-[40] bg-[var(--bg-deep)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] px-8 py-4 mb-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)] leading-none mb-1">
              {getPageTitle()}
            </h2>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest opacity-60">
              Personal Finance Manager
            </p>
          </div>
          
          <div className="relative w-80 lg:w-[400px] hidden md:block group">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs group-focus-within:text-emerald-500 transition-colors"></i>
            <input 
              type="text" 
              placeholder="Search transactions, wallets, or settings..." 
              className="w-full bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-2xl py-3 pl-11 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-medium placeholder:text-[var(--text-muted)]/50"
              onClick={onSearch}
            />
          </div>
        </div>

        <div className="flex items-center gap-5">
          <button 
            onClick={onShowNotifications} 
            className="w-11 h-11 rounded-2xl bg-[var(--bg-inner)] flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-all relative border border-[var(--border-subtle)] hover:border-emerald-500/30 active:scale-95 group"
          >
            <i className="fa-regular fa-bell text-lg group-hover:scale-110 transition-transform"></i>
            {hasUnreadNotifications && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[var(--bg-deep)] animate-pulse"></span>
            )}
          </button>
          
          <div className="h-8 w-[1px] bg-[var(--border-subtle)] mx-1" />
          
          <div 
            className="flex items-center gap-4 cursor-pointer group p-1 pr-3 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-[var(--border-subtle)]" 
            onClick={() => setActiveTab('profile')}
          >
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-bold leading-none mb-1 text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors">{userName}</p>
              <div className="flex items-center justify-end gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Premium Account</p>
              </div>
            </div>
            <div className="relative">
              <img 
                src={profile?.avatar_url || "https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png"} 
                alt="user" 
                className="w-11 h-11 rounded-2xl object-cover ring-2 ring-transparent group-hover:ring-emerald-500/30 transition-all border border-[var(--border-subtle)]" 
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--bg-deep)] flex items-center justify-center">
                <i className="fa-solid fa-check text-[6px] text-black"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;
