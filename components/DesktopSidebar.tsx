import React from 'react';
import { User } from 'lucide-react';
import { TabType, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DesktopSidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  userName: string;
  profile?: UserProfile | null;
}

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab, setActiveTab, userName, profile }) => {
  const { t, lang } = useLanguage();

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: 'fa-table-cells-large' },
    { id: 'transactions', label: t('history.title'), icon: 'fa-receipt' },
    { id: 'stats', label: t('nav.stats'), icon: 'fa-chart-area' },
    { id: 'wallets', label: t('nav.performance'), icon: 'fa-wallet' },
    { id: 'stocks', label: t('nav.stocks'), icon: 'fa-chart-line' },
    { id: 'debt', label: lang === 'id' ? 'Utang & Piutang' : 'Debts', icon: 'fa-hand-holding-dollar' },
    { id: 'deposit', label: t('nav.savings'), icon: 'fa-piggy-bank' },
    { id: 'dreams', label: lang === 'id' ? 'Target' : 'Goals', icon: 'fa-star' },
    { id: 'profile', label: t('nav.profile'), icon: 'fa-gear' },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col border-r border-border bg-card xl:flex">
      <div className="flex h-20 shrink-0 items-center gap-3 border-b border-border px-7">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
          <i className="fa-solid fa-vault text-lg" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-none tracking-tight text-foreground">ArtosKu</h1>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Personal Finance</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-4" aria-label="Navigasi utama">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="flex size-8 items-center justify-center">
                <i className={`fa-solid ${tab.icon} text-[15px]`} aria-hidden="true" />
              </span>
              <span className="text-[13px] font-semibold">{tab.label}</span>
              {isActive && <span className="absolute inset-y-3 right-0 w-1 rounded-l-full bg-primary" />}
            </button>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border p-4">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/60 p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted"
          aria-label={lang === 'id' ? 'Buka profil' : 'Open profile'}
        >
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={18} aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">{userName}</p>
            <p className="text-[10px] font-medium text-muted-foreground">{lang === 'id' ? 'Kelola akun' : 'Manage account'}</p>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
