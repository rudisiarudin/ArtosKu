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
    <header className="sticky top-0 z-[40] bg-black/60 backdrop-blur-2xl border-b border-white/5 px-10 py-6 mb-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
        <div className="flex items-center gap-12">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tighter text-white leading-none mb-1.5">
              {getPageTitle()}
            </h2>
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_#10b981]" />
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                System Operational
              </p>
            </div>
          </div>
          
          <div className="relative w-[450px] hidden xl:block group">
            <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-white/20 text-sm group-focus-within:text-primary transition-colors"></i>
            <input 
              type="text" 
              placeholder="Search assets, transactions, or deep analytics..." 
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-[13px] font-medium text-white focus:outline-none focus:ring-1 focus:ring-primary/30 focus:bg-white/[0.05] transition-all placeholder:text-white/10"
              onClick={onSearch}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[9px] font-black text-white/30 tracking-widest">
              CMD + K
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={onShowNotifications} 
            className="size-12 rounded-2xl bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white transition-all relative border border-white/5 hover:border-primary/30 group active:scale-90"
          >
            <i className="fa-regular fa-bell text-xl group-hover:rotate-12 transition-transform"></i>
            {hasUnreadNotifications && (
              <span className="absolute top-3.5 right-3.5 size-2.5 bg-rose-500 rounded-full border-2 border-black animate-pulse"></span>
            )}
          </button>
          
          <div className="h-8 w-[1px] bg-white/10 mx-2" />
          
          <div 
            className="flex items-center gap-4 cursor-pointer group p-1 pr-4 rounded-[22px] hover:bg-white/5 transition-all border border-transparent hover:border-white/10" 
            onClick={() => setActiveTab('profile')}
          >
            <div className="text-right hidden lg:block">
              <p className="text-[14px] font-black leading-none mb-1.5 text-white group-hover:text-primary transition-colors">{userName}</p>
              <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em]">Verified Node</p>
            </div>
            <div className="relative">
              <img 
                src={profile?.avatar_url || "https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png"} 
                alt="user profile" 
                className="size-12 rounded-2xl object-cover ring-2 ring-transparent group-hover:ring-primary/20 transition-all border border-white/10" 
              />
              <div className="absolute -bottom-1 -right-1 size-4.5 rounded-full bg-primary border-2 border-black flex items-center justify-center">
                <i className="fa-solid fa-bolt text-[8px] text-black"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;
