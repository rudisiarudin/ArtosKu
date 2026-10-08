import React from 'react';
import { Bell, Search, User } from 'lucide-react';
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
  setActiveTab,
}) => {
  const { t, lang } = useLanguage();

  const titles: Partial<Record<TabType, string>> = {
    dashboard: t('nav.dashboard'),
    transactions: t('history.title'),
    stats: t('nav.stats'),
    wallets: t('nav.performance'),
    stocks: t('nav.stocks'),
    debt: lang === 'id' ? 'Utang & Piutang' : 'Debts & Receivables',
    deposit: t('nav.savings'),
    dreams: lang === 'id' ? 'Target Keuangan' : 'Financial Goals',
    profile: t('nav.profile'),
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl xl:pl-72">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-8 px-8">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold tracking-tight text-foreground">
            {titles[activeTab] || 'ArtosKu'}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {lang === 'id' ? 'Data keuangan Anda' : 'Your financial overview'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSearch}
          className="hidden h-11 w-full max-w-md items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/70 xl:flex"
          aria-label={lang === 'id' ? 'Buka pencarian transaksi' : 'Open transaction search'}
        >
          <Search size={17} aria-hidden="true" />
          <span className="flex-1">{lang === 'id' ? 'Cari transaksi...' : 'Search transactions...'}</span>
          <span className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-semibold">/</span>
        </button>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onShowNotifications}
            className="relative flex size-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground active:scale-95"
            aria-label={lang === 'id' ? 'Buka notifikasi' : 'Open notifications'}
          >
            <Bell size={18} aria-hidden="true" />
            {hasUnreadNotifications && (
              <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-rose-500 ring-2 ring-card" />
            )}
          </button>

          <div className="mx-1 h-8 w-px bg-border" />

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-3 rounded-xl p-1.5 pr-3 text-left transition-colors hover:bg-muted"
            aria-label={lang === 'id' ? 'Buka profil' : 'Open profile'}
          >
            <div className="hidden text-right lg:block">
              <p className="max-w-36 truncate text-sm font-semibold text-foreground">{userName}</p>
              <p className="text-[10px] font-medium text-muted-foreground">{lang === 'id' ? 'Akun pribadi' : 'Personal account'}</p>
            </div>
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User size={18} aria-hidden="true" />
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;
