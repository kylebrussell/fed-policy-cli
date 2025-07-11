// /src/services/crossAssetAnalysis.ts

import { HistoricalAnalogue, EconomicDataPoint } from '../types';
import { CrossAssetDataPoint, getAllCrossAssetData, getAllETFData, getAllETFFundamentals } from './database';
import { ETFDataPoint, ETFFundamentals, TARGET_ETFS } from './etfDataService';
import { CROSS_ASSET_SERIES } from '../constants';

export interface AssetPerformance {
  symbol: string;
  name: string;
  assetClass: string;
  startPrice: number;
  endPrice: number;
  totalReturn: number; // Percentage
  annualizedReturn: number; // Percentage
  volatility: number; // Standard deviation of daily returns
  sharpeRatio: number; // Risk-adjusted return
  maxDrawdown: number; // Maximum peak-to-trough decline
}

export interface CrossAssetAnalogue extends HistoricalAnalogue {
  assetPerformance: AssetPerformance[];
  crossAssetData: {
    commodities: AssetPerformance[];
    currencies: AssetPerformance[];
    etfs: AssetPerformance[];
  };
}

export interface CrossAssetSummary {
  period: string;
  bestPerformers: AssetPerformance[];
  worstPerformers: AssetPerformance[];
  sectorRotation: {
    intoSectors: string[];
    outOfSectors: string[];
  };
  commodityTrends: {
    rising: string[];
    falling: string[];
  };
  currencyStrength: {
    dollarDirection: 'strengthening' | 'weakening' | 'neutral';
    magnitude: number;
  };
}

/**
 * Calculate asset performance metrics for a given time period
 */
export const calculateAssetPerformance = (
  data: any[], 
  startDate: string, 
  endDate: string, 
  symbol: string,
  name: string,
  assetClass: string,
  priceField: string = 'close'
): AssetPerformance | null => {
  // Filter data for the period
  const periodData = data.filter(d => d.date >= startDate && d.date <= endDate);
  
  if (periodData.length < 2) {
    return null;
  }
  
  // Sort by date
  periodData.sort((a, b) => a.date.localeCompare(b.date));
  
  const startPrice = periodData[0][priceField];
  const endPrice = periodData[periodData.length - 1][priceField];
  
  if (!startPrice || !endPrice || startPrice <= 0 || endPrice <= 0) {
    return null;
  }
  
  // Calculate total return
  const totalReturn = ((endPrice - startPrice) / startPrice) * 100;
  
  // Calculate time period in years
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  const yearsElapsed = (endTime - startTime) / (1000 * 60 * 60 * 24 * 365.25);
  
  // Calculate annualized return
  const annualizedReturn = yearsElapsed > 0 ? (Math.pow(endPrice / startPrice, 1 / yearsElapsed) - 1) * 100 : totalReturn;
  
  // Calculate daily returns for volatility and other metrics
  const dailyReturns: number[] = [];
  for (let i = 1; i < periodData.length; i++) {
    const prevPrice = periodData[i - 1][priceField];
    const currPrice = periodData[i][priceField];
    if (prevPrice > 0 && currPrice > 0) {
      dailyReturns.push((currPrice - prevPrice) / prevPrice);
    }
  }
  
  // Calculate volatility (standard deviation of daily returns, annualized)
  const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility
  
  // Calculate Sharpe ratio (assuming 0% risk-free rate for simplicity)
  const sharpeRatio = volatility > 0 ? annualizedReturn / volatility : 0;
  
  // Calculate maximum drawdown
  let maxDrawdown = 0;
  let peak = startPrice;
  
  for (const point of periodData) {
    const price = point[priceField];
    if (price > peak) {
      peak = price;
    }
    const drawdown = (peak - price) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  maxDrawdown *= 100; // Convert to percentage
  
  return {
    symbol,
    name,
    assetClass,
    startPrice,
    endPrice,
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
    volatility: parseFloat(volatility.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2))
  };
};

/**
 * Analyze cross-asset performance during historical analogues
 */
