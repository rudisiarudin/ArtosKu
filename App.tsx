
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Profile from './components/Profile';
import Stats from './components/Stats';
import DebtManagement from './components/DebtManagement';
import Dashboard from './components/Dashboard';
import Deposit from './components/Deposit';
import TransactionList from './components/TransactionList';
import AddTransactionModal from './components/AddTransactionModal';
import Navigation from './components/Navigation';
import DesktopSidebar from './components/DesktopSidebar';
import DesktopHeader from './components/DesktopHeader';
import WalletManagement from './components/WalletManagement';
import { useMediaQuery } from './hooks/useMediaQuery';
import { cn } from './lib/utils';
import TopupModal from './components/TopupModal';
import TransferModal from './components/TransferModal';
import InterUserTransferModal from './components/InterUserTransferModal';
import NotificationModal from './components/NotificationModal';
import UpdateBalanceModal from './components/UpdateBalanceModal';
import Auth from './components/Auth';
import { getLocalIsoDate, getLocalIsoString } from './lib/utils';
import PinScreen from './components/PinScreen';
import { supabase, getSession, getUserProfile, signOut } from './lib/supabase';
import { fetchWallets, createWallet, updateWallet, deleteWallet, fetchTransactions, createTransaction, updateTransaction, deleteTransaction as deleteTransactionFromDB, fetchDebts, createDebt, updateDebt, deleteDebt, fetchNotifications } from './lib/database';
import { Transaction, Wallet, TransactionType, WalletType, Debt, TabType, UserProfile, Budget } from './types';
import { LanguageProvider } from './context/LanguageContext';
import AiChat from './components/AiChat';
import OfflineBanner from './components/OfflineBanner';

