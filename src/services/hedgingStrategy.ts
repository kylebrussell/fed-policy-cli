// /src/services/hedgingStrategy.ts

import { HedgingRecommendation, PolicyScenario, TradingRecommendation } from '../types/index.js';

export interface HedgeParameters {
  primaryPosition: {
    asset: string;
    assetClass: string;
    direction: 'LONG' | 'SHORT';
    size: number; // Position size in dollars
    duration: string; // Expected holding period
  };
  fedScenarios: PolicyScenario[];
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  hedgeBudget: number; // Maximum cost as % of position
}

export interface MarketCorrelations {
  // Asset correlations during different Fed regimes
  easing: { [asset: string]: { [asset: string]: number } };
  tightening: { [asset: string]: { [asset: string]: number } };
  pivot: { [asset: string]: { [asset: string]: number } };
  shock: { [asset: string]: { [asset: string]: number } };
}

export class HedgingService {
  private correlations: MarketCorrelations;
  
  constructor() {
    this.correlations = this.getHistoricalCorrelations();
  }

  /**
   * Generate comprehensive hedging recommendations for a primary position
   */
  generateHedgingStrategy(params: HedgeParameters): HedgingRecommendation[] {
    const hedges: HedgingRecommendation[] = [];
    
    // Duration hedges for bond/rate exposure
    hedges.push(...this.generateDurationHedges(params));
    
    // Curve hedges for yield curve positioning
    hedges.push(...this.generateCurveHedges(params));
    
    // Volatility hedges for option-based protection
    hedges.push(...this.generateVolatilityHedges(params));
    
    // Cross-asset hedges for systematic risks
    hedges.push(...this.generateCrossAssetHedges(params));
    
    // Filter and rank hedges by cost-effectiveness
    return this.rankHedgesByEffectiveness(hedges, params);
  }

  /**
   * Generate duration-based hedges for interest rate exposure
   */
  private generateDurationHedges(params: HedgeParameters): HedgingRecommendation[] {
    const hedges: HedgingRecommendation[] = [];
    const position = params.primaryPosition;
    
    // Long bond positions in rate hiking scenarios
    if (this.isRateSensitive(position.asset) && position.direction === 'LONG') {
      hedges.push({
        hedgeType: 'DURATION_HEDGE',
        instrument: 'TLT Put Options',
        hedgeRatio: this.calculateOptimalHedgeRatio(position.asset, 'TLT', 'tightening'),
        description: 'Put options on 20+ year Treasury ETF to hedge duration risk',
        scenario: 'Fed hiking cycle continues or accelerates',
        cost: this.estimateOptionCost('TLT', 'PUT', 0.9, '3M')
      });
      
      hedges.push({
        hedgeType: 'DURATION_HEDGE',
        instrument: 'Short 10Y Treasury Futures',
        hedgeRatio: this.calculateFuturesHedgeRatio(position.asset, 'ZN'),
        description: 'Short 10-year Treasury futures for direct duration hedge',
        scenario: 'Rising rate environment with Fed hawkishness',
        cost: 0.05 // Futures carry cost
      });
    }
    
    // Short bond positions in rate cutting scenarios
    if (this.isRateSensitive(position.asset) && position.direction === 'SHORT') {
      hedges.push({
        hedgeType: 'DURATION_HEDGE',
        instrument: 'TLT Call Options',
        hedgeRatio: this.calculateOptimalHedgeRatio(position.asset, 'TLT', 'easing'),
        description: 'Call options on long Treasury ETF to hedge duration risk',
        scenario: 'Fed pivots to cutting rates or economic downturn',
        cost: this.estimateOptionCost('TLT', 'CALL', 0.9, '3M')
      });
    }
    
    return hedges;
  }