export const analyzeCrossAssetPerformance = async (
  analogues: HistoricalAnalogue[]
): Promise<CrossAssetAnalogue[]> => {
  // Load all cross-asset and ETF data
  const [crossAssetData, etfData, etfFundamentals] = await Promise.all([
    getAllCrossAssetData(),
    getAllETFData(),
    getAllETFFundamentals()
  ]);
  
  const crossAssetAnalogues: CrossAssetAnalogue[] = [];
  
  for (const analogue of analogues) {
    const startDate = analogue.startDate;
    const endDate = analogue.endDate;
    
    const assetPerformances: AssetPerformance[] = [];
    
    // Analyze FRED cross-asset series (commodities, currencies)
    for (const [seriesId, seriesInfo] of Object.entries(CROSS_ASSET_SERIES)) {
      const performance = calculateAssetPerformance(
        crossAssetData.map(d => ({ date: d.date, close: d[seriesId] })),
        startDate,
        endDate,
        seriesId,
        seriesInfo.name,
        getCrossAssetClass(seriesId),
        'close'
      );
      
      if (performance) {
        assetPerformances.push(performance);
      }
    }
    
    // Analyze ETF performance
    const etfPerformances: AssetPerformance[] = [];
    for (const [symbol, etfInfo] of Object.entries(TARGET_ETFS)) {
      const etfDataForSymbol = etfData.filter(d => d.symbol === symbol);
      const performance = calculateAssetPerformance(
        etfDataForSymbol,
        startDate,
        endDate,
        symbol,
        etfInfo.name,
        etfInfo.assetClass,
        'close'
      );
      
      if (performance) {
        etfPerformances.push(performance);
        assetPerformances.push(performance);
      }
    }
    
    // Categorize performance by asset class
    const commodities = assetPerformances.filter(p => p.assetClass === 'Commodities');
    const currencies = assetPerformances.filter(p => p.assetClass === 'Currency');
    const etfs = etfPerformances;
    
    crossAssetAnalogues.push({
      ...analogue,
      assetPerformance: assetPerformances,
      crossAssetData: {
        commodities,
        currencies,
        etfs
      }
    });
  }
  
  return crossAssetAnalogues;
};

/**
 * Get asset class for cross-asset FRED series
 */
const getCrossAssetClass = (seriesId: string): string => {
  if (seriesId.includes('OIL') || seriesId.includes('COMMODITY') || seriesId.includes('ENERGY') || 
      seriesId.includes('COPPER') || seriesId.includes('WHEAT') || seriesId.includes('ALUMINUM')) {
    return 'Commodities';
  }
  if (seriesId.includes('GOLD') || seriesId.includes('PCU') || seriesId.includes('WPU')) {
    return 'Precious Metals';
  }
  if (seriesId.includes('USD') || seriesId.includes('DTWEX') || seriesId.includes('RBUS')) {
    return 'Currency';
  }
  return 'Other';
};

/**
 * Generate cross-asset summary for a set of analogues
 */
export const generateCrossAssetSummary = (
  crossAssetAnalogues: CrossAssetAnalogue[]
): CrossAssetSummary => {
  if (crossAssetAnalogues.length === 0) {
    return {
      period: 'No data',
      bestPerformers: [],
      worstPerformers: [],
      sectorRotation: { intoSectors: [], outOfSectors: [] },
      commodityTrends: { rising: [], falling: [] },
      currencyStrength: { dollarDirection: 'neutral', magnitude: 0 }
    };
  }
  
  // Aggregate performance across all analogues
  const allPerformances = crossAssetAnalogues.flatMap(a => a.assetPerformance);
  
  // Sort by total return
  allPerformances.sort((a, b) => b.totalReturn - a.totalReturn);
  
  const bestPerformers = allPerformances.slice(0, 5);
  const worstPerformers = allPerformances.slice(-5).reverse();
  
  // Analyze sector rotation (ETFs only)
  const etfPerformances = allPerformances.filter(p => p.symbol.length <= 4); // ETF symbols are typically 3-4 characters
  const etfAvgReturn = etfPerformances.reduce((sum, p) => sum + p.totalReturn, 0) / etfPerformances.length;
  
  const intoSectors = etfPerformances.filter(p => p.totalReturn > etfAvgReturn).map(p => p.assetClass);
  const outOfSectors = etfPerformances.filter(p => p.totalReturn < etfAvgReturn).map(p => p.assetClass);
  
  // Analyze commodity trends
  const commodityPerformances = allPerformances.filter(p => p.assetClass === 'Commodities');
  const commodityAvgReturn = commodityPerformances.reduce((sum, p) => sum + p.totalReturn, 0) / commodityPerformances.length;
  
  const rising = commodityPerformances.filter(p => p.totalReturn > commodityAvgReturn).map(p => p.name);
  const falling = commodityPerformances.filter(p => p.totalReturn < commodityAvgReturn).map(p => p.name);
  
  // Analyze USD strength
  const usdPerformances = allPerformances.filter(p => p.assetClass === 'Currency');
  const avgUsdReturn = usdPerformances.reduce((sum, p) => sum + p.totalReturn, 0) / usdPerformances.length;
  
  let dollarDirection: 'strengthening' | 'weakening' | 'neutral' = 'neutral';
  if (avgUsdReturn > 2) dollarDirection = 'strengthening';
  else if (avgUsdReturn < -2) dollarDirection = 'weakening';
  
  const startDate = crossAssetAnalogues[0]?.startDate || '';
  const endDate = crossAssetAnalogues[0]?.endDate || '';
  
  return {
    period: `${startDate} to ${endDate}`,
    bestPerformers,
    worstPerformers,
    sectorRotation: {
      intoSectors: [...new Set(intoSectors)],
      outOfSectors: [...new Set(outOfSectors)]
    },
    commodityTrends: {
      rising: [...new Set(rising)],
      falling: [...new Set(falling)]
    },
    currencyStrength: {
      dollarDirection,
      magnitude: Math.abs(avgUsdReturn)
    }
  };
};

