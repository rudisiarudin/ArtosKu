
import React, { useState, useEffect, useCallback } from 'react';
import Profile from './components/Profile';
import Stats from './components/Stats';
import DebtManagement from './components/DebtManagement';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AddTransactionModal from './components/AddTransactionModal';
import Navigation from './components/Navigation';
import WalletManagement from './components/WalletManagement';
import TopupModal from './components/TopupModal';
import Auth from './components/Auth';
import PinScreen from './components/PinScreen';
import { supabase, getSession, getUserProfile, signOut } from './lib/supabase';
import { fetchWallets, createWallet, updateWallet, deleteWallet, fetchTransactions, createTransaction, deleteTransaction as deleteTransactionFromDB, fetchDebts, createDebt, updateDebt, deleteDebt } from './lib/database';
import { Transaction, Wallet, TransactionType, WalletType, Debt, TabType, UserProfile } from './types';

const STORAGE_KEY_TX = 'artosku_transactions_v2';
const STORAGE_KEY_WALLETS = 'artosku_wallets_v2';
const STORAGE_KEY_USER = 'artosku_user_v2';
const STORAGE_KEY_THEME = 'artosku_theme_v2';
const STORAGE_KEY_DEBTS = 'artosku_debts_v2';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [prefilledData, setPrefilledData] = useState<any>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

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
      // Create transaction in Supabase
      const newTransaction = await createTransaction(session.user.id, t);

      // Update local state
      setTransactions(prev => [newTransaction, ...prev]);

      // Calculate new wallet balance
      const wallet = wallets.find(w => w.id === t.walletId);
      if (wallet) {
        // INCOME & RECEIVABLE (Piutang) = uang masuk → tambah saldo
        // EXPENSE & DEBT (Hutang) = uang keluar → kurangi saldo
        const isIncreasing = t.type === TransactionType.INCOME || t.type === TransactionType.RECEIVABLE;
        const newBalance = isIncreasing
          ? Number(wallet.balance) + Number(t.amount)
          : Number(wallet.balance) - Number(t.amount);

        // Update wallet balance in Supabase
        await updateWallet(wallet.id, { balance: newBalance });

        // Update local wallet state
        setWallets(prev => prev.map(w =>
          w.id === wallet.id ? { ...w, balance: newBalance } : w
        ));
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
        const wasIncreasing = txToDelete.type === TransactionType.INCOME || txToDelete.type === TransactionType.RECEIVABLE;
        const newBalance = wasIncreasing
          ? Number(wallet.balance) - Number(txToDelete.amount)
          : Number(wallet.balance) + Number(txToDelete.amount);

        await updateWallet(wallet.id, { balance: newBalance });

        // Update local wallet state
        setWallets(prev => prev.map(w =>
          w.id === wallet.id ? { ...w, balance: newBalance } : w
        ));
      }

      // Update local transaction state
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction. Please try again.');
    }
  }, [transactions, wallets]);

  const handleOpenTopup = useCallback((walletId: string) => {
    setPrefilledData({ walletId });
    setIsTopupModalOpen(true);
  }, []);

  const handleQuickAction = useCallback((label: string) => {
    if (label === 'Hutang' || label === 'Loan') {
      setActiveTab('debt');
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
              if (!confirm('Delete this debt?')) return;

              try {
                // Delete from Supabase
                await deleteDebt(id);
                // Update local state
                setDebts(prev => prev.filter(d => d.id !== id));
              } catch (error) {
                console.error('Error deleting debt:', error);
                alert('Failed to delete debt. Please try again.');
              }
            }}
            onBack={() => setActiveTab('dashboard')}
            onAddTransaction={addTransaction}
          />
        );
      case 'stats':
        return <Stats transactions={transactions} wallets={wallets} theme={theme} />;
      case 'transactions':
        return <TransactionList transactions={transactions} />;
      case 'wallets':
        return (
          <WalletManagement
            wallets={wallets}
            transactions={transactions}
            onAdd={async (w) => {
              if (!session?.user) return;

              try {
                // Check if wallet already exists (update) or is new (add)
                const existingIndex = wallets.findIndex(wallet => wallet.id === w.id);

                if (existingIndex !== -1) {
                  // Update existing wallet in Supabase
                  const updatedWallet = await updateWallet(w.id, w);
                  // Update local state
                  setWallets(prev => prev.map(wallet => wallet.id === w.id ? updatedWallet : wallet));
                } else {
                  // Add new wallet to Supabase
                  const newWallet = await createWallet(session.user.id, w);
                  // Update local state
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
                // Delete from Supabase
                await deleteWallet(id);
                // Update local state
                setWallets(prev => prev.filter(w => w.id !== id));
              } catch (error) {
                console.error('Error deleting wallet:', error);
                alert('Failed to delete wallet. Please try again.');
              }
            }}
            theme={theme}
            onTopup={handleOpenTopup}
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
      />
    </div>
  );
};

export default App;
