// /src/services/etfDataService.ts

import fetch from 'node-fetch';

export interface ETFDataPoint {
  symbol: string;
  name: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ETFFundamentals {
  symbol: string;
  name: string;
  netAssets: number;
  expenseRatio: number;
  yieldPercent: number;
  assetClass: string;
}

// Key ETFs for cross-asset Fed policy analysis
export const TARGET_ETFS = {
  TLT: { name: '20+ Year Treasury Bond ETF', assetClass: 'Bonds' },
  SPY: { name: 'S&P 500 ETF', assetClass: 'Equities' },
  XLF: { name: 'Financial Sector ETF', assetClass: 'Equities' },
  HYG: { name: 'High Yield Corporate Bond ETF', assetClass: 'Credit' },
  LQD: { name: 'Investment Grade Corporate Bond ETF', assetClass: 'Credit' },
  GLD: { name: 'Gold ETF', assetClass: 'Commodities' },
  XLE: { name: 'Energy Sector ETF', assetClass: 'Equities' },
  IWM: { name: 'Russell 2000 ETF', assetClass: 'Equities' }
};

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Get Alpha Vantage API key from environment or CLI argument
 */
export const getAlphaVantageApiKey = (cliApiKey?: string): string => {
  const apiKey = cliApiKey || process.env.ALPHA_VANTAGE_API_KEY || '';
  
  if (!apiKey || apiKey === 'YOUR_ALPHA_VANTAGE_API_KEY_HERE') {
    throw new Error(
      'Alpha Vantage API key is required for ETF data. Please:\\n' +
      '1. Get a free API key from: https://www.alphavantage.co/support/#api-key\\n' +
      '2. Set it in a .env file: ALPHA_VANTAGE_API_KEY=your_key_here\\n' +
      '3. Or use the --alpha-vantage-key flag'
    );
  }
  
  return apiKey;
};

/**
 * Fetch historical daily data for an ETF from Alpha Vantage
 */
export const fetchETFHistoricalData = async (
  symbol: string, 
  apiKey: string,
  outputSize: 'compact' | 'full' = 'full'
): Promise<ETFDataPoint[]> => {
  const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=${outputSize}&apikey=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as any;
    
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage error for ${symbol}: ${data['Error Message']}`);
    }
    
    if (data['Note']) {
      throw new Error(`Alpha Vantage rate limit: ${data['Note']}`);
    }
    
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      console.warn(`No time series data found for ${symbol}`);
      return [];
    }
    
    const dataPoints: ETFDataPoint[] = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const point: ETFDataPoint = {
        symbol,
        name: TARGET_ETFS[symbol]?.name || symbol,
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['5. adjusted close']), // Use adjusted close for accurate analysis
        volume: parseInt(values['6. volume'])
      };
      dataPoints.push(point);
    }
    
    // Sort by date (oldest first)
    return dataPoints.sort((a, b) => a.date.localeCompare(b.date));
    
  } catch (error) {
    console.error(`Error fetching ETF data for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Fetch ETF overview/fundamentals from Alpha Vantage
 */
export const fetchETFFundamentals = async (
  symbol: string,
  apiKey: string
): Promise<ETFFundamentals | null> => {
  const url = `${ALPHA_VANTAGE_BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as any;
    
    if (data['Error Message'] || !data.Symbol) {
      console.warn(`No fundamental data found for ${symbol}`);
      return null;
    }
    
    return {
      symbol: data.Symbol,
      name: data.Name || TARGET_ETFS[symbol]?.name || symbol,
      netAssets: parseFloat(data.TotalAssets) || 0,
      expenseRatio: parseFloat(data.ExpenseRatio) || 0,
      yieldPercent: parseFloat(data.DividendYield) || 0,
      assetClass: TARGET_ETFS[symbol]?.assetClass || 'Unknown'
    };
    
  } catch (error) {
    console.error(`Error fetching ETF fundamentals for ${symbol}:`, error);
    return null;
  }
};

/**
 * Fetch all target ETF data with rate limiting
 */
export const fetchAllETFData = async (apiKey: string): Promise<{
  historicalData: ETFDataPoint[];
  fundamentals: ETFFundamentals[];
}> => {
  const symbols = Object.keys(TARGET_ETFS);
  const historicalData: ETFDataPoint[] = [];
  const fundamentals: ETFFundamentals[] = [];
  
  console.log(`Fetching data for ${symbols.length} ETFs...`);
  
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    
    try {
      console.log(`Fetching ${symbol} (${i + 1}/${symbols.length})...`);
      
      // Fetch historical data
      const historical = await fetchETFHistoricalData(symbol, apiKey, 'compact'); // Use compact for faster initial testing
      historicalData.push(...historical);
      
      // Add delay to respect rate limits (free tier: 500 calls/day, ~25 calls/hour)
      if (i < symbols.length - 1) {
        console.log('Waiting 15 seconds to respect API rate limits...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
      
      // Fetch fundamentals
      const fundamental = await fetchETFFundamentals(symbol, apiKey);
      if (fundamental) {
        fundamentals.push(fundamental);
      }
      
      // Additional delay after fundamentals call
      if (i < symbols.length - 1) {
        console.log('Waiting 15 seconds to respect API rate limits...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
      
    } catch (error) {
      console.error(`Failed to fetch data for ${symbol}:`, error);
      // Continue with other symbols even if one fails
    }
  }
  
  console.log(`Fetched ${historicalData.length} historical data points and ${fundamentals.length} fundamental records`);
  
  return { historicalData, fundamentals };
};

/**
 * Convert ETF daily data to monthly averages for consistency with economic data
 */
export const convertETFDataToMonthly = (dailyData: ETFDataPoint[]): ETFDataPoint[] => {
  const monthlyData = new Map<string, ETFDataPoint[]>();
  
  // Group by year-month
  for (const point of dailyData) {
    const yearMonth = point.date.substring(0, 7); // YYYY-MM
    if (!monthlyData.has(yearMonth)) {
      monthlyData.set(yearMonth, []);
    }
    monthlyData.get(yearMonth)!.push(point);
  }
  
  // Calculate monthly averages
  const monthlyPoints: ETFDataPoint[] = [];
  
  for (const [yearMonth, points] of monthlyData.entries()) {
    if (points.length === 0) continue;
    
    // Use last trading day's close as the monthly close
    const lastPoint = points[points.length - 1];
    
    // Calculate monthly averages
    const avgOpen = points.reduce((sum, p) => sum + p.open, 0) / points.length;
    const avgHigh = Math.max(...points.map(p => p.high));
    const avgLow = Math.min(...points.map(p => p.low));
    const totalVolume = points.reduce((sum, p) => sum + p.volume, 0);
    
    monthlyPoints.push({
      symbol: lastPoint.symbol,
      name: lastPoint.name,
      date: yearMonth + '-01', // Standardize to first of month
      open: avgOpen,
      high: avgHigh,
      low: avgLow,
      close: lastPoint.close, // Use actual month-end close
      volume: totalVolume
    });
  }
  
  return monthlyPoints.sort((a, b) => a.date.localeCompare(b.date));
};