/**
 * Generate cross-asset trading signals based on historical analogues
 */
export interface CrossAssetTradingSignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  asset: string;
  assetClass: string;
  confidence: number; // 0-100
  reasoning: string;
  expectedReturn: number; // Percentage
  timeframe: string;
}

export const generateCrossAssetTradingSignals = (
  crossAssetAnalogues: CrossAssetAnalogue[]
): CrossAssetTradingSignal[] => {
  if (crossAssetAnalogues.length === 0) return [];
  
  const signals: CrossAssetTradingSignal[] = [];
  
  // Aggregate performance data across analogues
  const assetAggregates = new Map<string, { totalReturns: number[]; sharpeRatios: number[]; name: string; assetClass: string; }>();
  
  for (const analogue of crossAssetAnalogues) {
    for (const performance of analogue.assetPerformance) {
      if (!assetAggregates.has(performance.symbol)) {
        assetAggregates.set(performance.symbol, {
          totalReturns: [],
          sharpeRatios: [],
          name: performance.name,
          assetClass: performance.assetClass
        });
      }
      
      const aggregate = assetAggregates.get(performance.symbol)!;
      aggregate.totalReturns.push(performance.totalReturn);
      aggregate.sharpeRatios.push(performance.sharpeRatio);
    }
  }
  
  // Generate signals based on historical performance patterns
  for (const [symbol, data] of assetAggregates.entries()) {
    const avgReturn = data.totalReturns.reduce((sum, r) => sum + r, 0) / data.totalReturns.length;
    const avgSharpe = data.sharpeRatios.reduce((sum, r) => sum + r, 0) / data.sharpeRatios.length;
    
    // Calculate consistency (lower standard deviation = higher consistency)
    const returnStdDev = Math.sqrt(
      data.totalReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / data.totalReturns.length
    );
    
    const consistency = Math.max(0, 100 - returnStdDev); // Convert to 0-100 scale
    
    // Generate signal based on performance and consistency
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let reasoning = 'Neutral performance in historical analogues';
    
    if (avgReturn > 5 && avgSharpe > 0.5) {
      signalType = 'BUY';
      confidence = Math.min(95, 60 + consistency * 0.35);
      reasoning = `Strong historical performance: ${avgReturn.toFixed(1)}% avg return, Sharpe ratio ${avgSharpe.toFixed(2)}`;
    } else if (avgReturn < -5 && avgSharpe < -0.2) {
      signalType = 'SELL';
      confidence = Math.min(95, 60 + consistency * 0.35);
      reasoning = `Poor historical performance: ${avgReturn.toFixed(1)}% avg return, negative risk-adjusted returns`;
    } else if (Math.abs(avgReturn) > 10) {
      signalType = avgReturn > 0 ? 'BUY' : 'SELL';
      confidence = Math.min(85, 50 + Math.abs(avgReturn) * 2);
      reasoning = `Significant directional bias: ${avgReturn.toFixed(1)}% average return in similar periods`;
    }
    
    signals.push({
      type: signalType,
      asset: symbol,
      assetClass: data.assetClass,
      confidence: Math.round(confidence),
      reasoning,
      expectedReturn: Math.round(avgReturn * 100) / 100,
      timeframe: `${crossAssetAnalogues[0].windowMonths} months (based on ${data.totalReturns.length} historical periods)`
    });
  }
  
  // Sort by confidence and expected return
  signals.sort((a, b) => {
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    return Math.abs(b.expectedReturn) - Math.abs(a.expectedReturn);
  });
  
  return signals.slice(0, 10); // Return top 10 signals
};