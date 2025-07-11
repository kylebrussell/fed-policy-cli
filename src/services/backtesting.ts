// /src/services/backtesting.ts

import { BacktestResult, TradeResult, TradingRecommendation, EconomicDataPoint } from '../types/index.js';

export interface BacktestConfig {
  startDate: string;
  endDate: string;
  initialCapital: number;
  benchmarkAsset?: string; // e.g., 'SPY' for S&P 500 comparison
  rebalanceFrequency: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  transactionCost: number; // Basis points
  slippage: number; // Basis points
}

export interface HistoricalPriceData {
  [asset: string]: Array<{
    date: string;
    price: number;
    volume?: number;
  }>;
}

export interface SignalHistory {
  date: string;
  signals: Array<{
    asset: string;
    action: 'BUY' | 'SELL' | 'HOLD' | 'SHORT';
    confidence: number;
    reasoning: string;
    expectedReturn: number;
  }>;
}

export class BacktestingService {
  private economicData: EconomicDataPoint[];
  private priceData: HistoricalPriceData;

  constructor(economicData: EconomicDataPoint[], priceData: HistoricalPriceData) {
    this.economicData = economicData;
    this.priceData = priceData;
  }

  /**
   * Run comprehensive backtest of trading strategy
   */
  runBacktest(
    signalHistory: SignalHistory[],
    config: BacktestConfig
  ): BacktestResult {
    const trades: TradeResult[] = [];
    let currentCapital = config.initialCapital;
    let positions: { [asset: string]: { shares: number; entryPrice: number; entryDate: string } } = {};
    
    // Track daily portfolio values for performance calculation
    const portfolioValues: Array<{ date: string; value: number }> = [];
    
    for (const signalEvent of signalHistory) {
      const eventDate = signalEvent.date;
      
      // Process each signal
      for (const signal of signalEvent.signals) {
        const trade = this.processSignal(
          signal,
          eventDate,
          positions,
          currentCapital,
          config
        );
        
        if (trade) {
          trades.push(trade);
          currentCapital = this.updateCapital(currentCapital, trade, config);
          
          // Update positions
          if (signal.action === 'BUY') {
            positions[signal.asset] = {
              shares: this.calculateShares(currentCapital, signal, trade.entryPrice),
              entryPrice: trade.entryPrice,
              entryDate: eventDate
            };
          } else if (signal.action === 'SELL' && positions[signal.asset]) {
            delete positions[signal.asset];
          }
        }
      }
      
      // Calculate portfolio value at this date
      const portfolioValue = this.calculatePortfolioValue(
        currentCapital,
        positions,
        eventDate
      );
      
      portfolioValues.push({ date: eventDate, value: portfolioValue });
    }
    
    // Calculate performance metrics
    const finalValue = portfolioValues[portfolioValues.length - 1]?.value || config.initialCapital;
    const totalReturn = ((finalValue - config.initialCapital) / config.initialCapital) * 100;
    
    const period = this.calculatePeriodYears(config.startDate, config.endDate);
    const annualizedReturn = Math.pow(finalValue / config.initialCapital, 1/period) - 1;
    
    const returns = this.calculateDailyReturns(portfolioValues);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const maxDrawdown = this.calculateMaxDrawdown(portfolioValues);
    
    const winningTrades = trades.filter(t => t.return > 0);
    const winRate = (winningTrades.length / trades.length) * 100;
    
    const profitFactor = this.calculateProfitFactor(trades);
    
    // Benchmark comparison if specified
    let benchmarkComparison;
    if (config.benchmarkAsset) {
      benchmarkComparison = this.calculateBenchmarkComparison(
        portfolioValues,
        config.benchmarkAsset,
        config.startDate,
        config.endDate
      );
    }

    return {
      strategy: 'Fed Policy Trading Strategy',
      period: { start: config.startDate, end: config.endDate },
      totalReturn,
      annualizedReturn: annualizedReturn * 100,
      sharpeRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      trades,
      benchmarkComparison
    };
  }

