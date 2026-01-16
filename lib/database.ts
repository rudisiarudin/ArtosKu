import { supabase } from './supabase';
import { Wallet, Transaction, Debt } from '../types';

// Wallets
export const fetchWallets = async (userId: string) => {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createWallet = async (userId: string, wallet: Omit<Wallet, 'id'>) => {
    const { data, error } = await supabase
        .from('wallets')
        .insert([{ ...wallet, user_id: userId }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateWallet = async (walletId: string, updates: Partial<Wallet>) => {
    const { data, error } = await supabase
        .from('wallets')
        .update(updates)
        .eq('id', walletId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteWallet = async (walletId: string) => {
    const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', walletId);

    if (error) throw error;
};

// Transactions
export const fetchTransactions = async (userId: string) => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (error) throw error;

    // Transform snake_case to camelCase
    return (data || []).map(item => ({
        ...item,
        walletId: item.wallet_id
    }));
};

export const createTransaction = async (userId: string, transaction: Omit<Transaction, 'id'>) => {
    // Destructure to exclude walletId (camelCase) and use wallet_id (snake_case) instead
    const { walletId, ...transactionData } = transaction;

    const { data, error } = await supabase
        .from('transactions')
        .insert([{
            ...transactionData,
            user_id: userId,
            wallet_id: walletId
        }])
        .select()
        .single();

    if (error) throw error;

    // Transform snake_case to camelCase
    return {
        ...data,
        walletId: data.wallet_id
    };
};

export const deleteTransaction = async (transactionId: string) => {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

    if (error) throw error;
};

// Debts
export const fetchDebts = async (userId: string) => {
    const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform snake_case to camelCase
    return (data || []).map(item => ({
        ...item,
        initialAmount: item.initial_amount,
        dueDate: item.due_date,
        isPaid: item.is_paid,
        walletId: item.wallet_id
    }));
};

export const createDebt = async (userId: string, debt: Omit<Debt, 'id'>) => {
    const { data, error } = await supabase
        .from('debts')
        .insert([{
            title: debt.title,
            amount: debt.amount,
            type: debt.type,
            user_id: userId,
            initial_amount: debt.initialAmount,
            due_date: debt.dueDate,
            is_paid: debt.isPaid,
            wallet_id: debt.walletId
        }])
        .select()
        .single();

    if (error) throw error;

    // Transform snake_case to camelCase
    return {
        ...data,
        initialAmount: data.initial_amount,
        dueDate: data.due_date,
        isPaid: data.is_paid,
        walletId: data.wallet_id
    };
};

export const updateDebt = async (debtId: string, updates: Partial<Debt>) => {
    const dbUpdates: any = {};

    // Map camelCase to snake_case
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.initialAmount !== undefined) dbUpdates.initial_amount = updates.initialAmount;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.isPaid !== undefined) dbUpdates.is_paid = updates.isPaid;
    if (updates.walletId !== undefined) dbUpdates.wallet_id = updates.walletId;

    const { data, error } = await supabase
        .from('debts')
        .update(dbUpdates)
        .eq('id', debtId)
        .select()
        .single();

    if (error) throw error;

    // Transform snake_case to camelCase
    return {
        ...data,
        initialAmount: data.initial_amount,
        dueDate: data.due_date,
        isPaid: data.is_paid,
        walletId: data.wallet_id
    };
};

export const deleteDebt = async (debtId: string) => {
    const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', debtId);

    if (error) throw error;
};