const STORAGE_KEY_TX = 'artosku_transactions_v2';
const STORAGE_KEY_WALLETS = 'artosku_wallets_v2';
const STORAGE_KEY_USER = 'artosku_user_v2';
const STORAGE_KEY_THEME = 'artosku_theme_v2';
const STORAGE_KEY_DEBTS = 'artosku_debts_v2';
const STORAGE_KEY_BUDGETS = 'artosku_budgets_v1';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isInterUserTransferModalOpen, setIsInterUserTransferModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [prefilledData, setPrefilledData] = useState<any>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_BUDGETS);
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedWalletForUpdate, setSelectedWalletForUpdate] = useState<Wallet | null>(null);
  const [statsFocusCategory, setStatsFocusCategory] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  useEffect(() => {
    const handleOpenAiChat = () => setIsAiChatOpen(true);
    document.addEventListener('open-ai-chat', handleOpenAiChat);
    return () => document.removeEventListener('open-ai-chat', handleOpenAiChat);
  }, []);

  const isMobile = useMediaQuery('(max-width: 1279px)');
  const isDesktop = !isMobile;

  // PWA Install Prompt Listener
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Check authentication on mount
  useEffect(() => {
    getSession().then((session) => {
      setSession(session);
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || session.user.email || 'User');
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || session.user.email || 'User');
        loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }

      if (event === 'SIGNED_OUT') {
        window.location.reload();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    const { data } = await getUserProfile(userId);
    if (data) {
      setUserProfile(data);
      // If PIN is enabled, lock the app by default on reload
      if (data.pin_enabled && data.security_pin) {
        setIsLocked(true);
      }
    }
    setLoading(false);
  };

  // Load data from Supabase when user logs in
  const loadData = useCallback(async () => {
    if (!session?.user) return;
    try {
      const [walletsData, transactionsData, debtsData, notificationsData] = await Promise.all([
        fetchWallets(session.user.id),
        fetchTransactions(session.user.id),
        fetchDebts(session.user.id),
        fetchNotifications(session.user.id)
      ]);

      setWallets(walletsData);
      setTransactions(transactionsData);
      setDebts(debtsData);
      setNotifications(notificationsData);

      // Cache to localStorage for offline fallback
      try {
        localStorage.setItem('artosku_cache_wallets', JSON.stringify(walletsData));
        localStorage.setItem('artosku_cache_transactions', JSON.stringify(transactionsData));
        localStorage.setItem('artosku_cache_debts', JSON.stringify(debtsData));
        localStorage.setItem('artosku_cache_timestamp', Date.now().toString());
      } catch (e) {
        // localStorage might be full — silently ignore
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Offline fallback: load from localStorage cache
      if (!navigator.onLine) {
        try {
          const cachedWallets = localStorage.getItem('artosku_cache_wallets');
          const cachedTx = localStorage.getItem('artosku_cache_transactions');
          const cachedDebts = localStorage.getItem('artosku_cache_debts');
          if (cachedWallets) setWallets(JSON.parse(cachedWallets));
          if (cachedTx) setTransactions(JSON.parse(cachedTx));
          if (cachedDebts) setDebts(JSON.parse(cachedDebts));
          console.info('[Offline] Loaded data from cache');
        } catch (e) {
          console.error('[Offline] Failed to load cache:', e);
        }
      }
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      loadData();

      // Load theme from localStorage
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as 'light' | 'dark';
      if (savedTheme) setTheme(savedTheme);
    }
  }, [session, loadData]);

  // Inactivity tracking
  useEffect(() => {
    if (!session || !userProfile?.pin_enabled || !userProfile?.security_pin) return;

    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastActivity > INACTIVITY_LIMIT && !isLocked) {
        setIsLocked(true);
      }
    };

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    const interval = setInterval(checkInactivity, 60000); // Check every minute

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('mousedown', updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
    };
  }, [session, userProfile, lastActivity, isLocked]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  const hasNotifications = useMemo(() => {
    // Check low balance
    const hasLowBalance = wallets.some(w => Number(w.balance) < 100000);
    // Check upcoming debts
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    const hasUpcomingDebts = debts.some(d => !d.isPaid && new Date(d.dueDate) <= threeDaysFromNow && new Date(d.dueDate) >= now);
    // Check overdue debts
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hasOverdueDebts = debts.some(d => {
      if (d.isPaid) return false;
      const due = new Date(d.dueDate);
      const dueNorm = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      return dueNorm < today;
    });
    // Check unread db notifications
    const hasUnreadNotifications = notifications.some(n => !n.is_read);

    return hasLowBalance || hasUpcomingDebts || hasOverdueDebts || hasUnreadNotifications;
  }, [wallets, debts, notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USER, userName);
    localStorage.setItem(STORAGE_KEY_THEME, theme);

    // Update theme class and body background for seamless experience
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.body.style.backgroundColor = theme === 'dark' ? 'hsl(240 10% 3.9%)' : 'hsl(0 0% 100%)';

    // Update Theme Color Meta Tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#09090b' : '#ffffff');
    }
  }, [userName, theme]);

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
    if (!session?.user) return;

    try {
      // 1. Create transaction in Supabase first to ensure data integrity
      const newTransaction = await createTransaction(session.user.id, t);

      // 2. Perform Atomic Update for Wallets
      setWallets(prevWallets => {
        const wallet = prevWallets.find(w => w.id === t.walletId);
        if (!wallet) return prevWallets;

        const isIncreasing = t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
        const newBalance = isIncreasing
          ? Number(wallet.balance) + Number(t.amount)
          : Number(wallet.balance) - Number(t.amount);

        // Update Supabase in the background after we have the definite new balance
        updateWallet(t.walletId, { balance: newBalance }).catch(err => {
          console.error('Error updating wallet balance in DB:', err);
        });

        return prevWallets.map(w => w.id === t.walletId ? { ...w, balance: newBalance } : w);
      });

      // 3. Update local transactions state
      setTransactions(prev => [newTransaction, ...prev]);

    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  }, [session]);

  const handleUpdateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!session?.user) return;

    try {
      const updatedTx = await updateTransaction(id, updates);
      setTransactions(prev => prev.map(t => t.id === id ? updatedTx : t));
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction.');
    }
  }, [session]);

  const deleteTransaction = useCallback(async (id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    if (!txToDelete) return;

    if (!confirm('Delete this transaction?')) return;

    try {
      // Delete from Supabase
      await deleteTransactionFromDB(id);

      // Revert wallet balance in Supabase
      const wallet = wallets.find(w => w.id === txToDelete.walletId);
      if (wallet) {
        // Revert the balance change
        // If it was INCOME/RECEIVABLE (increased balance), now decrease it
        // If it was EXPENSE/DEBT (decreased balance), now increase it
        const isIncreasing = txToDelete.type === TransactionType.INCOME || txToDelete.type === TransactionType.DEBT;
        const revertedBalance = isIncreasing
          ? Number(wallet.balance) - Number(txToDelete.amount)
          : Number(wallet.balance) + Number(txToDelete.amount);

        await updateWallet(wallet.id, { balance: revertedBalance });

        // Update local wallet state
        setWallets(prev => prev.map(w =>
          w.id === wallet.id ? { ...w, balance: revertedBalance } : w
        ));
      }

      // Update local transaction state
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction. Please try again.');
    }
  }, [transactions, wallets]);

  const handleOpenTopup = useCallback((walletId: string, options?: { title?: string, description?: string }) => {
    setPrefilledData({ walletId, ...options });
    setIsTopupModalOpen(true);
  }, []);

  const handleTransfer = useCallback(async (fromId: string, toId: string, amount: number, description: string) => {
    if (!session?.user) return;

    try {
      const fromWallet = wallets.find(w => w.id === fromId);
      const toWallet = wallets.find(w => w.id === toId);

      // 1. Create OUTGOING transaction (Expense)
      await addTransaction({
        amount,
        type: TransactionType.EXPENSE,
        category: 'Transfer',
        date: new Date().toISOString(),
        description: `Transfer ke: ${toWallet?.name || 'Wallet'} - ${description}`,
        walletId: fromId
      });

      // 2. Create INCOMING transaction (Income)
      await addTransaction({
        amount,
        type: TransactionType.INCOME,
        category: 'Transfer',
        date: new Date().toISOString(),
        description: `Transfer dari: ${fromWallet?.name || 'Wallet'} - ${description}`,
        walletId: toId
      });

      // Since addTransaction already updates wallet balances and local state,
      // calling it twice handles both sides.
    } catch (error) {
      console.error('Error during transfer:', error);
      alert('Transfer failed. Please check your balance.');
    }
  }, [session, wallets, addTransaction]);

  const handleUpdateBalance = useCallback(async (walletId: string, newBalance: number, diff: number) => {
    if (!session?.user || diff === 0) return;

    try {
      // 1. Update wallet balance in Supabase
      const updatedWallet = await updateWallet(walletId, { balance: newBalance });

      // 2. Create automated transaction for Gain/Loss
      const isGain = diff > 0;
      await createTransaction(session.user.id, {
        amount: Math.abs(diff),
        type: isGain ? TransactionType.INCOME : TransactionType.EXPENSE,
        category: isGain ? 'Investasi' : 'Others',
        date: getLocalIsoString(),
        description: `Auto-Adjustment: ${isGain ? 'Gain' : 'Loss'} from Balance Update`,
        walletId: walletId
      });

      // 3. Update local state
      setWallets(prev => prev.map(w => w.id === walletId ? updatedWallet : w));

      // 4. Refresh transactions locally
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false });

      if (!txError && txData) {
        setTransactions(txData.map(item => ({
          ...item,
          walletId: item.wallet_id
        })));
      }

    } catch (error) {
      console.error('Failed to update balance:', error);
      alert('Failed to update balance. Please try again.');
    }
  }, [session]);

  const handleQuickAction = useCallback((label: string) => {
    if (label === 'Hutang' || label === 'Loan') {
      setActiveTab('debt');
      return;
    }

    if (label === 'Deposit') {
      handleOpenTopup(wallets[0]?.id, { title: 'Quick Deposit', description: 'Deposit' });
      return;
    }

    if (label === 'Transfer' || label === 'Send Money') {
      setIsInterUserTransferModalOpen(true);
      return;
    }

    let prefill: any = { description: `Transaksi ${label}` };

    if (label === 'Stockbit') {
      prefill = { ...prefill, type: TransactionType.EXPENSE, category: 'Investment', description: 'Beli Saham' };
    } else if (label === 'mBCA') {
      prefill = { ...prefill, type: TransactionType.EXPENSE, category: 'Others', description: 'Transfer Bank' };
    } else if (label === 'Gopay') {
      prefill = { ...prefill, type: TransactionType.EXPENSE, category: 'Others', description: 'Bayar Gopay' };
    }

    setPrefilledData(prefill);
    setIsModalOpen(true);
  }, []);

  const handleSetLimit = (category: string) => {
    setStatsFocusCategory(category);
    setActiveTab('stats');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            userName={userName}
            profile={userProfile}
            transactions={transactions}
            wallets={wallets}
            onShowAll={() => setActiveTab('transactions')}
            theme={theme}
            setTheme={setTheme}
            onTopup={handleOpenTopup}
            onQuickAction={handleQuickAction}
            setActiveTab={setActiveTab}
            onSearch={() => setActiveTab('transactions')}
            onShowNotifications={() => setIsNotificationModalOpen(true)}
            onSetLimit={handleSetLimit}
            hasUnreadNotifications={hasNotifications}
            isMobile={isMobile}
          />
        );
      case 'debt':
        return (
          <DebtManagement
            debts={debts}
            wallets={wallets}
            onAddDebt={async (d) => {
              if (!session?.user) return;
              try {
                const newDebt = await createDebt(session.user.id, d);
                setDebts(prev => [...prev, newDebt]);
              } catch (error) {
                console.error('Error adding debt:', error);
                alert('Failed to add debt. Please try again.');
              }
            }}
            onUpdateDebt={async (updated) => {
              try {
                const updatedDebt = await updateDebt(updated.id, updated);
                setDebts(prev => prev.map(d => d.id === updated.id ? updatedDebt : d));
              } catch (error) {
                console.error('Error updating debt:', error);
                alert('Failed to update debt. Please try again.');
              }
            }}
            onDeleteDebt={async (id) => {
              const debtToDelete = debts.find(d => d.id === id);
              if (!debtToDelete) return;
              if (!confirm(`Delete ${debtToDelete.title}? Wallet balance will be reverted.`)) return;

              try {
                const wallet = wallets.find(w => w.id === debtToDelete.walletId);
                if (wallet) {
                  const isIncreasing = debtToDelete.type === TransactionType.DEBT;
                  const revertedBalance = isIncreasing
                    ? Number(wallet.balance) - Number(debtToDelete.initialAmount || debtToDelete.amount)
                    : Number(wallet.balance) + Number(debtToDelete.initialAmount || debtToDelete.amount);

                  await updateWallet(wallet.id, { balance: revertedBalance });
                  setWallets(prev => prev.map(w => w.id === wallet.id ? { ...w, balance: revertedBalance } : w));
                }

                const txDescriptionPrefix = `New ${debtToDelete.type === TransactionType.DEBT ? 'Hutang' : 'Piutang'}: ${debtToDelete.title}`;
                const linkedTx = transactions.find(t => t.description === txDescriptionPrefix && t.category === 'Loan' && Number(t.amount) === Number(debtToDelete.initialAmount || debtToDelete.amount));

                if (linkedTx) {
                  await deleteTransactionFromDB(linkedTx.id);
                  setTransactions(prev => prev.filter(t => t.id !== linkedTx.id));
                }

                await deleteDebt(id);
                setDebts(prev => prev.filter(d => d.id !== id));
              } catch (error) {
                console.error('Error deleting debt:', error);
                alert('Failed to delete debt and revert balance.');
              }
            }}
            onBack={() => setActiveTab('dashboard')}
            onAddTransaction={addTransaction}
          />
        );
      case 'stats':
        return (
          <Stats
            transactions={transactions}
            wallets={wallets}
            budgets={budgets}
            onUpdateBudget={handleUpdateBudget}
            theme={theme}
            initialCategoryFocus={statsFocusCategory as any}
            onFocusReset={() => setStatsFocusCategory(null)}
            isMobile={isMobile}
          />
        );
      case 'transactions':
        return <TransactionList transactions={transactions} onUpdateTransaction={handleUpdateTransaction} />;
      case 'wallets':
        return (
          <WalletManagement
            wallets={wallets}
            transactions={transactions}
            debts={debts}
            onAdd={async (w) => {
              if (!session?.user) return;
              try {
                const existingIndex = wallets.findIndex(wallet => wallet.id === w.id);
                if (existingIndex !== -1) {
                  const updatedWallet = await updateWallet(w.id, w);
                  setWallets(prev => prev.map(wallet => wallet.id === w.id ? updatedWallet : wallet));
                } else {
                  const newWallet = await createWallet(session.user.id, w);
                  setWallets(prev => [...prev, newWallet]);
                }
              } catch (error) {
                console.error('Error saving wallet:', error);
                alert('Failed to save wallet. Please try again.');
              }
            }}
            onDelete={async (id) => {
              if (!confirm('Delete this wallet? All associated transactions will also be deleted.')) return;
              try {
                await deleteWallet(id);
                setWallets(prev => prev.filter(w => w.id !== id));
              } catch (error) {
                console.error('Error deleting wallet:', error);
                alert('Failed to delete wallet. Please try again.');
              }
            }}
            theme={theme}
            onTopup={handleOpenTopup}
            onTransfer={() => setIsTransferModalOpen(true)}
            onDeposit={() => handleOpenTopup(wallets[0]?.id, { title: 'New Deposit' })}
            onWithdraw={() => setIsTransferModalOpen(true)}
            onUpdateBalance={async (walletId, newBalance, diff) => {
              await handleUpdateBalance(walletId, newBalance, diff);
              setSelectedWalletForUpdate(null);
            }}
            onUpdateBalanceRequest={(w) => setSelectedWalletForUpdate(w)}
          />
        );
      case 'profile':
        return (
          <Profile
            userName={userName}
            theme={theme}
            setTheme={setTheme}
            profile={userProfile}
            onUpdateProfile={() => session?.user && loadUserProfile(session.user.id)}
            wallets={wallets}
            deferredPrompt={deferredPrompt}
            onInstallSuccess={() => setDeferredPrompt(null)}
          />
        );
      default:
        return null;
    }
  };

  // Show loading state
  const handleUpdateBudget = (newBudgets: Budget[]) => {
    setBudgets(newBudgets);
    localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(newBudgets));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00d293]/20 border-t-[#00d293] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[11px] font-semibold text-zinc-600 tracking-widest">Loading ArtosKu...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!session) {
    return <Auth onSuccess={() => window.location.reload()} />;
  }

  // Show PIN screen if app is locked
  if (isLocked && userProfile?.pin_enabled && userProfile?.security_pin) {
    return (
      <PinScreen
        onVerify={async (enteredPin) => {
          if (enteredPin === userProfile.security_pin || enteredPin === 'BIOMETRIC_PASS') {
            setIsLocked(false);
            setLastActivity(Date.now()); // Reset activity on unlock
            return true;
          }
          return false;
        }}
        onLogout={async () => {
          await signOut();
          window.location.reload();
        }}
      />
    );
  }

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-500 font-sans overflow-clip relative selection:bg-emerald-500/10">
        {/* Offline Status Banner */}
        <OfflineBanner />
        {/* Background blobs simplified for "Clean" look */}
        <div className="fixed inset-0 pointer-events-none pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -mr-64 -mt-64"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/[0.03] blur-[100px] rounded-full -ml-32 -mb-32"></div>
        </div>

        <div className="relative z-10 w-full min-h-screen flex flex-col max-w-md mx-auto bg-background shadow-[0_0_50px_rgba(0,0,0,0.3)]">
          <main className="flex-1 pb-32">
            <div className="h-full">
              {renderTabContent()}
            </div>
          </main>

          {/* The AI Assistant FAB has been removed as it is now in the Quick Actions menu */}

          <Navigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        <AddTransactionModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setPrefilledData(null); }}
          onAdd={addTransaction}
          wallets={wallets}
          transactions={transactions}
          debts={debts}
          userName={userName}
          prefilledData={prefilledData}
          theme={theme}
        />

        <TopupModal
          isOpen={isTopupModalOpen}
          onClose={() => { setIsTopupModalOpen(false); setPrefilledData(null); }}
          onAdd={addTransaction}
          wallets={wallets}
          prefilledWalletId={prefilledData?.walletId}
          theme={theme}
          title={prefilledData?.title}
          defaultDescription={prefilledData?.description}
          onTransfer={handleTransfer}
        />

        <TransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          onTransfer={handleTransfer}
          wallets={wallets}
          theme={theme}
        />

        <InterUserTransferModal
          isOpen={isInterUserTransferModalOpen}
          onClose={() => setIsInterUserTransferModalOpen(false)}
          wallets={wallets}
          onSuccess={loadData}
        />

        <NotificationModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          wallets={wallets}
          debts={debts}
          theme={theme}
          notifications={notifications}
          onRefresh={loadData}
          onNavigate={(tab) => setActiveTab(tab as TabType)}
        />

        <UpdateBalanceModal
          isOpen={!!selectedWalletForUpdate}
          onClose={() => setSelectedWalletForUpdate(null)}
          wallet={selectedWalletForUpdate}
          onUpdate={handleUpdateBalance}
        />

        <AiChat
          isOpen={isAiChatOpen}
          onClose={() => setIsAiChatOpen(false)}
          transactions={transactions}
          wallets={wallets}
          debts={debts}
          userName={userName}
          onAddTransaction={addTransaction}
        />
      </div>
    </LanguageProvider>
  );
};

export default App;
