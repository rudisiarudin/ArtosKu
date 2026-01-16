
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  DEBT = 'DEBT',
  RECEIVABLE = 'RECEIVABLE'
}

export type TabType = 'dashboard' | 'stats' | 'wallets' | 'profile' | 'transactions' | 'debt';

export interface Debt {
  id: string;
  title: string;
  amount: number;
  initialAmount: number;
  dueDate: string;
  type: TransactionType.DEBT | TransactionType.RECEIVABLE;
  isPaid: boolean;
  walletId: string;
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
  | 'Others';

export enum WalletType {
  CASH = 'CASH',
  BANK = 'BANK',
  EWALLET = 'EWALLET'
}

export interface Wallet {
  id: string;
  name: string;
  balance: number; // Initial balance
  color: string;
  icon: string;
  type: WalletType;
  provider?: string;
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
