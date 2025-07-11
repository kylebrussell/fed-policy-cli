// /src/services/positionSizing.ts

import { PositionSizing, TradingRecommendation, BacktestResult } from '../types/index.js';

export interface PortfolioConfig {
  totalCapital: number;
  maxSinglePosition: number; // 0-100%
  maxSectorExposure: number; // 0-100%
  riskTarget: number; // Annual volatility target %
  maxDrawdownLimit: number; // 0-100%
}

export interface AssetMetrics {
  asset: string;
  expectedReturn: number; // Annual %
  volatility: number; // Annual %
  sharpeRatio: number;
  maxDrawdown: number;
  correlation?: { [asset: string]: number };
  liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class PositionSizingService {
  private portfolioConfig: PortfolioConfig;
  
  constructor(config: PortfolioConfig) {
    this.portfolioConfig = config;
  }

  /**
   * Calculate position size using Kelly Criterion
   * Kelly% = (bp - q) / b
   * where b = odds received on the wager, p = probability of winning, q = probability of losing
   */
  calculateKellySize(
    winRate: number, // 0-1
    avgWin: number, // %
    avgLoss: number, // %
    maxKelly: number = 0.25 // Cap Kelly at 25% for safety
  ): number {
    if (avgLoss >= 0) return 0; // avgLoss should be negative
    
    const p = winRate;
    const q = 1 - winRate;
    const b = Math.abs(avgWin / avgLoss); // Win/loss ratio
    
    const kellyFraction = (b * p - q) / b;
    
    // Apply safety constraints
    return Math.max(0, Math.min(kellyFraction, maxKelly));
  }

  /**
   * Calculate volatility-adjusted position size
   * Target 1% portfolio risk per trade
   */
  calculateVolatilityAdjustedSize(
    assetVolatility: number, // Annual volatility %
    stopLossDistance: number, // % from entry
    riskPerTrade: number = 0.01 // 1% portfolio risk
  ): number {
    // Convert annual volatility to expected move over trade timeframe
    // Assuming average trade duration of 3 months
    const tradeTimeframe = 0.25; // 3 months as fraction of year
    const expectedMove = assetVolatility * Math.sqrt(tradeTimeframe);
    
    // If stop loss is tighter than expected move, use stop loss
    // If stop loss is wider, adjust for higher risk
    const actualRisk = Math.max(stopLossDistance, expectedMove * 0.5);
    
    return riskPerTrade / (actualRisk / 100);
  }

  /**
   * Calculate risk parity position size
   * Equal risk contribution from each position
   */
  calculateRiskParitySize(
    assetVolatility: number,
    portfolioVolatilities: number[],
    targetRiskContribution: number = 0.2 // 20% if 5 positions
  ): number {
    const avgPortfolioVol = portfolioVolatilities.reduce((sum, vol) => sum + vol, 0) / portfolioVolatilities.length;
    
    // Inverse volatility weighting with target risk contribution
    return (targetRiskContribution * avgPortfolioVol) / assetVolatility;
  }

  /**
   * Apply correlation adjustments to position sizes
   */
  applyCorrelationAdjustment(
    baseSize: number,
    correlations: { [asset: string]: number },
    existingPositions: { asset: string; weight: number }[]
  ): number {
    let correlationPenalty = 0;
    
    for (const position of existingPositions) {
      const correlation = correlations[position.asset] || 0;
      // Higher correlation = higher penalty
      correlationPenalty += Math.abs(correlation) * position.weight;
    }
    
    // Reduce position size by correlation penalty
    const adjustmentFactor = Math.max(0.5, 1 - correlationPenalty);
    return baseSize * adjustmentFactor;
  }

  /**
   * Generate comprehensive position sizing recommendation
   */
  generatePositionSizing(
    recommendation: Partial<TradingRecommendation>,
    assetMetrics: AssetMetrics,
    backtestData?: BacktestResult,
    existingPositions: { asset: string; weight: number; assetClass: string }[] = []
  ): PositionSizing {
    const asset = recommendation.asset!;
    const confidence = recommendation.confidence || 50;
    
    // Calculate base sizes using different methodologies
    let kellySize = 0;
    let volatilitySize = 0;
    let riskParitySize = 0;
    
    // Kelly Criterion (if backtest data available)
    if (backtestData) {
      kellySize = this.calculateKellySize(
        backtestData.winRate / 100,
        backtestData.totalReturn > 0 ? backtestData.totalReturn : 10, // Default 10% avg win
        backtestData.totalReturn < 0 ? backtestData.totalReturn : -5   // Default -5% avg loss
      );
    }
    
    // Volatility-adjusted sizing
    const stopLossDistance = recommendation.recommendation?.stopLoss 
      ? Math.abs((recommendation.recommendation.stopLoss - (recommendation.recommendation.entryPrice || 100)) / (recommendation.recommendation.entryPrice || 100) * 100)
      : assetMetrics.volatility * 0.5; // Default to half of annual volatility
    
    volatilitySize = this.calculateVolatilityAdjustedSize(
      assetMetrics.volatility,
      stopLossDistance
    );
    
    // Risk parity sizing
    const portfolioVolatilities = existingPositions.map(pos => 15); // Default 15% volatility
    riskParitySize = this.calculateRiskParitySize(
      assetMetrics.volatility,
      portfolioVolatilities,
      1 / Math.max(5, existingPositions.length + 1) // Equal weight among positions
    );
    
    // Choose methodology based on available data and confidence
    let baseSize: number;
    let methodology: PositionSizing['methodology'];
    
    if (backtestData && confidence > 70) {
      baseSize = kellySize;
      methodology = 'KELLY_CRITERION';
    } else if (assetMetrics.volatility > 0) {
      baseSize = volatilitySize;
      methodology = 'VOLATILITY_ADJUSTED';
    } else {
      baseSize = riskParitySize;
      methodology = 'RISK_PARITY';
    }
    
    // Apply confidence adjustment
    const confidenceAdjustment = Math.pow(confidence / 100, 2); // Square for conservative scaling
    baseSize *= confidenceAdjustment;
    
    // Apply correlation adjustment if correlations available
    if (assetMetrics.correlation && existingPositions.length > 0) {
      baseSize = this.applyCorrelationAdjustment(
        baseSize,
        assetMetrics.correlation,
        existingPositions
      );
    }
    
    // Apply portfolio-level constraints
    const maxPosition = Math.min(
      this.portfolioConfig.maxSinglePosition / 100,
      baseSize
    );
    
    // Check sector concentration
    const sameClassPositions = existingPositions.filter(pos => 
      pos.assetClass === recommendation.assetClass
    );
    const currentSectorExposure = sameClassPositions.reduce((sum, pos) => sum + pos.weight, 0);
    const availableSectorCapacity = (this.portfolioConfig.maxSectorExposure / 100) - currentSectorExposure;
    
    const finalSize = Math.min(maxPosition, availableSectorCapacity, 0.25); // Never exceed 25%
    
    return {
      portfolioWeight: Math.max(0.01, finalSize * 100), // Minimum 1%
      maxPosition: this.portfolioConfig.totalCapital * finalSize,
      riskBudget: finalSize * assetMetrics.volatility,
      methodology,
      volatilityAdjustment: assetMetrics.volatility,
      correlationAdjustment: assetMetrics.correlation ? Object.keys(assetMetrics.correlation).length : 0,
      riskLimits: {
        maxSinglePosition: this.portfolioConfig.maxSinglePosition,
        maxSectorExposure: this.portfolioConfig.maxSectorExposure,
        maxDrawdownLimit: this.portfolioConfig.maxDrawdownLimit
      }
    };
  }

  /**
   * Calculate portfolio-level risk metrics
   */
  calculatePortfolioRisk(
    positions: Array<{
      asset: string;
      weight: number;
      volatility: number;
      expectedReturn: number;
    }>,
    correlationMatrix: { [key: string]: { [key: string]: number } }
  ): {
    portfolioVolatility: number;
    portfolioReturn: number;
    sharpeRatio: number;
    concentrationRisk: number;
    diversificationRatio: number;
  } {
    const weights = positions.map(p => p.weight / 100);
    const returns = positions.map(p => p.expectedReturn);
    const volatilities = positions.map(p => p.volatility);
    
    // Portfolio expected return
    const portfolioReturn = weights.reduce((sum, weight, i) => sum + weight * returns[i], 0);
    
    // Portfolio variance calculation
    let portfolioVariance = 0;
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        const correlation = i === j ? 1 : (correlationMatrix[positions[i].asset]?.[positions[j].asset] || 0);
        portfolioVariance += weights[i] * weights[j] * volatilities[i] * volatilities[j] * correlation;
      }
    }
    