  /**
   * Generate yield curve positioning hedges
   */
  private generateCurveHedges(params: HedgeParameters): HedgingRecommendation[] {
    const hedges: HedgingRecommendation[] = [];
    const position = params.primaryPosition;
    
    // Curve steepening/flattening trades
    if (this.isRateSensitive(position.asset)) {
      hedges.push({
        hedgeType: 'CURVE_HEDGE',
        instrument: '2s10s Steepener',
        hedgeRatio: 25, // 25% of position
        description: 'Long 10Y/Short 2Y spread trade for curve steepening',
        scenario: 'Fed cuts short rates while long rates remain elevated',
        cost: 0.10 // Transaction costs
      });
      
      hedges.push({
        hedgeType: 'CURVE_HEDGE',
        instrument: '5s30s Flattener',
        hedgeRatio: 20,
        description: 'Short 30Y/Long 5Y spread for curve flattening protection',
        scenario: 'Economic slowdown flattens long end of curve',
        cost: 0.08
      });
    }
    
    return hedges;
  }

  /**
   * Generate volatility-based hedges
   */
  private generateVolatilityHedges(params: HedgeParameters): HedgingRecommendation[] {
    const hedges: HedgingRecommendation[] = [];
    const position = params.primaryPosition;
    
    // VIX calls for equity protection
    if (position.assetClass === 'Equities') {
      hedges.push({
        hedgeType: 'VOLATILITY_HEDGE',
        instrument: 'VIX Call Options',
        hedgeRatio: this.calculateVolHedgeRatio(params.riskTolerance),
        description: 'VIX calls provide protection during equity volatility spikes',
        scenario: 'Fed policy surprise or economic shock increases market volatility',
        cost: this.estimateOptionCost('VIX', 'CALL', 1.1, '2M')
      });
    }
    
    // MOVE index for bond volatility
    if (this.isRateSensitive(position.asset)) {
      hedges.push({
        hedgeType: 'VOLATILITY_HEDGE',
        instrument: 'MOVE ETF Long Position',
        hedgeRatio: 15,
        description: 'Bond volatility exposure through MOVE index ETF',
        scenario: 'Fed policy uncertainty increases bond market volatility',
        cost: 0.15 // ETF expense ratio and tracking error
      });
    }
    
    return hedges;
  }

  /**
   * Generate cross-asset hedges for systematic risks
   */
  private generateCrossAssetHedges(params: HedgeParameters): HedgingRecommendation[] {
    const hedges: HedgingRecommendation[] = [];
    const position = params.primaryPosition;
    
    // Dollar hedges for international exposure
    if (this.hasInternationalExposure(position.asset)) {
      hedges.push({
        hedgeType: 'CROSS_ASSET_HEDGE',
        instrument: 'DXY Put Options',
        hedgeRatio: this.calculateCurrencyHedgeRatio(position.asset),
        description: 'Dollar puts hedge against Fed dovishness weakening USD',
        scenario: 'Fed cuts rates faster than other central banks',
        cost: this.estimateOptionCost('DXY', 'PUT', 0.95, '6M')
      });
    }
    
    // Gold hedge for monetary debasement
    if (position.assetClass === 'Bonds' || position.assetClass === 'Currencies') {
      hedges.push({
        hedgeType: 'CROSS_ASSET_HEDGE',
        instrument: 'GLD Long Position',
        hedgeRatio: 10,
        description: 'Gold position as monetary debasement hedge',
        scenario: 'Fed maintains accommodative policy leading to currency debasement',
        cost: 0.05 // Storage and management costs
      });
    }
    
    // Equity sector rotation hedges
    if (position.assetClass === 'Equities') {
      hedges.push({
        hedgeType: 'CROSS_ASSET_HEDGE',
        instrument: 'XLF/XLU Sector Rotation',
        hedgeRatio: 20,
        description: 'Rotate between rate-sensitive sectors based on Fed policy',
        scenario: 'Fed policy changes favor different equity sectors',
        cost: 0.12 // Sector ETF expenses and rebalancing
      });
    }
    
    return hedges;
  }

  /**
   * Rank hedges by cost-effectiveness and relevance
   */
  private rankHedgesByEffectiveness(
    hedges: HedgingRecommendation[], 
    params: HedgeParameters
  ): HedgingRecommendation[] {
    return hedges
      .map(hedge => ({
        ...hedge,
        effectiveness: this.calculateHedgeEffectiveness(hedge, params)
      }))
      .filter(hedge => hedge.cost <= params.hedgeBudget)
      .sort((a, b) => (b as any).effectiveness - (a as any).effectiveness)
      .slice(0, 5) // Return top 5 hedges
      .map(({ effectiveness, ...hedge }) => hedge); // Remove effectiveness score
  }

