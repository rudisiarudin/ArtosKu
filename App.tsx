
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Profile from './components/Profile';
import Stats from './components/Stats';
import DebtManagement from './components/DebtManagement';
import Dashboard from './components/Dashboard';
import Deposit from './components/Deposit';
import TransactionList from './components/TransactionList';
import AddTransactionModal from './components/AddTransactionModal';
import Navigation from './components/Navigation';
import WalletManagement from './components/WalletManagement';
import TopupModal from './components/TopupModal';
import TransferModal from './components/TransferModal';
import NotificationModal from './components/NotificationModal';
import Auth from './components/Auth';
import PinScreen from './components/PinScreen';
import { supabase, getSession, getUserProfile, signOut } from './lib/supabase';
import { fetchWallets, createWallet, updateWallet, deleteWallet, fetchTransactions, createTransaction, deleteTransaction as deleteTransactionFromDB, fetchDebts, createDebt, updateDebt, deleteDebt } from './lib/database';
import { Transaction, Wallet, TransactionType, WalletType, Debt, TabType, UserProfile, Budget } from './types';

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
  useEffect(() => {
    if (!session?.user) return;

    const loadData = async () => {
      try {
        const [walletsData, transactionsData, debtsData] = await Promise.all([
          fetchWallets(session.user.id),
          fetchTransactions(session.user.id),
          fetchDebts(session.user.id)
        ]);

        setWallets(walletsData);
        setTransactions(transactionsData);
        setDebts(debtsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();

    // Load theme from localStorage
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);
  }, [session]);

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

    return hasLowBalance || hasUpcomingDebts;
  }, [wallets, debts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USER, userName);
    localStorage.setItem(STORAGE_KEY_THEME, theme);

    // Update theme class and body background for seamless experience
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.body.style.backgroundColor = theme === 'dark' ? '#09090b' : '#ffffff';
  }, [userName, theme]);

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
    if (!session?.user) return;

    try {
      // 1. Create transaction in Supabase
      const newTransaction = await createTransaction(session.user.id, t);

      // 2. Update wallet balance
      // We perform a local state update first to get the latest wallet data
      let updatedWallet: Wallet | undefined;

      setWallets(prev => {
        const wallet = prev.find(w => w.id === t.walletId);
        if (!wallet) return prev;

        const isIncreasing = t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
        const newBalance = isIncreasing
          ? Number(wallet.balance) + Number(t.amount)
          : Number(wallet.balance) - Number(t.amount);

        updatedWallet = { ...wallet, balance: newBalance };

        // Return updated array
        return prev.map(w => w.id === t.walletId ? updatedWallet! : w);
      });

      // 3. Update local transactions state
      setTransactions(prev => [newTransaction, ...prev]);

      // 4. Update wallet balance in Supabase (side effect)
      // We use a small delay or just wait for the next tick to ensure we have the updatedWallet from the tick
      // Or better, calculate it again for the DB call or pass it from the setWallets logic if possible.
      // For simplicity, we calculate it again based on the known change.
      const currentWallet = wallets.find(w => w.id === t.walletId);
      if (currentWallet) {
        const isIncreasing = t.type === TransactionType.INCOME || t.type === TransactionType.DEBT;
        const dbNewBalance = isIncreasing
          ? Number(currentWallet.balance) + Number(t.amount)
          : Number(currentWallet.balance) - Number(t.amount);
        await updateWallet(t.walletId, { balance: dbNewBalance });
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  }, [session, wallets]);

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
      // 1. Create OUTGOING transaction (Expense)
      await addTransaction({
        amount,
        type: TransactionType.EXPENSE,
        category: 'Transfer',
        date: new Date().toISOString(),
        description: `Transfer ke: ${wallets.find(w => w.id === toId)?.name} - ${description}`,
        walletId: fromId
      });

      // 2. Create INCOMING transaction (Income)
      await addTransaction({
        amount,
        type: TransactionType.INCOME,
        category: 'Transfer',
        date: new Date().toISOString(),
        description: `Transfer dari: ${wallets.find(w => w.id === fromId)?.name} - ${description}`,
        walletId: toId
      });

      // Since addTransaction already updates wallet balances and local state, 
      // calling it twice handles both sides.
    } catch (error) {
      console.error('Error during transfer:', error);
      alert('Transfer failed. Please check your balance.');
    }
  }, [session, wallets, addTransaction]);

  const handleQuickAction = useCallback((label: string) => {
    if (label === 'Hutang' || label === 'Loan') {
      setActiveTab('debt');
      return;
    }

    if (label === 'Deposit') {
      handleOpenTopup(wallets[0]?.id, { title: 'Quick Deposit', description: 'Deposit' });
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            userName={userName}
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
            hasUnreadNotifications={hasNotifications}
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
                // Create debt in Supabase
                const newDebt = await createDebt(session.user.id, d);
                // Update local state
                setDebts(prev => [...prev, newDebt]);
              } catch (error) {
                console.error('Error adding debt:', error);
                alert('Failed to add debt. Please try again.');
              }
            }}
            onUpdateDebt={async (updated) => {
              try {
                // Update debt in Supabase
                const updatedDebt = await updateDebt(updated.id, updated);
                // Update local state
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
                // 1. Revert wallet balance
                const wallet = wallets.find(w => w.id === debtToDelete.walletId);
                if (wallet) {
                  // If it was DEBT (borrowing), balance was increased -> now decrease it
                  // If it was RECEIVABLE (lending), balance was decreased -> now increase it
                  const isIncreasing = debtToDelete.type === TransactionType.DEBT;
                  const revertedBalance = isIncreasing
                    ? Number(wallet.balance) - Number(debtToDelete.initialAmount || debtToDelete.amount)
                    : Number(wallet.balance) + Number(debtToDelete.initialAmount || debtToDelete.amount);

                  await updateWallet(wallet.id, { balance: revertedBalance });
                  setWallets(prev => prev.map(w => w.id === wallet.id ? { ...w, balance: revertedBalance } : w));
                }

                // 2. Delete the specific "New Loan" transaction if it exists
                const txDescriptionPrefix = `New ${debtToDelete.type === TransactionType.DEBT ? 'Hutang' : 'Piutang'}: ${debtToDelete.title}`;
                const linkedTx = transactions.find(t => t.description === txDescriptionPrefix && t.category === 'Loan' && Number(t.amount) === Number(debtToDelete.initialAmount || debtToDelete.amount));

                if (linkedTx) {
                  await deleteTransactionFromDB(linkedTx.id);
                  setTransactions(prev => prev.filter(t => t.id !== linkedTx.id));
                }

                // 3. Delete from Supabase
                await deleteDebt(id);
                // Update local state
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
          />
        );
      case 'transactions':
        return <TransactionList transactions={transactions} />;
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
          />
        );
      case 'deposit':
        return (
          <Deposit
            wallets={wallets}
            transactions={transactions}
            onDeposit={() => handleOpenTopup(wallets[0]?.id, { title: 'New Deposit' })}
            onWithdraw={() => setIsTransferModalOpen(true)}
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
          <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest">Loading ArtosKu...</p>
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
          if (enteredPin === userProfile.security_pin) {
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
    <div className={`min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] transition-colors duration-500 font-sans overflow-x-hidden relative selection:bg-emerald-500/10`}>
      {/* Clean Background - All heavy blobs removed for performance */}

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        <main className="flex-1 pb-24">
          {renderTabContent()}
        </main>
      </div>

      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setPrefilledData(null); }}
        onAdd={addTransaction}
        wallets={wallets}
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

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        wallets={wallets}
        debts={debts}
        theme={theme}
      />
    </div>
  );
};

export default App;
