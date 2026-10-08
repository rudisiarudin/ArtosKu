import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Wallet, Transaction, TransactionType, StockHolding, StockWatchlistItem, WalletType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { vibrate, fetchYahooFinance } from '../lib/utils';
import { 
  fetchStockWatchlist, 
  addToStockWatchlist, 
  removeFromStockWatchlist, 
  fetchStockHoldings, 
  updateStockHoldingInDB, 
  deleteStockHoldingFromDB,
  createWallet,
  updateWallet,
  findOrUpdateStocksWallet
} from '../lib/database';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid 
} from 'recharts';
import { 
  Search, Plus, X, RefreshCw, Wallet as WalletIcon, TrendingUp, TrendingDown, Eye, AlertCircle, CheckCircle2 
} from 'lucide-react';

interface StockMarketProps {
  userId: string;
  wallets: Wallet[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => Promise<any>;
  theme: 'light' | 'dark';
  isMobile?: boolean;
  onRefreshData?: () => Promise<void>;
}

interface StockDetails {
  symbol: string;
  shortName: string;
  currency: string;
  regularMarketPrice: number;
  previousClose: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  chartData: { date: string; price: number }[];
}

type ChartRange = '1d' | '1w' | '1m' | '3m' | 'ytd' | '1y';

export const StockMarket: React.FC<StockMarketProps> = ({
  userId,
  wallets,
  onAddTransaction,
  theme,
  isMobile = false,
  onRefreshData
}) => {
  const { t } = useLanguage();
  
  // State variables
  const [watchlist, setWatchlist] = useState<StockWatchlistItem[]>([]);
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [watchlistData, setWatchlistData] = useState<Record<string, Partial<StockDetails>>>({});
  
  // Searching & Details
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockDetails | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Selected Stock Details Modal
  const [selectedStock, setSelectedStock] = useState<StockDetails | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>('1m');
  const [loadingChart, setLoadingChart] = useState(false);
  
  // Buy/Sell Transaction Forms
  const [isEditingHolding, setIsEditingHolding] = useState<boolean>(false);
  const [tradeShares, setTradeShares] = useState<number>(0);
  const [tradeLots, setTradeLots] = useState<number>(0);
  const [tradePrice, setTradePrice] = useState<number>(0);
  const [tradePriceInput, setTradePriceInput] = useState<string>('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>(wallets[0]?.id || '');
  const [syncWallet, setSyncWallet] = useState<boolean>(false);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Global loading states
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Sync target wallet: which wallet receives portfolio valuation
  // Persisted in localStorage per userId
  const [syncTargetWalletId, setSyncTargetWalletId] = useState<string>(() => {
    return localStorage.getItem(`artosku_stock_sync_wallet_${userId}`) || 'AUTO';
  });
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  const handleSetSyncWallet = (walletId: string) => {
    setSyncTargetWalletId(walletId);
    localStorage.setItem(`artosku_stock_sync_wallet_${userId}`, walletId);
    setShowWalletSelector(false);
  };

  // IHSG chart state
  const [ihsgData, setIhsgData] = useState<{ date: string; price: number }[]>([]);
  const [ihsgChange, setIhsgChange] = useState<{ price: number; change: number; changePercent: number; open: number; high: number; low: number; previousClose: number } | null>(null);
  const [ihsgLoading, setIhsgLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [liveFlash, setLiveFlash] = useState(false);

  // Popular stock options for quick lookup
  const popularSymbols = ['BBCA', 'TLKM', 'GOTO', 'ASII', 'UNVR', 'NETV'];

  // Format currencies dynamically (IDR vs USD)
  const formatCurrency = useCallback((val: number, currencyCode: string = 'IDR') => {
    if (currencyCode === 'IDR' || currencyCode === 'idr') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: val % 1 === 0 ? 0 : 2
      }).format(val);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
      maximumFractionDigits: 2
    }).format(val);
  }, []);

  // Format compact numbers without currency symbols for high-density tables
  const formatCompactValue = useCallback((val: number, currencyCode: string = 'IDR') => {
    if (currencyCode === 'IDR' || currencyCode === 'idr') {
      return new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: val % 1 === 0 ? 0 : 2
      }).format(val);
    }
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2
    }).format(val);
  }, []);

  // Fetch single stock detailed data from Yahoo Finance via CORS proxy
  const fetchStockYahooData = useCallback(async (symbol: string, range: ChartRange = '1m'): Promise<StockDetails> => {
    let interval = '1d';
    let yahooRange = '1mo';
    
    switch (range) {
      case '1d':
        yahooRange = '1d';
        interval = '5m';
        break;
      case '1w':
        yahooRange = '5d';
        interval = '15m';
        break;
      case '1m':
        yahooRange = '1mo';
        interval = '1d';
        break;
      case '3m':
        yahooRange = '3mo';
        interval = '1d';
        break;
      case 'ytd':
        yahooRange = 'ytd';
        interval = '1d';
        break;
      case '1y':
        yahooRange = '1y';
        interval = '1d';
        break;
    }
    
    let cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol.endsWith('.JK')) {
      cleanSymbol = `${cleanSymbol}.JK`;
    }
    const response = await fetchYahooFinance(cleanSymbol, `range=${yahooRange}&interval=${interval}`);
    if (!response.ok) throw new Error('API server returned error');
    
    const parsed = await response.json();
    if (parsed.chart?.error) {
      throw new Error(parsed.chart.error.description || 'Stock symbol not found');
    }
    
    const result = parsed.chart?.result?.[0];
    if (!result) throw new Error('No stock data found for ' + cleanSymbol);
    
    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const closePrices = result.indicators?.quote?.[0]?.close || [];
    
    const chartData = timestamps.map((ts: number, index: number) => {
      const price = closePrices[index];
      const date = new Date(ts * 1000);
      
      let dateString = '';
      if (range === '1d') {
        dateString = date.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } else if (range === '1w') {
        dateString = date.toLocaleDateString(undefined, {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } else {
        dateString = date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
      }

      return {
        date: dateString,
        price: price ? parseFloat(price.toFixed(2)) : null
      };
    }).filter((item: any) => item.price !== null) as { date: string; price: number }[];

    const currentPrice = meta.regularMarketPrice || (chartData.length > 0 ? chartData[chartData.length - 1].price : 0);
    const prevClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
    const change = currentPrice - prevClose;
    const changePercent = (change / prevClose) * 100;
    
    return {
      symbol: meta.symbol,
      shortName: meta.shortName || meta.longName || meta.symbol,
      currency: meta.currency || 'USD',
      regularMarketPrice: currentPrice,
      previousClose: prevClose,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
      open: meta.regularMarketOpen || currentPrice,
      high: meta.regularMarketDayHigh || currentPrice,
      low: meta.regularMarketDayLow || currentPrice,
      volume: meta.regularMarketVolume || 0,
      chartData
    };
  }, []);

  // Synchronize stock portfolio valuation to a selected wallet
  // Uses DB query directly (STOCKS wallet) or a user-selected wallet
  const syncStockPortfolioWallet = useCallback(async (
    currentHoldings: StockHolding[],
    currentPrices: Record<string, Partial<StockDetails>>
  ) => {
    if (!userId) return;

    // Calculate total real-time value of all holdings
    let totalValuation = 0;
    currentHoldings.forEach(h => {
      const priceData = currentPrices[h.symbol];
      const price = priceData?.regularMarketPrice !== undefined ? priceData.regularMarketPrice : h.averagePrice;
      totalValuation += h.shares * price;
    });

    try {
      const targetId = localStorage.getItem(`artosku_stock_sync_wallet_${userId}`) || 'AUTO';
      if (targetId === 'AUTO' || targetId === 'STOCKS') {
        // Default: use dedicated STOCKS wallet (find-or-create)
        await findOrUpdateStocksWallet(userId, totalValuation);
      } else {
        // User chose a specific existing wallet — just update its balance
        await updateWallet(targetId, { balance: totalValuation });
      }
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error('Failed to sync stock portfolio wallet:', err);
    }
  }, [userId, onRefreshData]);

  // Load watchlist and holdings on mount
  const loadUserStockData = useCallback(async () => {
    if (!userId) return;
    try {
      const [watchlistItems, holdingsItems] = await Promise.all([
        fetchStockWatchlist(userId),
        fetchStockHoldings(userId)
      ]);
      setWatchlist(watchlistItems);
      setHoldings(holdingsItems);
      
      // Prefetch watchlist & holdings prices
      const allSymbols = Array.from(new Set([
        ...watchlistItems.map(item => item.symbol),
        ...holdingsItems.map(h => h.symbol)
      ]));

      const prices: Record<string, Partial<StockDetails>> = {};
      if (allSymbols.length > 0) {
        await Promise.all(allSymbols.map(async (symbol) => {
          try {
            const data = await fetchStockYahooData(symbol, '1m');
            prices[symbol] = data;
          } catch (e) {
            console.error('Error prefetching stock price:', symbol, e);
          }
        }));
        setWatchlistData(prices);
      }

      // Sync wallet balance
      await syncStockPortfolioWallet(holdingsItems, prices);
    } catch (e) {
      console.error('Failed to load user stock data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, fetchStockYahooData, syncStockPortfolioWallet]);

  useEffect(() => {
    loadUserStockData();
  }, [loadUserStockData]);

  // Refs to avoid interval recreation when watchlist/holdings change
  const watchlistRef = React.useRef(watchlist);
  const holdingsRef = React.useRef(holdings);
  const watchlistDataRef = React.useRef(watchlistData);

  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  useEffect(() => {
    holdingsRef.current = holdings;
  }, [holdings]);

  useEffect(() => {
    watchlistDataRef.current = watchlistData;
  }, [watchlistData]);

  // Helper to fetch IHSG data
  const fetchIHSGData = useCallback(async (showLoading = false) => {
    if (showLoading) setIhsgLoading(true);
    try {
      const res = await fetchYahooFinance('%5EJKSE', 'range=1d&interval=5m');
      const parsed = await res.json();
      const result = parsed.chart?.result?.[0];
      if (!result) return;
      const meta = result.meta;
      const timestamps: number[] = result.timestamp || [];
      const closes: number[] = result.indicators?.quote?.[0]?.close || [];
      const chartData = timestamps.map((ts, i) => ({
        date: new Date(ts * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
        price: closes[i] ?? 0
      })).filter(d => d.price > 0);
      setIhsgData(chartData);
      const currentPrice = meta.regularMarketPrice || (chartData.length > 0 ? chartData[chartData.length - 1].price : 0);
      const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const validCloses = closes.filter(p => p > 0);
      const intraHigh = validCloses.length ? Math.max(...validCloses) : 0;
      const intraLow = validCloses.length ? Math.min(...validCloses) : 0;

      setIhsgChange({
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        open: meta.regularMarketOpen || previousClose,
        high: Math.max(intraHigh, currentPrice),
        low: Math.min(intraLow > 0 ? intraLow : currentPrice, currentPrice),
        previousClose: previousClose
      });
    } catch (e) {
      console.error('IHSG fetch failed:', e);
    } finally {
      if (showLoading) setIhsgLoading(false);
    }
  }, []);

  // Fetch IHSG intraday data on mount
  useEffect(() => {
    fetchIHSGData(true);
  }, [fetchIHSGData]);

  // Real-time background price and chart refresh
  const refreshStockPricesAndIHSG = useCallback(async () => {
    if (!userId) return;
    
    // 1. Fetch IHSG (no background loading spinner)
    await fetchIHSGData(false);

    // 2. Fetch Stock Prices
    const currentWatchlist = watchlistRef.current;
    const currentHoldings = holdingsRef.current;
    const currentPrices = watchlistDataRef.current;

    const allSymbols = Array.from(new Set([
      ...currentWatchlist.map(item => item.symbol),
      ...currentHoldings.map(h => h.symbol)
    ]));

    if (allSymbols.length > 0) {
      const prices: Record<string, Partial<StockDetails>> = {};
      await Promise.all(allSymbols.map(async (symbol) => {
        try {
          const data = await fetchStockYahooData(symbol, '1m');
          prices[symbol] = data;
        } catch (e) {
          console.error('Auto-refresh price error:', symbol, e);
        }
      }));
      setWatchlistData(prev => ({ ...prev, ...prices }));
      await syncStockPortfolioWallet(currentHoldings, { ...currentPrices, ...prices });
    }

    // Update last-updated timestamp and flash live dot
    setLastUpdated(new Date());
    setLiveFlash(true);
    setTimeout(() => setLiveFlash(false), 600);
  }, [userId, fetchIHSGData, fetchStockYahooData, syncStockPortfolioWallet]);

  // Set up 10-second polling interval for real-time updates
  useEffect(() => {
    if (!userId) return;
    
    const intervalId = setInterval(() => {
      refreshStockPricesAndIHSG();
    }, 10000); // 10 seconds
    
    return () => clearInterval(intervalId);
  }, [userId, refreshStockPricesAndIHSG]);

  // Refresh Prices
  const handleRefresh = async () => {
    vibrate(10);
    setRefreshing(true);
    await loadUserStockData();
    await fetchIHSGData(true);
    setRefreshing(false);
  };

  // Watchlist functions
  const handleAddToWatchlist = async (symbol: string) => {
    if (!userId) return;
    vibrate(10);
    try {
      const item = await addToStockWatchlist(userId, symbol);
      setWatchlist(prev => [...prev, item]);
      
      // Fetch data for the newly added item
      const data = await fetchStockYahooData(symbol, '1m');
      setWatchlistData(prev => ({ ...prev, [symbol]: data }));
    } catch (e) {
      console.error('Failed to add to watchlist:', e);
    }
  };

  const handleRemoveFromWatchlist = async (symbol: string) => {
    if (!userId) return;
    vibrate(10);
    try {
      await removeFromStockWatchlist(userId, symbol);
      setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
      setWatchlistData(prev => {
        const updated = { ...prev };
        delete updated[symbol];
        return updated;
      });
    } catch (e) {
      console.error('Failed to remove from watchlist:', e);
    }
  };

  // Search stock symbol
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    vibrate(10);
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);
    
    try {
      const data = await fetchStockYahooData(searchQuery.trim());
      setSearchResults(data);
    } catch (e: any) {
      console.error('Search failed:', e);
      setSearchError(e.message || 'Symbol not found. Make sure it is valid (e.g., AAPL or BBCA.JK)');
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch updated chart range when selectedStock chart tab changes
  useEffect(() => {
    if (!selectedStock) return;
    
    const updateChartData = async () => {
      setLoadingChart(true);
      try {
        const data = await fetchStockYahooData(selectedStock.symbol, chartRange);
        // Update ALL stock detail fields so open reference line, colors, and stats stay accurate
        setSelectedStock(data);
      } catch (e) {
        console.error('Failed to reload chart data:', e);
      } finally {
        setLoadingChart(false);
      }
    };
    
    updateChartData();
  }, [chartRange, fetchStockYahooData]);

  // Open details modal
  const openStockDetails = (symbol: string) => {
    vibrate(10);
    const existingData = watchlistData[symbol] || holdings.find(h => h.symbol === symbol) || (searchResults?.symbol === symbol ? searchResults : null);
    if (existingData) {
      // Prefill basic info immediately for instant UI feedback
      setSelectedStock({
        symbol: symbol,
        shortName: (existingData as any).shortName || symbol,
        currency: (existingData as any).currency || 'IDR',
        regularMarketPrice: (existingData as any).regularMarketPrice || (existingData as any).averagePrice || 0,
        previousClose: (existingData as any).previousClose || 0,
        regularMarketChange: (existingData as any).regularMarketChange || 0,
        regularMarketChangePercent: (existingData as any).regularMarketChangePercent || 0,
        open: (existingData as any).open || 0,
        high: (existingData as any).high || 0,
        low: (existingData as any).low || 0,
        volume: (existingData as any).volume || 0,
        chartData: (existingData as any).chartData || []
      });
      // Set to 1D — the chartRange useEffect will fetch full details
      setChartRange('1d');
    } else {
      // Symbol not in watchlist, search it
      setSearchQuery(symbol);
      handleSearch();
    }
  };

  // Open manual record dialog
  const startEditHolding = (stock: StockDetails) => {
    vibrate(15);
    const holding = holdings.find(h => h.symbol === stock.symbol);
    if (holding) {
      setTradeShares(holding.shares);
      setTradeLots(holding.shares / 100);
      setTradePrice(holding.averagePrice);
      setTradePriceInput(holding.averagePrice.toString());
    } else {
      setTradeShares(0);
      setTradeLots(0);
      setTradePrice(stock.regularMarketPrice);
      setTradePriceInput(stock.regularMarketPrice.toString());
    }
    setIsEditingHolding(true);
  };

  // Save/Update manual record
  const handleSaveHolding = async () => {
    if (!selectedStock) return;
    if (tradeLots < 0 || tradePrice < 0) {
      alert(t('stocks.invalid_input'));
      return;
    }

    setTradeLoading(true);
    vibrate(20);

    try {
      const holdingIndex = holdings.findIndex(h => h.symbol === selectedStock.symbol);
      const targetShares = tradeLots * 100;

      if (tradeLots === 0) {
        // Delete holding if lot is 0
        if (holdingIndex !== -1) {
          const currentHolding = holdings[holdingIndex];
          await deleteStockHoldingFromDB(userId, currentHolding.id);
          setHoldings(prev => prev.filter((_, i) => i !== holdingIndex));
        }
        setSuccessMessage(`Berhasil menghapus catatan kepemilikan ${selectedStock.symbol.replace('.JK', '')}.`);
      } else {
        // Save or update
        if (holdingIndex !== -1) {
          const currentHolding = holdings[holdingIndex];
          const updatedHolding = await updateStockHoldingInDB(userId, {
            ...currentHolding,
            shares: targetShares,
            averagePrice: tradePrice,
            walletId: null
          });
          setHoldings(prev => prev.map((h, i) => i === holdingIndex ? updatedHolding : h));
        } else {
          const newHolding = await updateStockHoldingInDB(userId, {
            id: crypto.randomUUID(),
            symbol: selectedStock.symbol,
            shares: targetShares,
            averagePrice: tradePrice,
            walletId: null
          });
          setHoldings(prev => [...prev, newHolding]);
        }
        setSuccessMessage(`Berhasil mencatat kepemilikan ${tradeLots} Lot @ ${formatCurrency(tradePrice, selectedStock.currency)} untuk ${selectedStock.symbol.replace('.JK', '')}.`);
      }

      // Recompute and sync stock portfolio wallet balance immediately
      const updatedHoldings = tradeLots === 0
        ? holdings.filter((_, i) => i !== holdingIndex)
        : (holdingIndex !== -1
            ? holdings.map((h, i) => i === holdingIndex ? { ...h, shares: targetShares, averagePrice: tradePrice } : h)
            : [...holdings, { id: crypto.randomUUID(), symbol: selectedStock.symbol, shares: targetShares, averagePrice: tradePrice, walletId: null }]);
      
      const newPrices = { ...watchlistData, [selectedStock.symbol]: selectedStock };
      await syncStockPortfolioWallet(updatedHoldings, newPrices);

      setIsEditingHolding(false);
      setShowSuccessOverlay(true);

      setTimeout(() => {
        setShowSuccessOverlay(false);
        loadUserStockData();
      }, 2000);

    } catch (e) {
      console.error('Save holding error:', e);
      alert('Gagal menyimpan catatan. Silakan coba lagi.');
    } finally {
      setTradeLoading(false);
    }
  };

  // Calculations for Portfolio Stats
  const portfolioStats = useMemo(() => {
    let totalValueIDR = 0;
    let totalCostIDR = 0;
    
    holdings.forEach(holding => {
      // Get current price of stock, default to avg price if not fetched yet
      const liveData = watchlistData[holding.symbol] || (searchResults?.symbol === holding.symbol ? searchResults : null);
      const currentPrice = liveData?.regularMarketPrice || holding.averagePrice;
      const currency = liveData?.currency || 'IDR';
      
      const exchangeRate = currency === 'IDR' ? 1 : 16300;
      
      totalValueIDR += holding.shares * currentPrice * exchangeRate;
      totalCostIDR += holding.shares * holding.averagePrice * exchangeRate;
    });

    const netProfitLoss = totalValueIDR - totalCostIDR;
    const profitLossPercent = totalCostIDR > 0 ? (netProfitLoss / totalCostIDR) * 100 : 0;

    return {
      totalValue: totalValueIDR,
      totalCost: totalCostIDR,
      profit: netProfitLoss,
      profitPercent: profitLossPercent
    };
  }, [holdings, watchlistData, searchResults]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">{t('stocks.loading_data')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-28 md:pb-16 px-4 md:px-0">
      
      {/* SUCCESS OVERLAY */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
          <div className="text-center space-y-6 max-w-sm p-8 rounded-2xl bg-card border border-emerald-500/30 shadow-xl">
            <div className="size-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto animate-bounce">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-black text-foreground tracking-tight uppercase">Success</h2>
            <p className="text-muted-foreground font-medium text-sm leading-relaxed">{successMessage}</p>
            <div className="h-1 w-24 bg-primary/30 rounded-full overflow-hidden mx-auto">
              <div className="h-full bg-primary animate-[shimmer_2s_infinite] w-full" />
            </div>
          </div>
        </div>
      )}

      {/* HEADER — sticky top */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border -mx-4 px-4 md:mx-0 md:px-0 py-3 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-black text-white tracking-tight uppercase leading-none">{t('stocks.title')}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block size-1.5 rounded-full ${liveFlash ? 'bg-emerald-300' : 'bg-emerald-500'} transition-colors duration-300 animate-pulse`} />
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                {lastUpdated
                  ? `Live · ${lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`
                  : 'Real-time · IDX Market'}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={handleRefresh}
          className={`size-9 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 flex items-center justify-center text-white/50 hover:text-white transition-all ${refreshing ? 'animate-spin text-primary' : ''}`}
        >
          <RefreshCw size={15} />
        </button>
      </header>

      <section className="bg-[#0c0c0e] rounded-xl p-4 md:p-6 border border-zinc-800 space-y-3 md:space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-4 pb-3 border-b border-zinc-900/80 text-left animate-in fade-in">
          <div className="space-y-0.5">
            <p className="text-sm md:text-lg font-black text-white whitespace-nowrap tracking-tight">
              {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(portfolioStats.totalCost)}
            </p>
            <h4 className="text-[9px] md:text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Invested</h4>
          </div>
          <div className="space-y-0.5 text-right">
            <p className="text-sm md:text-lg font-black text-white whitespace-nowrap tracking-tight">
              {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(portfolioStats.totalValue)}
            </p>
            <h4 className="text-[9px] md:text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Market Value</h4>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-4 text-left pb-3 border-b border-zinc-900/60">
          <div className="space-y-0.5">
            <p className={`text-sm md:text-lg font-black whitespace-nowrap tracking-tight ${portfolioStats.profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {portfolioStats.profit >= 0 ? '+' : ''}{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(portfolioStats.profit)}
            </p>
            <h4 className="text-[9px] md:text-[11px] font-bold text-zinc-500 uppercase tracking-wider">P&L</h4>
          </div>
          <div className="space-y-0.5 text-right">
            <p className={`text-sm md:text-lg font-black whitespace-nowrap tracking-tight ${portfolioStats.profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {portfolioStats.profit >= 0 ? '+' : ''}{portfolioStats.profitPercent.toFixed(2)}%
            </p>
            <h4 className="text-[9px] md:text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              {portfolioStats.profit >= 0 ? 'Gain %' : 'Loss %'}
            </h4>
          </div>
        </div>

        {/* Row 3: Sync Target Wallet Selector */}
        <div className="relative">
          <button
            onClick={() => setShowWalletSelector(prev => !prev)}
            className="w-full flex items-center justify-between px-1 py-0.5 group"
          >
            <div className="flex items-center gap-2">
              <WalletIcon size={12} className="text-zinc-500" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sinkronisasi ke</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-emerald-400 tracking-tight">
                {syncTargetWalletId === 'AUTO'
                  ? 'Stockbit (Auto)'
                  : wallets.find(w => w.id === syncTargetWalletId)?.name || 'Pilih Wallet'}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`text-zinc-600 transition-transform ${showWalletSelector ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </button>

          {showWalletSelector && (
            <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-top-1 duration-150">
              {/* Auto option */}
              <button
                onClick={() => handleSetSyncWallet('AUTO')}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all hover:bg-zinc-800 ${syncTargetWalletId === 'AUTO' ? 'text-emerald-400' : 'text-zinc-400'}`}
              >
                <div>
                  <span className="text-[12px] font-black block">Stockbit (Auto)</span>
                  <span className="text-[10px] text-zinc-500">Buat/update wallet khusus otomatis</span>
                </div>
                {syncTargetWalletId === 'AUTO' && <span className="text-emerald-400 text-xs">✓</span>}
              </button>
              <div className="border-t border-zinc-800" />
              {/* Existing wallets */}
              {wallets.filter(w => w.code !== 'STOCKS').map(w => (
                <button
                  key={w.id}
                  onClick={() => handleSetSyncWallet(w.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all hover:bg-zinc-800 ${syncTargetWalletId === w.id ? 'text-emerald-400' : 'text-zinc-400'}`}
                >
                  <div>
                    <span className="text-[12px] font-black block">{w.name}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">{w.type} · {w.code || '-'}</span>
                  </div>
                  {syncTargetWalletId === w.id && <span className="text-emerald-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* IHSG INTRADAY CHART */}
      <section className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 rounded-xl border border-zinc-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div>
            <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">IHSG · ^JKSE</p>
            {ihsgChange && (() => {
              const openPrice = ihsgChange.open;
              const changeFromOpen = ihsgChange.price - openPrice;
              const pctFromOpen = openPrice > 0 ? (changeFromOpen / openPrice) * 100 : 0;
              const isUpFromOpen = changeFromOpen >= 0;
              return (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-black text-white tabular-nums">
                    {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(ihsgChange.price)}
                  </span>
                  <span className={`text-[12px] font-bold ${isUpFromOpen ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {changeFromOpen >= 0 ? '+' : ''}{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(changeFromOpen)}
                    ({pctFromOpen >= 0 ? '+' : ''}{pctFromOpen.toFixed(2)}%)
                  </span>
                </div>
              );
            })()}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${liveFlash ? 'bg-emerald-300' : 'bg-emerald-500'} transition-colors duration-300 animate-pulse`} />
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
            </div>
            {lastUpdated && (
              <span className="text-[8px] font-bold text-zinc-600 tabular-nums">
                {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            )}
          </div>
        </div>

        {/* Chart — Stockbit-style: Y-axis right, auto-fit domain, smooth monotone */}
        <div className="h-[190px] mt-2">
          {ihsgLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="size-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : ihsgData.length > 0 ? (() => {
            // Color based on current price vs open price
            const openPrice = ihsgChange ? ihsgChange.open : 0;
            const currentPrice = ihsgChange ? ihsgChange.price : 0;
            const isUp = openPrice > 0 ? currentPrice >= openPrice : true;
            const color = isUp ? '#10b981' : '#f43f5e';
            const prices = ihsgData.map(d => d.price).filter(p => p > 0);
            
            const prevClose = ihsgChange ? ihsgChange.previousClose : 0;
            const allValues = [...prices];
            if (prevClose > 0) {
              allValues.push(prevClose);
            }
            const minPrice = allValues.length ? Math.min(...allValues) : 0;
            const maxPrice = allValues.length ? Math.max(...allValues) : 0;
            const rangeDiff = maxPrice - minPrice;
            const padding = rangeDiff * 0.15 || 20;
            // Y-axis ticks: 4 evenly-spaced levels
            const yMin = minPrice - padding;
            const yMax = maxPrice + padding;
            const step = (yMax - yMin) / 3;
            const yTicks = [0, 1, 2, 3].map(i => Math.round(yMin + i * step));

            return (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ihsgData} margin={{ top: 12, right: 4, left: 12, bottom: 8 }}>
                  <defs>
                    <linearGradient id="ihsgGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={color} stopOpacity={0.18}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} vertical={false} />

                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#52525b', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}
                    interval={Math.floor(ihsgData.length / 4) || 'preserveEnd'}
                    dy={4}
                    padding={{ left: 8, right: 8 }}
                  />

                  <YAxis
                    domain={[yMin, yMax]}
                    ticks={yTicks}
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tick={{ fill: '#52525b', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}
                    tickFormatter={(v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v)}
                  />

                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff', fontSize: '10px' }}
                    itemStyle={{ color: color, fontWeight: 'bold' }}
                    labelStyle={{ color: '#71717a', fontSize: '10px', fontWeight: 'bold', marginBottom: '2px' }}
                    formatter={(value: any) => [new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value), 'Index']}
                    labelFormatter={(label) => `Waktu: ${label}`}
                  />

                  {ihsgChange && ihsgChange.open > 0 && (
                    <ReferenceLine
                      y={ihsgChange.open}
                      stroke="#3f3f46"
                      strokeDasharray="5 4"
                      strokeWidth={1}
                    />
                  )}

                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={color}
                    strokeWidth={1.8}
                    fill="url(#ihsgGrad2)"
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            );
          })() : (
            <div className="h-full flex items-center justify-center">
              <span className="text-[10px] text-zinc-600 font-bold">Data tidak tersedia</span>
            </div>
          )}
        </div>

        {/* Intraday Stats: Open / High / Low */}
        {ihsgChange && (
          <div className="grid grid-cols-3 divide-x divide-zinc-800/60 border-t border-zinc-800/80 bg-zinc-950/40">
            {[
              { label: 'Open', val: ihsgChange.open },
              { label: 'High', val: ihsgChange.high, color: 'text-emerald-400' },
              { label: 'Low', val: ihsgChange.low, color: 'text-rose-500' }
            ].map(({ label, val, color }) => (
              <div key={label} className="px-4 py-3 text-center">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
                <p className={`text-xs font-black tabular-nums mt-0.5 ${color || 'text-white'}`}>
                  {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(val)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SEARCH — professional, no hot tickers */}
      <section className="space-y-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={15} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              placeholder="Cari saham — misal BBCA, TLKM, GOTO..."
              className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-all tracking-wide"
            />
          </div>
          <button 
            type="submit"
            disabled={searchLoading || !searchQuery.trim()}
            className="px-5 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center min-w-[70px]"
          >
            {searchLoading ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : 'Cari'}
          </button>
        </form>

        {/* Search Results Preview Card */}
        {searchError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-bold uppercase tracking-wider">
            <AlertCircle size={16} />
            <span>{searchError}</span>
          </div>
        )}

        {searchResults && (
          <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800 flex flex-col gap-3 animate-in slide-in-from-top duration-300">
            {/* Stock Info and Price row */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white uppercase tracking-tight">{searchResults.symbol.replace('.JK', '')}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 font-black text-zinc-400 uppercase tracking-widest">{searchResults.currency}</span>
                </div>
                <p className="text-[11px] font-bold text-zinc-400 mt-0.5">{searchResults.shortName}</p>
              </div>
              
              <div className="text-right">
                <p className="text-base font-black text-white tracking-tight">{formatCurrency(searchResults.regularMarketPrice, searchResults.currency)}</p>
                <p className={`text-[11px] font-bold mt-0.5 flex items-center gap-1 justify-end ${searchResults.regularMarketChange >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {searchResults.regularMarketChange >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  <span>{searchResults.regularMarketChange >= 0 ? '+' : ''}{searchResults.regularMarketChangePercent.toFixed(2)}%</span>
                </p>
              </div>
            </div>

            {/* Actions Grid (Row below) */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-900/60">
              <button
                onClick={() => openStockDetails(searchResults.symbol)}
                className="py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] md:text-xs font-black text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all uppercase tracking-widest text-center"
              >
                Detail
              </button>
              {watchlist.some(w => w.symbol === searchResults.symbol) ? (
                <button
                  onClick={() => handleRemoveFromWatchlist(searchResults.symbol)}
                  className="py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[10px] md:text-xs font-black text-rose-400 hover:bg-rose-500/20 transition-all uppercase tracking-widest text-center"
                >
                  Unwatch
                </button>
              ) : (
                <button
                  onClick={() => handleAddToWatchlist(searchResults.symbol)}
                  className="py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] md:text-xs font-black text-zinc-400 hover:text-white hover:border-zinc-700 transition-all uppercase tracking-widest text-center"
                >
                  Watch
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedStock(searchResults);
                  startEditHolding(searchResults);
                }}
                className="py-2 rounded-lg bg-emerald-500 text-zinc-950 text-[10px] md:text-xs font-black hover:bg-emerald-400 transition-all uppercase tracking-widest text-center"
              >
                Catat
              </button>
            </div>
          </div>
        )}
      </section>

      {/* STOCK DETAILS PANEL (INLINE ACCORDION CLOSE UP/DOWN) */}
      {selectedStock && (
        <section className="py-4 md:py-6 space-y-4 md:space-y-6 relative animate-in slide-in-from-top duration-300">
          
          {/* Close */}
          <button 
            onClick={() => setSelectedStock(null)}
            className="absolute right-0 top-4 size-8 md:size-10 rounded-full bg-zinc-900/60 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all animate-in fade-in"
          >
            <X size={16} />
          </button>

          {/* Title / Info */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">{selectedStock.symbol.replace('.JK', '')}</h2>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 font-black text-zinc-400 uppercase tracking-widest">{selectedStock.currency}</span>
            </div>
            <p className="text-[11px] md:text-xs font-bold text-zinc-400">{selectedStock.shortName}</p>
          </div>

          {/* Price Quote */}
          {(() => {
            // Compute range-aware change: use chartPreviousClose from API,
            // fallback to first chart data point for accuracy
            let rangeChange = selectedStock.regularMarketChange;
            let rangeChangePercent = selectedStock.regularMarketChangePercent;

            // If chart data exists, compute change from first visible data point as fallback
            if (selectedStock.chartData && selectedStock.chartData.length > 1) {
              const firstPrice = selectedStock.chartData[0]?.price;
              const refPrice = selectedStock.previousClose > 0 ? selectedStock.previousClose : firstPrice;
              if (refPrice > 0) {
                rangeChange = selectedStock.regularMarketPrice - refPrice;
                rangeChangePercent = (rangeChange / refPrice) * 100;
              }
            }

            const rangeLabels: Record<ChartRange, string> = {
              '1d': 'Hari Ini',
              '1w': '1 Minggu',
              '1m': '1 Bulan',
              '3m': '3 Bulan',
              'ytd': 'YTD',
              '1y': '1 Tahun'
            };

            return (
              <div className="space-y-0.5">
                <div className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  {selectedStock.currency === 'IDR' 
                    ? new Intl.NumberFormat('id-ID').format(selectedStock.regularMarketPrice) 
                    : formatCurrency(selectedStock.regularMarketPrice, selectedStock.currency)}
                </div>
                <div className={`text-[11px] md:text-xs font-bold flex items-center gap-1.5 ${rangeChange >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  <span>{rangeChange >= 0 ? '↗' : '↘'}</span>
                  <span>
                    {selectedStock.currency === 'IDR'
                      ? new Intl.NumberFormat('id-ID').format(Math.abs(rangeChange))
                      : Math.abs(rangeChange).toFixed(2)}
                    {' '}({rangeChange >= 0 ? '+' : ''}{rangeChangePercent.toFixed(2)}%)
                  </span>
                  <span className="text-zinc-500 font-medium ml-1">{rangeLabels[chartRange]}</span>
                </div>
              </div>
            );
          })()}

          {/* Chart Area */}
          <div className="space-y-3">
            <div className="flex border-b border-zinc-900 justify-between items-center px-1">
              {([
                { range: '1d', label: '1D' },
                { range: '1w', label: '1W' },
                { range: '1m', label: '1M' },
                { range: '3m', label: '3M' },
                { range: 'ytd', label: 'YTD' },
                { range: '1y', label: '1Y' }
              ] as const).map(tab => (
                <button 
                  key={tab.range}
                  onClick={() => {
                    vibrate(5);
                    setChartRange(tab.range);
                  }}
                  className={`py-2 text-[11px] md:text-xs font-black transition-all border-b-2 relative -mb-[2px] ${
                    chartRange === tab.range 
                      ? 'border-emerald-500 text-emerald-400 font-extrabold' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="h-[200px] md:h-[260px] w-full flex items-center justify-center relative pt-2">
              {loadingChart ? (
                <div className="size-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              ) : selectedStock.chartData && selectedStock.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    const stockColor = selectedStock.regularMarketChange >= 0 ? '#10b981' : '#f43f5e';
                    // Compute Y-axis domain that includes previousClose so reference line is always visible
                    const prices = selectedStock.chartData.map(d => d.price).filter(p => p > 0);
                    const prevClose = selectedStock.previousClose;
                    const allValues = [...prices];
                    if (prevClose > 0) allValues.push(prevClose);
                    const dataMin = allValues.length ? Math.min(...allValues) : 0;
                    const dataMax = allValues.length ? Math.max(...allValues) : 0;
                    const rangeDiff = dataMax - dataMin;
                    const pad = rangeDiff * 0.12 || 2;
                    const yMin = dataMin - pad;
                    const yMax = dataMax + pad;
                    return (
                      <AreaChart data={selectedStock.chartData} margin={{ right: 5, left: 5 }}>
                        <defs>
                          <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={stockColor} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={stockColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#52525b', fontSize: 9, fontWeight: 700 }}
                          dy={10}
                        />
                        <YAxis 
                          domain={[yMin, yMax]}
                          axisLine={false} 
                          tickLine={false} 
                          orientation="right"
                          tick={{ fill: '#52525b', fontSize: 9, fontWeight: 700 }}
                          tickFormatter={(val) => selectedStock.currency === 'IDR' ? new Intl.NumberFormat('id-ID').format(val) : `$${val.toFixed(2)}`}
                          dx={8}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff', fontSize: '10px' }}
                          itemStyle={{ color: stockColor, fontWeight: 'bold' }}
                          labelStyle={{ color: '#71717a', fontSize: '10px', fontWeight: 'bold', marginBottom: '2px' }}
                        />
                        <ReferenceLine y={prevClose} stroke="#3f3f46" strokeDasharray="3 3" />
                        <Area 
                          type="step" 
                          dataKey="price" 
                          stroke={stockColor}
                          strokeWidth={2} 
                          fill="url(#stockGrad)"
                          fillOpacity={1}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls
                        />
                      </AreaChart>
                    );
                  })()}
                </ResponsiveContainer>
              ) : (
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">No historical data available</p>
              )}
            </div>
          </div>

          {/* Key Statistics */}
          <div className="space-y-2">
            <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">{t('stocks.stats')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-1.5 border-y border-zinc-900">
              <div className="py-1">
                <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-wider">{t('stocks.open')}</p>
                <p className="text-xs md:text-sm font-black text-white mt-0.5">
                  {selectedStock.currency === 'IDR' 
                    ? new Intl.NumberFormat('id-ID').format(selectedStock.open) 
                    : formatCurrency(selectedStock.open, selectedStock.currency)}
                </p>
              </div>
              <div className="py-1">
                <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-wider">{t('stocks.high')}</p>
                <p className="text-xs md:text-sm font-black text-emerald-400 mt-0.5">
                  {selectedStock.currency === 'IDR' 
                    ? new Intl.NumberFormat('id-ID').format(selectedStock.high) 
                    : formatCurrency(selectedStock.high, selectedStock.currency)}
                </p>
              </div>
              <div className="py-1">
                <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-wider">{t('stocks.low')}</p>
                <p className="text-xs md:text-sm font-black text-rose-400 mt-0.5">
                  {selectedStock.currency === 'IDR' 
                    ? new Intl.NumberFormat('id-ID').format(selectedStock.low) 
                    : formatCurrency(selectedStock.low, selectedStock.currency)}
                </p>
              </div>
              <div className="py-1">
                <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-wider">{t('stocks.volume')}</p>
                <p className="text-xs md:text-sm font-black text-white mt-0.5">{(selectedStock.volume / 1000000).toFixed(2)}M</p>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex gap-2 pt-2">
            {watchlist.some(w => w.symbol === selectedStock.symbol) ? (
              <button
                onClick={() => handleRemoveFromWatchlist(selectedStock.symbol)}
                className="flex-1 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] md:text-xs font-black text-rose-500 hover:bg-rose-500/5 transition-all uppercase tracking-widest"
              >
                {t('stocks.remove_watchlist')}
              </button>
            ) : (
              <button
                onClick={() => handleAddToWatchlist(selectedStock.symbol)}
                className="flex-1 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] md:text-xs font-black text-zinc-300 hover:bg-zinc-800 transition-all uppercase tracking-widest"
              >
                {t('stocks.add_watchlist')}
              </button>
            )}
            
            <button
              onClick={() => startEditHolding(selectedStock)}
              className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-zinc-950 text-[10px] md:text-xs font-black hover:bg-emerald-400 transition-all uppercase tracking-widest"
            >
              {holdings.some(h => h.symbol === selectedStock.symbol) ? 'Edit Catatan Saham' : 'Catat Kepemilikan Saham'}
            </button>
          </div>

        </section>
      )}

      {/* WATCHLIST & HOLDINGS PANELS */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Watchlist Panel (Left) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-card/40 backdrop-blur-3xl rounded-xl p-4 md:p-6 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">{t('stocks.watchlist')}</h3>
                {lastUpdated && <span className={`size-1.5 rounded-full ${liveFlash ? 'bg-emerald-300' : 'bg-emerald-600'} transition-colors duration-300 animate-pulse`} />}
              </div>
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full font-black text-zinc-400">{watchlist.length} Tickers</span>
            </div>

            {watchlist.length === 0 ? (
              <p className="text-center py-8 text-zinc-600 text-xs font-bold uppercase tracking-wider leading-relaxed">{t('stocks.no_watchlist')}</p>
            ) : (
              <div className="space-y-2.5">
                {watchlist.map(item => {
                  const data = watchlistData[item.symbol];
                  const price = data?.regularMarketPrice;
                  const changePercent = data?.regularMarketChangePercent;
                  const currency = data?.currency || 'IDR';

                  return (
                    <div 
                      key={item.symbol} 
                      onClick={() => openStockDetails(item.symbol)}
                      className="p-3 rounded-xl bg-zinc-950/20 border border-zinc-800/40 hover:border-zinc-800 flex items-center justify-between cursor-pointer group transition-all"
                    >
                      <div>
                        <p className="text-xs md:text-sm font-black text-white uppercase group-hover:text-primary transition-all">{item.symbol.replace('.JK', '')}</p>
                        <p className="text-[9px] md:text-[10px] font-bold text-zinc-500 truncate w-24 md:w-48 mt-0.5">
                          {data?.shortName || 'Loading...'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 md:gap-4">
                        {price !== undefined ? (
                          <div className="text-right">
                            <p className={`text-xs md:text-sm font-black tracking-tight transition-colors duration-300 ${liveFlash ? 'text-emerald-300' : 'text-white'}`}>{formatCurrency(price, currency)}</p>
                            <p className={`text-[9px] md:text-[10px] font-bold mt-0.5 flex items-center gap-1 justify-end ${changePercent && changePercent >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {changePercent && changePercent >= 0 ? '+' : ''}{changePercent?.toFixed(2)}%
                            </p>
                          </div>
                        ) : (
                          <div className="w-16 h-8 bg-zinc-900 rounded-lg animate-pulse" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromWatchlist(item.symbol);
                          }}
                          className="size-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Holdings Panel (Right) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-card/40 backdrop-blur-3xl rounded-xl p-4 md:p-6 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">{t('stocks.portfolio')}</h3>
                {lastUpdated && <span className={`size-1.5 rounded-full ${liveFlash ? 'bg-emerald-300' : 'bg-emerald-600'} transition-colors duration-300 animate-pulse`} />}
              </div>
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full font-black text-zinc-400">{holdings.length} Positions</span>
            </div>

            {holdings.length === 0 ? (
              <p className="text-center py-12 text-zinc-600 text-xs font-bold uppercase tracking-wider leading-relaxed">{t('stocks.no_holdings')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-[10px] md:text-[11px] font-black text-zinc-500 uppercase tracking-wider">
                      <th className="pb-2.5 md:pb-4 text-left pr-2">Code<span className="block text-[8px] md:text-[9px] font-normal text-zinc-600 mt-0.5 normal-case">Lot</span></th>
                      <th className="pb-2.5 md:pb-4 text-right px-2">Invested<span className="block text-[8px] md:text-[9px] font-normal text-zinc-600 mt-0.5 normal-case">Avg Price</span></th>
                      <th className="pb-2.5 md:pb-4 text-right px-2">Market<span className="block text-[8px] md:text-[9px] font-normal text-zinc-600 mt-0.5 normal-case">Current Price</span></th>
                      <th className="pb-2.5 md:pb-4 text-right pl-2 font-black">P&L<span className="block text-[8px] md:text-[9px] font-normal text-zinc-600 mt-0.5 normal-case">Gain</span></th>
                      <th className="pb-2.5 md:pb-4 pl-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {holdings.map(holding => {
                      const data = watchlistData[holding.symbol] || (searchResults?.symbol === holding.symbol ? searchResults : null);
                      const currentPrice = data?.regularMarketPrice || holding.averagePrice;
                      const currency = data?.currency || 'IDR';
                      
                      const totalCost = holding.shares * holding.averagePrice;
                      const currentValue = holding.shares * currentPrice;
                      const profitLoss = currentValue - totalCost;
                      const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
                      const dailyChangePercent = data?.regularMarketChangePercent || 0;

                      return (
                        <tr 
                          key={holding.id}
                          className="group transition-colors"
                        >
                          {/* Code / Lot */}
                          <td className="py-2.5 md:py-3.5 pr-2">
                            <button
                              onClick={() => openStockDetails(holding.symbol)}
                              className="text-left"
                            >
                              <span className="text-xs md:text-sm font-black text-white group-hover:text-primary transition-all uppercase">{holding.symbol.replace('.JK', '')}</span>
                              <span className="block text-[9px] md:text-[10px] font-bold text-zinc-500 mt-0.5 font-mono">{(holding.shares / 100).toLocaleString('id-ID')} Lot</span>
                            </button>
                          </td>
                          {/* Invested / Avg Price */}
                          <td className="py-2.5 md:py-3.5 px-2 text-right">
                            <span className="font-mono text-xs md:text-sm text-zinc-200 font-bold">{formatCompactValue(totalCost, currency)}</span>
                            <span className="block text-[9px] md:text-[10px] font-bold text-zinc-500 mt-0.5 font-mono">{formatCompactValue(holding.averagePrice, currency)}</span>
                          </td>
                          {/* Market / Current Price */}
                          <td className="py-2.5 md:py-3.5 px-2 text-right">
                            <span className={`font-mono text-xs md:text-sm font-bold transition-colors duration-300 ${liveFlash ? 'text-emerald-300' : 'text-zinc-200'}`}>{formatCompactValue(currentValue, currency)}</span>
                            <span className={`block text-[9px] md:text-[10px] font-bold mt-0.5 font-mono ${dailyChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {formatCompactValue(currentPrice, currency)}
                            </span>
                          </td>
                          {/* P&L / Gain */}
                          <td className="py-2.5 md:py-3.5 pl-2 text-right">
                            <span className={`font-mono text-xs md:text-sm font-black ${profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {profitLoss >= 0 ? '+' : ''}{formatCompactValue(profitLoss, currency)}
                            </span>
                            <span className={`block text-[9px] md:text-[10px] font-bold mt-0.5 font-mono ${profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
                            </span>
                          </td>
                          {/* Edit Button */}
                          <td className="py-2.5 md:py-3.5 pl-2 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                vibrate(10);
                                // Use cached price data if available, otherwise build minimal object
                                const stockData: StockDetails = data ? (data as StockDetails) : {
                                  symbol: holding.symbol,
                                  shortName: holding.symbol.replace('.JK', ''),
                                  currency: 'IDR',
                                  regularMarketPrice: holding.averagePrice,
                                  previousClose: holding.averagePrice,
                                  regularMarketChange: 0,
                                  regularMarketChangePercent: 0,
                                  open: holding.averagePrice,
                                  high: holding.averagePrice,
                                  low: holding.averagePrice,
                                  volume: 0,
                                  chartData: []
                                };
                                setSelectedStock(stockData);
                                startEditHolding(stockData);
                              }}
                              className="size-7 md:size-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all ml-auto"
                              title="Edit kepemilikan"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </section>

      {/* (MODAL DELETED - NOW INLINE) */}

      {/* MANUAL PORTFOLIO RECORD DIALOG */}
      {isEditingHolding && selectedStock && (
        <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
          {/* Backdrop tap to close */}
          <div className="absolute inset-0" onClick={() => setIsEditingHolding(false)} />
          
          <div className="relative w-full max-w-md bg-[#0e0e0e] border border-zinc-800 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-1" />

            {/* Content */}
            <div className="px-6 pt-4 pb-6 space-y-5">

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-emerald-400">
                    {holdings.some(h => h.symbol === selectedStock.symbol) ? 'Edit Catatan' : 'Catat Saham'}
                  </h3>
                  <p className="text-[11px] font-bold text-zinc-500 mt-0.5">{selectedStock.symbol.replace('.JK', '')} · {selectedStock.shortName}</p>
                </div>
                <button 
                  onClick={() => setIsEditingHolding(false)}
                  className="size-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 active:scale-90 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Live price info */}
              <div className="flex items-center justify-between bg-zinc-900/60 rounded-xl px-4 py-3 border border-zinc-800">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Harga Pasar Sekarang</span>
                <span className="text-sm font-black text-white tabular-nums">
                  {selectedStock.currency === 'IDR'
                    ? new Intl.NumberFormat('id-ID').format(selectedStock.regularMarketPrice)
                    : formatCurrency(selectedStock.regularMarketPrice, selectedStock.currency)}
                </span>
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                {/* Lots */}
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-2">
                    Jumlah Lot <span className="text-zinc-600 normal-case font-bold">(1 Lot = 100 Lembar)</span>
                  </label>
                  <input 
                    type="number"
                    min="0"
                    step="1"
                    value={tradeLots === 0 ? '' : tradeLots}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setTradeLots(val);
                      setTradeShares(val * 100);
                    }}
                    placeholder="0"
                    className="w-full px-5 py-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[16px] font-bold text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono placeholder:text-zinc-700"
                  />
                  {tradeLots === 0 && (
                    <p className="text-[9px] font-bold text-rose-500/60 mt-1.5 uppercase tracking-wide">
                      ⚠ Set ke 0 untuk menghapus catatan saham ini
                    </p>
                  )}
                </div>

                {/* Price per Share (AVG) */}
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-2">
                    Harga Rata-rata Beli <span className="text-zinc-600 normal-case font-bold">({selectedStock.currency})</span>
                  </label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={tradePriceInput}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      setTradePriceInput(rawVal);
                      const normalized = rawVal.replace(/,/g, '.');
                      const parsed = parseFloat(normalized);
                      if (!isNaN(parsed)) {
                        setTradePrice(Math.max(0, parsed));
                      } else {
                        setTradePrice(0);
                      }
                    }}
                    placeholder="contoh: 578.42"
                    className="w-full px-5 py-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[16px] font-bold text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono placeholder:text-zinc-700"
                  />
                </div>
              </div>

              {/* Summary preview */}
              {tradeLots > 0 && tradePrice > 0 && (
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 border-t border-zinc-800/60 pt-4">
                  <span>Total Nilai Beli</span>
                  <span className="text-white font-black">
                    {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(tradeLots * 100 * tradePrice)}
                  </span>
                </div>
              )}

              {/* Save Button — always prominent */}
              <button
                onClick={handleSaveHolding}
                disabled={tradeLoading || tradeLots < 0 || tradePrice < 0}
                className="w-full h-14 rounded-2xl bg-emerald-500 text-black text-[13px] font-black uppercase tracking-[0.2em] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {tradeLoading ? (
                  <><RefreshCw size={16} className="animate-spin" /> Menyimpan...</>
                ) : tradeLots === 0 ? (
                  '🗑 Hapus Catatan'
                ) : (
                  '✓ Simpan Catatan'
                )}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