  /**
   * Process individual trading signal
   */
  private processSignal(
    signal: any,
    date: string,
    positions: any,
    capital: number,
    config: BacktestConfig
  ): TradeResult | null {
    const priceHistory = this.priceData[signal.asset];
    if (!priceHistory) return null;

    const pricePoint = priceHistory.find(p => p.date >= date);
    if (!pricePoint) return null;

    const entryPrice = this.applySlippage(pricePoint.price, signal.action, config.slippage);
    
    // For new positions
    if (signal.action === 'BUY' && !positions[signal.asset]) {
      // Calculate exit based on historical data (simulate holding period)
      const exitResult = this.simulateExit(signal.asset, date, entryPrice, signal.expectedReturn);
      
      if (exitResult) {
        return {
          entryDate: date,
          exitDate: exitResult.exitDate,
          asset: signal.asset,
          action: signal.action,
          entryPrice,
          exitPrice: exitResult.exitPrice,
          return: exitResult.return,
          duration: exitResult.duration,
          fedEventContext: this.getFedEventContext(date)
        };
      }
    }
    
    // For closing positions
    if (signal.action === 'SELL' && positions[signal.asset]) {
      const position = positions[signal.asset];
      const exitPrice = this.applySlippage(pricePoint.price, signal.action, config.slippage);
      const returnPct = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
      const duration = this.calculateDuration(position.entryDate, date);
      
      return {
        entryDate: position.entryDate,
        exitDate: date,
        asset: signal.asset,
        action: 'SELL',
        entryPrice: position.entryPrice,
        exitPrice,
        return: returnPct,
        duration,
        fedEventContext: this.getFedEventContext(date)
      };
    }

    return null;
  }

  /**
   * Simulate exit strategy based on expected return and market conditions
   */
  private simulateExit(
    asset: string,
    entryDate: string,
    entryPrice: number,
    expectedReturn: number
  ): { exitDate: string; exitPrice: number; return: number; duration: number } | null {
    const priceHistory = this.priceData[asset];
    if (!priceHistory) return null;

    const entryIndex = priceHistory.findIndex(p => p.date >= entryDate);
    if (entryIndex === -1) return null;

    // Look for exit conditions over next 6 months
    const maxHoldingPeriod = 126; // ~6 months of trading days
    const targetPrice = entryPrice * (1 + expectedReturn / 100);
    const stopLossPrice = entryPrice * 0.9; // 10% stop loss

    for (let i = entryIndex + 1; i < Math.min(entryIndex + maxHoldingPeriod, priceHistory.length); i++) {
      const currentPrice = priceHistory[i].price;
      
      // Check stop loss
      if (currentPrice <= stopLossPrice) {
        return {
          exitDate: priceHistory[i].date,
          exitPrice: currentPrice,
          return: ((currentPrice - entryPrice) / entryPrice) * 100,
          duration: i - entryIndex
        };
      }
      
      // Check profit target
      if (currentPrice >= targetPrice) {
        return {
          exitDate: priceHistory[i].date,
          exitPrice: currentPrice,
          return: ((currentPrice - entryPrice) / entryPrice) * 100,
          duration: i - entryIndex
        };
      }
    }

    // Exit at end of holding period if no targets hit
    const endIndex = Math.min(entryIndex + maxHoldingPeriod, priceHistory.length - 1);
    const finalPrice = priceHistory[endIndex].price;
    
    return {
      exitDate: priceHistory[endIndex].date,
      exitPrice: finalPrice,
      return: ((finalPrice - entryPrice) / entryPrice) * 100,
      duration: endIndex - entryIndex
    };
  }

  /**
   * Apply slippage to execution price
   */
  private applySlippage(price: number, action: string, slippageBps: number): number {
    const slippageMultiplier = slippageBps / 10000;
    
    if (action === 'BUY') {
      return price * (1 + slippageMultiplier); // Pay higher for buys
    } else {
      return price * (1 - slippageMultiplier); // Receive lower for sells
    }
  }

