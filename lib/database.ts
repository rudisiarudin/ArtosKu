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
    // Exclude id from updates to avoid Supabase errors
    const { id, ...dataToUpdate } = updates as any;

    const { data, error } = await supabase
        .from('wallets')
        .update(dataToUpdate)
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

export const updateTransaction = async (transactionId: string, updates: Partial<Transaction>) => {
    // Transform camelCase to snake_case
    const dbUpdates: any = {};
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.walletId !== undefined) dbUpdates.wallet_id = updates.walletId;

    const { data, error } = await supabase
        .from('transactions')
        .update(dbUpdates)
        .eq('id', transactionId)
        .select()
        .single();

    if (error) throw error;

    // Transform snake_case back to camelCase
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
        walletId: item.wallet_id,
        phone: item.phone || undefined
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
            wallet_id: debt.walletId,
            phone: debt.phone || null
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
        walletId: data.wallet_id,
        phone: data.phone || undefined
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
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;

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
        walletId: data.wallet_id,
        phone: data.phone || undefined
    };
};

export const deleteDebt = async (debtId: string) => {
    const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', debtId);

    if (error) throw error;
};

// Inter-User Transfers
export const searchUserByEmail = async (email: string) => {
    const { data, error } = await supabase.rpc('search_profile_by_email', {
        p_email: email
    });

    if (error) {
        console.error('Error in search_profile_by_email RPC:', error);
        // Fallback to direct query if RPC doesn't exist yet (might fail due to RLS)
        const { data: directData, error: directError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .ilike('email', email)
            .single();

        if (directError && directError.code !== 'PGRST116') throw directError;
        return directData;
    }

    return (data && data.length > 0) ? data[0] : null;
};

export const transferToUser = async (fromWalletId: string, toEmail: string, amount: number, description: string) => {
    const { data, error } = await supabase.rpc('transfer_funds', {
        p_sender_wallet_id: fromWalletId,
        p_recipient_email: toEmail,
        p_amount: amount,
        p_description: description
    });

    if (error) throw error;
    return data;
};

// Favorites
export const fetchFavorites = async (userId: string) => {
    const { data, error } = await supabase
        .from('favorites')
        .select(`
            id,
            favorite_id,
            profiles:favorite_id (
                id,
                full_name,
                email,
                avatar_url
            )
        `)
        .eq('user_id', userId);

    if (error) throw error;
    return (data || []).map((f: any) => f.profiles);
};

export const addToFavorites = async (userId: string, favoriteId: string) => {
    const { data, error } = await supabase
        .from('favorites')
        .insert([{ user_id: userId, favorite_id: favoriteId }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const removeFromFavorites = async (userId: string, favoriteId: string) => {
    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('favorite_id', favoriteId);

    if (error) throw error;
};

// Notifications
export const fetchNotifications = async (userId: string) => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const markNotificationRead = async (notificationId: string) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) throw error;
};