  /**
   * Calculate hedge effectiveness score (0-100)
   */
  private calculateHedgeEffectiveness(
    hedge: HedgingRecommendation,
    params: HedgeParameters
  ): number {
    let score = 50; // Base score
    
    // Cost efficiency (lower cost = higher score)
    score += (params.hedgeBudget - hedge.cost) / params.hedgeBudget * 20;
    
    // Relevance to primary position
    if (this.isRelevantHedge(hedge, params.primaryPosition)) {
      score += 15;
    }
    
    // Hedge ratio appropriateness
    if (hedge.hedgeRatio >= 10 && hedge.hedgeRatio <= 50) {
      score += 10; // Optimal hedge ratio range
    }
    
    // Risk tolerance alignment
    if (params.riskTolerance === 'CONSERVATIVE' && hedge.cost < 0.5) {
      score += 5;
    } else if (params.riskTolerance === 'AGGRESSIVE' && hedge.hedgeRatio > 30) {
      score += 5;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate optimal hedge ratio using correlation analysis
   */
  private calculateOptimalHedgeRatio(
    primaryAsset: string,
    hedgeAsset: string,
    scenario: keyof MarketCorrelations
  ): number {
    const correlation = this.correlations[scenario]?.[primaryAsset]?.[hedgeAsset] || 0;
    
    // Higher negative correlation = higher hedge ratio
    // Adjust for volatility differences (simplified)
    const baseRatio = Math.abs(correlation) * 100;
    
    // Cap hedge ratios at reasonable levels
    return Math.min(50, Math.max(5, baseRatio));
  }

  /**
   * Calculate futures hedge ratio based on DV01 matching
   */
  private calculateFuturesHedgeRatio(primaryAsset: string, futuresContract: string): number {
    // Simplified DV01 calculation for common assets
    const assetDV01: { [key: string]: number } = {
      'TLT': 17.5,  // 20+ year Treasury ETF
      'IEF': 7.2,   // 7-10 year Treasury ETF
      'SHY': 1.8,   // 1-3 year Treasury ETF
      'LQD': 8.5,   // Investment grade corporate bonds
      'HYG': 4.2    // High yield bonds
    };
    
    const futuresDV01: { [key: string]: number } = {
      'ZN': 6.9,    // 10-year Treasury futures
      'ZB': 13.8,   // 30-year Treasury futures
      'ZF': 4.6     // 5-year Treasury futures
    };
    
    const primaryDV01 = assetDV01[primaryAsset] || 8.0; // Default
    const hedgeDV01 = futuresDV01[futuresContract] || 7.0; // Default
    
    return Math.min(100, (primaryDV01 / hedgeDV01) * 100);
  }

  /**
   * Estimate option cost as percentage of underlying
   */
  private estimateOptionCost(
    underlying: string,
    optionType: 'CALL' | 'PUT',
    moneyness: number, // 0.9 = 10% OTM, 1.1 = 10% ITM
    timeToExpiry: string
  ): number {
    const baseVolatility: { [key: string]: number } = {
      'TLT': 15,    // Treasury volatility
      'SPY': 20,    // Equity volatility
      'VIX': 80,    // Volatility of volatility
      'DXY': 12,    // Dollar volatility
      'GLD': 18     // Gold volatility
    };
    
    const timeMultiplier: { [key: string]: number } = {
      '1M': 0.3,
      '2M': 0.5,
      '3M': 0.7,
      '6M': 1.0,
      '12M': 1.4
    };
    
    const vol = baseVolatility[underlying] || 20;
    const time = timeMultiplier[timeToExpiry] || 0.7;
    const moneynessPenalty = Math.abs(1 - moneyness) * 0.5;
    
    // Simplified Black-Scholes approximation for option cost
    return (vol / 100) * Math.sqrt(time) * (1 + moneynessPenalty) * 100;
  }

  /**
   * Calculate volatility hedge ratio based on risk tolerance
   */
  private calculateVolHedgeRatio(riskTolerance: string): number {
    switch (riskTolerance) {
      case 'CONSERVATIVE': return 25;
      case 'MODERATE': return 15;
      case 'AGGRESSIVE': return 10;
      default: return 15;
    }
  }

  /**
   * Calculate currency hedge ratio for international exposure
   */
  private calculateCurrencyHedgeRatio(asset: string): number {
    // Estimate international exposure of asset
    const internationalExposure: { [key: string]: number } = {
      'VEA': 80,    // Developed markets
      'VWO': 90,    // Emerging markets
      'IEFA': 85,   // International developed
      'EEM': 95,    // Emerging markets
      'FXI': 100,   // China
      'EWJ': 100    // Japan
    };
    
    return internationalExposure[asset] || 50; // Default 50% hedge
  }

  /**
   * Check if asset is rate-sensitive
   */
  private isRateSensitive(asset: string): boolean {
    const rateSensitiveAssets = [
      'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'AGG', 'BND',
      'XLF', // Financials are rate-sensitive
      'REITs', 'VNQ' // Real estate
    ];
    
    return rateSensitiveAssets.some(sensitive => 
      asset.includes(sensitive) || sensitive.includes(asset)
    );
  }

  /**
   * Check if asset has international exposure
   */
  private hasInternationalExposure(asset: string): boolean {
    const internationalAssets = [
      'VEA', 'VWO', 'IEFA', 'EEM', 'FXI', 'EWJ', 'INDA', 'ASHR'
    ];
    
    return internationalAssets.some(intl => 
      asset.includes(intl) || intl.includes(asset)
    );
  }

  /**
   * Check if hedge is relevant to primary position
   */
  private isRelevantHedge(
    hedge: HedgingRecommendation,
    position: HedgeParameters['primaryPosition']
  ): boolean {
    // Duration hedges for rate-sensitive assets
    if (hedge.hedgeType === 'DURATION_HEDGE' && this.isRateSensitive(position.asset)) {
      return true;
    }
    
    // Volatility hedges for equity positions
    if (hedge.hedgeType === 'VOLATILITY_HEDGE' && position.assetClass === 'Equities') {
      return true;
    }
    
    // Cross-asset hedges based on asset class
    if (hedge.hedgeType === 'CROSS_ASSET_HEDGE') {
      return hedge.instrument.includes('DXY') || hedge.instrument.includes('GLD');
    }
    
    return false;
  }

  /**
   * Get historical correlations during different Fed regimes
   */
  private getHistoricalCorrelations(): MarketCorrelations {
    return {
      easing: {
        'TLT': { 'SPY': 0.2, 'VIX': -0.6, 'DXY': -0.4, 'GLD': 0.3 },
        'SPY': { 'TLT': 0.2, 'VIX': -0.8, 'DXY': 0.1, 'GLD': -0.1 },
        'DXY': { 'TLT': -0.4, 'SPY': 0.1, 'GLD': -0.7, 'VIX': 0.2 }
      },
      tightening: {
        'TLT': { 'SPY': -0.1, 'VIX': 0.4, 'DXY': -0.6, 'GLD': -0.2 },
        'SPY': { 'TLT': -0.1, 'VIX': -0.7, 'DXY': 0.3, 'GLD': -0.2 },
        'DXY': { 'TLT': -0.6, 'SPY': 0.3, 'GLD': -0.8, 'VIX': 0.1 }
      },
      pivot: {
        'TLT': { 'SPY': 0.5, 'VIX': -0.3, 'DXY': -0.7, 'GLD': 0.6 },
        'SPY': { 'TLT': 0.5, 'VIX': -0.9, 'DXY': -0.2, 'GLD': 0.1 },
        'DXY': { 'TLT': -0.7, 'SPY': -0.2, 'GLD': -0.6, 'VIX': 0.4 }
      },
      shock: {
        'TLT': { 'SPY': 0.8, 'VIX': -0.2, 'DXY': 0.1, 'GLD': 0.7 },
        'SPY': { 'TLT': 0.8, 'VIX': -0.9, 'DXY': 0.4, 'GLD': 0.2 },
        'DXY': { 'TLT': 0.1, 'SPY': 0.4, 'GLD': -0.3, 'VIX': 0.6 }
      }
    };
  }
}