  /**
   * Calculate number of shares for position
   */
  private calculateShares(capital: number, signal: any, price: number): number {
    // Simple equal weight allocation (modify based on actual position sizing)
    const positionSize = capital * 0.1; // 10% position size
    return Math.floor(positionSize / price);
  }

  /**
   * Update capital after trade execution
   */
  private updateCapital(capital: number, trade: TradeResult, config: BacktestConfig): number {
    const tradeValue = Math.abs(trade.entryPrice);
    const transactionCost = tradeValue * (config.transactionCost / 10000);
    
    // Simplified: assume capital changes with P&L
    const profitLoss = (trade.return / 100) * tradeValue;
    
    return capital + profitLoss - transactionCost;
  }

  /**
   * Calculate current portfolio value
   */
  private calculatePortfolioValue(
    cash: number,
    positions: any,
    date: string
  ): number {
    let positionsValue = 0;
    
    for (const [asset, position] of Object.entries(positions)) {
      const priceHistory = this.priceData[asset];
      if (priceHistory) {
        const currentPrice = priceHistory.find(p => p.date >= date)?.price;
        if (currentPrice) {
          positionsValue += (position as any).shares * currentPrice;
        }
      }
    }
    
    return cash + positionsValue;
  }

  /**
   * Calculate daily returns from portfolio values
   */
  private calculateDailyReturns(portfolioValues: Array<{ date: string; value: number }>): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < portfolioValues.length; i++) {
      const todayValue = portfolioValues[i].value;
      const yesterdayValue = portfolioValues[i - 1].value;
      const dailyReturn = (todayValue - yesterdayValue) / yesterdayValue;
      returns.push(dailyReturn);
    }
    
    return returns;
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Annualize (assuming daily returns)
    const annualizedReturn = avgReturn * 252;
    const annualizedVolatility = volatility * Math.sqrt(252);
    
    // Risk-free rate assumption (4.5% current rate)
    const riskFreeRate = 0.045;
    
    return annualizedVolatility === 0 ? 0 : (annualizedReturn - riskFreeRate) / annualizedVolatility;
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(portfolioValues: Array<{ date: string; value: number }>): number {
    let maxDrawdown = 0;
    let peak = portfolioValues[0]?.value || 0;
    
    for (const point of portfolioValues) {
      if (point.value > peak) {
        peak = point.value;
      }
      
      const drawdown = (peak - point.value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown * 100;
  }

  /**
   * Calculate profit factor (gross profit / gross loss)
   */
  private calculateProfitFactor(trades: TradeResult[]): number {
    const grossProfit = trades.filter(t => t.return > 0).reduce((sum, t) => sum + t.return, 0);
    const grossLoss = Math.abs(trades.filter(t => t.return < 0).reduce((sum, t) => sum + t.return, 0));
    
    return grossLoss === 0 ? (grossProfit > 0 ? Infinity : 1) : grossProfit / grossLoss;
  }

  /**
   * Calculate benchmark comparison metrics
   */
  private calculateBenchmarkComparison(
    portfolioValues: Array<{ date: string; value: number }>,
    benchmarkAsset: string,
    startDate: string,
    endDate: string
  ): BacktestResult['benchmarkComparison'] {
    const benchmarkData = this.priceData[benchmarkAsset];
    if (!benchmarkData) return undefined;

    const startPrice = benchmarkData.find(p => p.date >= startDate)?.price;
    const endPrice = benchmarkData.find(p => p.date >= endDate)?.price;
    
    if (!startPrice || !endPrice) return undefined;

    const benchmarkReturn = ((endPrice - startPrice) / startPrice) * 100;
    const portfolioReturn = ((portfolioValues[portfolioValues.length - 1].value - portfolioValues[0].value) / portfolioValues[0].value) * 100;
    
    const alpha = portfolioReturn - benchmarkReturn;
    
    // Simplified beta calculation (would need more sophisticated regression in practice)
    const beta = 1.2; // Placeholder
    
    // Information ratio (alpha / tracking error)
    const informationRatio = alpha / 5; // Assuming 5% tracking error
    
    return {
      benchmark: benchmarkAsset,
      alpha,
      beta,
      informationRatio
    };
  }

  /**
   * Get Fed event context for a specific date
   */
  private getFedEventContext(date: string): string | undefined {
    const fedEvent = this.economicData.find(point => {
      const pointDate = new Date(point.date);
      const targetDate = new Date(date);
      const daysDiff = Math.abs((targetDate.getTime() - pointDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7; // Within a week of economic data point
    });
    
    if (fedEvent && fedEvent.DFF) {
      return `Fed Funds Rate: ${(fedEvent.DFF as number).toFixed(2)}%`;
    }
    
    return undefined;
  }

  /**
   * Calculate duration between dates in trading days
   */
  private calculateDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate period in years
   */
  private calculatePeriodYears(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return diffTime / (1000 * 60 * 60 * 24 * 365.25);
  }

  /**
   * Generate trading signals from historical economic conditions
   */
  generateHistoricalSignals(
    startDate: string,
    endDate: string,
    signalRules: Array<{
      condition: (data: EconomicDataPoint) => boolean;
      signal: {
        asset: string;
        action: 'BUY' | 'SELL' | 'HOLD';
        expectedReturn: number;
        confidence: number;
      };
    }>
  ): SignalHistory[] {
    const signals: SignalHistory[] = [];
    
    const relevantData = this.economicData.filter(point => 
      point.date >= startDate && point.date <= endDate
    );
    
    for (const dataPoint of relevantData) {
      const daySignals: SignalHistory['signals'] = [];
      
      for (const rule of signalRules) {
        if (rule.condition(dataPoint)) {
          daySignals.push({
            ...rule.signal,
            reasoning: `Economic condition triggered at ${dataPoint.date}`
          });
        }
      }
      
      if (daySignals.length > 0) {
        signals.push({
          date: dataPoint.date,
          signals: daySignals
        });
      }
    }
    
    return signals;
  }

  /**
   * Analyze strategy performance by Fed regime
   */
  analyzeByFedRegime(backtest: BacktestResult): {
    easing: { trades: TradeResult[]; avgReturn: number; winRate: number };
    tightening: { trades: TradeResult[]; avgReturn: number; winRate: number };
    hold: { trades: TradeResult[]; avgReturn: number; winRate: number };
  } {
    const regimeAnalysis = {
      easing: { trades: [] as TradeResult[], avgReturn: 0, winRate: 0 },
      tightening: { trades: [] as TradeResult[], avgReturn: 0, winRate: 0 },
      hold: { trades: [] as TradeResult[], avgReturn: 0, winRate: 0 }
    };
    
    for (const trade of backtest.trades) {
      const regime = this.identifyFedRegime(trade.entryDate);
      if (regime) {
        regimeAnalysis[regime].trades.push(trade);
      }
    }
    
    // Calculate metrics for each regime
    for (const [regime, data] of Object.entries(regimeAnalysis)) {
      if (data.trades.length > 0) {
        data.avgReturn = data.trades.reduce((sum, t) => sum + t.return, 0) / data.trades.length;
        data.winRate = (data.trades.filter(t => t.return > 0).length / data.trades.length) * 100;
      }
    }
    
    return regimeAnalysis;
  }

  /**
   * Identify Fed regime for a given date
   */
  private identifyFedRegime(date: string): 'easing' | 'tightening' | 'hold' | null {
    // Look at Fed Funds Rate trend around this date
    const targetDate = new Date(date);
    const relevantData = this.economicData.filter(point => {
      const pointDate = new Date(point.date);
      const daysDiff = Math.abs((targetDate.getTime() - pointDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 90; // Within 3 months
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (relevantData.length < 2) return null;
    
    const earlierRate = relevantData[0].DFF as number;
    const laterRate = relevantData[relevantData.length - 1].DFF as number;
    
    if (laterRate > earlierRate + 0.25) return 'tightening';
    if (laterRate < earlierRate - 0.25) return 'easing';
    return 'hold';
  }
}