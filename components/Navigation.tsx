import React from 'react';
import { TabType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { vibrate } from '../lib/utils';
import { Home, History, CreditCard, Wallet, User } from 'lucide-react';

interface NavigationProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ activeTab, setActiveTab }) => {
    const { t } = useLanguage();

    const tabs: { id: TabType; icon: any; label: string }[] = [
        { id: 'dashboard',    icon: Home,       label: t('nav.dashboard') || 'Beranda' },
        { id: 'transactions', icon: History,    label: 'Riwayat' },
        { id: 'debt',         icon: CreditCard, label: 'Cicilan' },
        { id: 'wallets',      icon: Wallet,     label: t('nav.performance') || 'Dompet' },
        { id: 'profile',      icon: User,       label: t('nav.profile') || 'Profil' },
    ];

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[100] w-full border-t border-border bg-background/95 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <nav className="flex items-center justify-around h-[54px] max-w-md mx-auto px-2">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                vibrate(10);
                            }}
                            type="button"
                            className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-150 active:scale-90 select-none cursor-pointer"
                            aria-label={tab.label}
                        >
                            {/* Active pill indicator at top of tab */}
                            <span
                                className={`absolute top-0 h-[3px] w-8 rounded-full bg-primary transition-all duration-300 ${
                                    isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                                }`}
                            />
                            <div
                                className={`relative flex items-center justify-center transition-all duration-200 ${
                                    isActive ? 'scale-110' : 'scale-100'
                                }`}
                            >
                                <Icon
                                    size={19}
                                    strokeWidth={isActive ? 2.5 : 1.7}
                                    className={`transition-colors duration-200 ${
                                        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                />
                            </div>

                            <span
                                className={`text-[10px] tracking-tight transition-all duration-200 leading-none ${
                                    isActive
                                        ? 'font-bold text-primary'
                                        : 'font-medium text-muted-foreground'
                                }`}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
});

Navigation.displayName = 'Navigation';

export default Navigation;
