
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  DEBT = 'DEBT',
  RECEIVABLE = 'RECEIVABLE'
}

export type TabType = 'dashboard' | 'stats' | 'wallets' | 'profile' | 'transactions' | 'debt' | 'deposit' | 'dreams' | 'stocks';

export interface Debt {
  id: string;
  title: string;
  amount: number;
  initialAmount: number;
  dueDate: string;
  type: TransactionType.DEBT | TransactionType.RECEIVABLE;
  isPaid: boolean;
  walletId: string;
  phone?: string;
}

export type Category =
  | 'Makan'
  | 'Transport'
  | 'Shop'
  | 'Tagihan'
  | 'Hiburan'
  | 'Kesehatan'
  | 'Gaji'
  | 'Investasi'
  | 'Hadiah'
  | 'Topup'
  | 'Loan'
  | 'Transfer'
  | 'Others';

export enum WalletType {
  CASH = 'CASH',
  BANK = 'BANK',
  EWALLET = 'EWALLET',
  INVESTMENT = 'INVESTMENT'
}

export interface Wallet {
  id: string;
  name: string;
  balance: number; // Initial balance
  color: string;
  icon: string;
  type: WalletType;
  code?: string; // Wallet code (e.g. BCA, GOPAY)
  detail?: string; // e.g. "Main Savings • **** 9012"
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: Category;
  date: string;
  description: string;
  walletId: string; // Linked wallet
}

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  security_pin?: string;
  pin_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AIAnalysis {
  healthScore: number;
  summary: string;
  topInsights: string[];
  recommendations: string[];
  budgetTips: string[];
}

export interface Budget {
  category: Category;
  amount: number;
}

export interface Dream {
  id: string;
  user_id?: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  color?: string;
  icon?: string;
  created_at?: string;
}

export interface StockHolding {
  id: string;
  symbol: string;
  shares: number;
  averagePrice: number;
  walletId?: string | null;
  created_at?: string;
}

export interface StockWatchlistItem {
  symbol: string;
  addedAt: string;
}