    const portfolioVolatility = Math.sqrt(portfolioVariance);
    
    // Risk-free rate assumption (current 3-month Treasury)
    const riskFreeRate = 4.5; // 4.5% based on current rates
    const sharpeRatio = (portfolioReturn - riskFreeRate) / portfolioVolatility;
    
    // Concentration risk (Herfindahl index)
    const concentrationRisk = weights.reduce((sum, weight) => sum + weight * weight, 0);
    
    // Diversification ratio
    const weightedAvgVol = weights.reduce((sum, weight, i) => sum + weight * volatilities[i], 0);
    const diversificationRatio = weightedAvgVol / portfolioVolatility;
    
    return {
      portfolioVolatility,
      portfolioReturn,
      sharpeRatio,
      concentrationRisk,
      diversificationRatio
    };
  }

  /**
   * Generate risk warnings and recommendations
   */
  generateRiskWarnings(
    positions: Array<{ asset: string; weight: number; assetClass: string }>
  ): string[] {
    const warnings: string[] = [];
    
    // Single position concentration
    const largestPosition = Math.max(...positions.map(p => p.weight));
    if (largestPosition > this.portfolioConfig.maxSinglePosition) {
      warnings.push(`Largest position (${largestPosition.toFixed(1)}%) exceeds limit (${this.portfolioConfig.maxSinglePosition}%)`);
    }
    
    // Sector concentration
    const sectorExposure: { [key: string]: number } = {};
    positions.forEach(pos => {
      sectorExposure[pos.assetClass] = (sectorExposure[pos.assetClass] || 0) + pos.weight;
    });
    
    Object.entries(sectorExposure).forEach(([sector, exposure]) => {
      if (exposure > this.portfolioConfig.maxSectorExposure) {
        warnings.push(`${sector} exposure (${exposure.toFixed(1)}%) exceeds limit (${this.portfolioConfig.maxSectorExposure}%)`);
      }
    });
    
    // Diversification warning
    if (positions.length < 3) {
      warnings.push('Portfolio may lack diversification with fewer than 3 positions');
    }
    
    return warnings;
  }
}

// Default institutional-grade portfolio configuration
export const DEFAULT_PORTFOLIO_CONFIG: PortfolioConfig = {
  totalCapital: 10_000_000, // $10M portfolio
  maxSinglePosition: 15, // 15% max per position
  maxSectorExposure: 40, // 40% max per asset class
  riskTarget: 12, // 12% annual volatility target
  maxDrawdownLimit: 20 // 20% max drawdown
};