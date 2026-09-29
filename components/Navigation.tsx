import React from 'react';
import { TabType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { vibrate } from '../lib/utils';
import { Home, History, Handshake, Wallet, PieChart, User, TrendingUp } from 'lucide-react';

interface NavigationProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
}

const Navigation: React.FC<NavigationProps> = React.memo(({ activeTab, setActiveTab }) => {
    const { t } = useLanguage();

    const tabs: { id: TabType; icon: any; label: string }[] = [
        { id: 'dashboard',    icon: Home,       label: t('nav.dashboard') || 'Beranda' },
        { id: 'transactions', icon: History,    label: 'Riwayat' },
        { id: 'debt',         icon: Handshake,  label: 'Cicilan' },
        { id: 'wallets',      icon: Wallet,     label: t('nav.performance') || 'Dompet' },
        { id: 'stocks',       icon: TrendingUp, label: t('nav.stocks') || 'Saham' },
        { id: 'profile',      icon: User,       label: t('nav.profile') || 'Profil' },
    ];

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[100] w-full border-t border-white/[0.08] bg-[#090d16]/92 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.45)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <nav className="flex items-center justify-around h-[58px] max-w-md mx-auto px-1">
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
                            className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 active:scale-90 select-none cursor-pointer"
                            aria-label={tab.label}
                        >
                            {/* Telegram-style Icon: outlined when inactive, filled + glow when active */}
                            <div
                                className={`relative flex items-center justify-center transition-all duration-200 ${
                                    isActive ? 'scale-105' : 'scale-100'
                                }`}
                                style={{
                                    filter: isActive ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.45))' : 'none'
                                }}
                            >
                                <Icon
                                    size={20}
                                    strokeWidth={isActive ? 2.4 : 1.8}
                                    fill={isActive ? 'currentColor' : 'none'}
                                    className={`transition-colors duration-200 ${
                                        isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-400'
                                    }`}
                                />
                            </div>

                            {/* Telegram-style Label: clean, compact, sans-serif */}
                            <span
                                className={`text-[10px] tracking-tight transition-all duration-200 leading-none ${
                                    isActive 
                                        ? 'font-bold text-emerald-400' 
                                        : 'font-medium text-zinc-500'
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
