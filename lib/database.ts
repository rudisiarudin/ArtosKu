import { supabase } from './supabase';
import { Wallet, Transaction, Debt, Dream, StockHolding, StockWatchlistItem } from '../types';

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

/**
 * Find-or-create the single "Portofolio Saham" (code=STOCKS) wallet for a user,
 * then update its balance to the given valuation.
 * Queries DB directly to avoid stale React state causing duplicates.
 */
export const findOrUpdateStocksWallet = async (userId: string, totalValuation: number): Promise<void> => {
    // 1. Look up existing STOCKS wallet in DB
    const { data: existing, error: findError } = await supabase
        .from('wallets')
        .select('id, name, balance')
        .eq('user_id', userId)
        .eq('code', 'STOCKS')
        .maybeSingle();

    if (findError) throw findError;

    if (existing) {
        // 2a. Update balance or name if changed
        const updates: any = {};
        if (Math.abs(Number(existing.balance) - totalValuation) > 0.01) {
            updates.balance = totalValuation;
        }
        if (existing.name !== 'Stockbit') {
            updates.name = 'Stockbit';
        }

        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
                .from('wallets')
                .update(updates)
                .eq('id', existing.id);
            if (updateError) throw updateError;
        }
    } else {
        // 2b. Create the wallet for the first time
        const { error: createError } = await supabase
            .from('wallets')
            .insert([{
                user_id: userId,
                name: 'Stockbit',
                code: 'STOCKS',
                type: 'INVESTMENT',
                balance: totalValuation,
                color: '#10b981',
                icon: 'fa-chart-line',
                detail: 'Real-time Stock Valuation'
            }]);
        if (createError) throw createError;
    }
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

// Dreams
export const fetchDreams = async (userId: string) => {
    const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createDream = async (userId: string, dream: Omit<Dream, 'id'>) => {
    const { data, error } = await supabase
        .from('dreams')
        .insert([{
            user_id: userId,
            title: dream.title,
            target_amount: dream.target_amount,
            current_amount: dream.current_amount || 0,
            deadline: dream.deadline,
            color: dream.color || '#10b981',
            icon: dream.icon || 'target'
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateDream = async (dreamId: string, updates: Partial<Dream>) => {
    const { id, user_id, ...dataToUpdate } = updates as any;
    const { data, error } = await supabase
        .from('dreams')
        .update(dataToUpdate)
        .eq('id', dreamId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteDream = async (dreamId: string) => {
    const { error } = await supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId);

    if (error) throw error;
};

// Stocks - Watchlist
export const fetchStockWatchlist = async (userId: string): Promise<StockWatchlistItem[]> => {
    try {
        const { data, error } = await supabase
            .from('stock_watchlist')
            .select('*')
            .eq('user_id', userId);
        
        if (error) throw error;
        return (data || []).map(item => ({
            symbol: item.symbol,
            addedAt: item.created_at || new Date().toISOString()
        }));
    } catch (err) {
        console.warn('stock_watchlist table query failed, falling back to local storage:', err);
        const local = localStorage.getItem(`artosku_stock_watchlist_${userId}`);
        return local ? JSON.parse(local) : [];
    }
};

export const addToStockWatchlist = async (userId: string, symbol: string): Promise<StockWatchlistItem> => {
    try {
        const { data, error } = await supabase
            .from('stock_watchlist')
            .insert([{ user_id: userId, symbol }])
            .select()
            .single();

        if (error) throw error;
        return {
            symbol: data.symbol,
            addedAt: data.created_at
        };
    } catch (err) {
        console.warn('addToStockWatchlist database call failed, using local storage:', err);
        const localKey = `artosku_stock_watchlist_${userId}`;
        const local = localStorage.getItem(localKey);
        const list: StockWatchlistItem[] = local ? JSON.parse(local) : [];
        if (!list.some(item => item.symbol === symbol)) {
            list.push({ symbol, addedAt: new Date().toISOString() });
            localStorage.setItem(localKey, JSON.stringify(list));
        }
        return { symbol, addedAt: new Date().toISOString() };
    }
};

export const removeFromStockWatchlist = async (userId: string, symbol: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('stock_watchlist')
            .delete()
            .eq('user_id', userId)
            .eq('symbol', symbol);

        if (error) throw error;
    } catch (err) {
        console.warn('removeFromStockWatchlist database call failed, using local storage:', err);
        const localKey = `artosku_stock_watchlist_${userId}`;
        const local = localStorage.getItem(localKey);
        if (local) {
            const list: StockWatchlistItem[] = JSON.parse(local);
            const filtered = list.filter(item => item.symbol !== symbol);
            localStorage.setItem(localKey, JSON.stringify(filtered));
        }
    }
};

// Stocks - Holdings
export const fetchStockHoldings = async (userId: string): Promise<StockHolding[]> => {
    try {
        const { data, error } = await supabase
            .from('stock_holdings')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return (data || []).map(item => ({
            id: item.id,
            symbol: item.symbol,
            shares: Number(item.shares),
            averagePrice: Number(item.average_price),
            walletId: item.wallet_id,
            created_at: item.created_at
        }));
    } catch (err) {
        console.warn('stock_holdings table query failed, falling back to local storage:', err);
        const local = localStorage.getItem(`artosku_stock_holdings_${userId}`);
        return local ? JSON.parse(local) : [];
    }
};

export const updateStockHoldingInDB = async (userId: string, holding: StockHolding): Promise<StockHolding> => {
    try {
        const { data, error } = await supabase
            .from('stock_holdings')
            .upsert({
                id: holding.id,
                user_id: userId,
                symbol: holding.symbol,
                shares: holding.shares,
                average_price: holding.averagePrice,
                wallet_id: holding.walletId,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            symbol: data.symbol,
            shares: Number(data.shares),
            averagePrice: Number(data.average_price),
            walletId: data.wallet_id,
            created_at: data.created_at
        };
    } catch (err) {
        console.warn('updateStockHoldingInDB database call failed, using local storage:', err);
        const localKey = `artosku_stock_holdings_${userId}`;
        const local = localStorage.getItem(localKey);
        let list: StockHolding[] = local ? JSON.parse(local) : [];
        const index = list.findIndex(h => h.id === holding.id || (h.symbol === holding.symbol && h.walletId === holding.walletId));
        if (index !== -1) {
            list[index] = { ...list[index], ...holding };
        } else {
            list.push(holding);
        }
        localStorage.setItem(localKey, JSON.stringify(list));
        return holding;
    }
};

export const deleteStockHoldingFromDB = async (userId: string, id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('stock_holdings')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (err) {
        console.warn('deleteStockHoldingFromDB database call failed, using local storage:', err);
        const localKey = `artosku_stock_holdings_${userId}`;
        const local = localStorage.getItem(localKey);
        if (local) {
            const list: StockHolding[] = JSON.parse(local);
            const filtered = list.filter(h => h.id !== id);
            localStorage.setItem(localKey, JSON.stringify(filtered));
        }
    }
};

