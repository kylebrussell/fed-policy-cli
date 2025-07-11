// /src/services/optionsPositioning.ts

import { 
  OptionsFlow,
  UnusualOptionsActivity,
  DealerPositioning,
  LargePosition,
  VolatilitySkew,
  FOMCEvent
} from '../types/index.js';

export interface SkewAnalysis {
  asset: string;
  daysToFOMC: number;
  currentSkew: number;
  historicalAverage: number;
  skewPercentile: number; // 0-100 percentile rank
  interpretation: string;
  tradingImplication: string;
}

export interface OIAnalysis {
  asset: string;
  totalCallOI: number;
  totalPutOI: number;
  putCallOIRatio: number;
  maxPainLevel: number; // Price with max open interest
  gammaWall: number; // Major gamma concentration level
  significantStrikes: Array<{
    strike: number;
    callOI: number;
    putOI: number;
    netGamma: number;
    significance: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  }>;
}

export interface GammaExposure {
  asset: string;
  spotPrice: number;
  totalGamma: number;
  gammaFlipLevel: number;
  hedgingPressure: 'BUYING' | 'SELLING' | 'NEUTRAL';
  estimatedDailyFlow: number; // MM$ hedging flow
  volatilityImpact: number; // Expected vol impact from hedging
}

export class OptionsPositioningService {
  private historicalSkewData: Map<string, Array<{ date: string; skew: number }>> = new Map();
  private currentPositions: Map<string, OptionsFlow> = new Map();

  constructor() {
    this.initializePositioningData();
  }

  /**
   * Initialize historical options positioning data
   */
  private initializePositioningData(): void {
    const assets = ['SPY', 'TLT', 'QQQ', 'IWM'];
    
    for (const asset of assets) {
      // Initialize skew history
      const skewHistory = this.generateHistoricalSkew(asset);
      this.historicalSkewData.set(asset, skewHistory);

      // Initialize current positions
      const currentFlow = this.generateCurrentOptionsFlow(asset);
      this.currentPositions.set(asset, currentFlow);
    }
  }

  /**
   * Analyze put/call skew leading up to FOMC
   */
  analyzePutCallSkew(asset: string, daysToFOMC: number): SkewAnalysis {
    const currentSkew = this.getCurrentSkew(asset);
    const historicalData = this.historicalSkewData.get(asset) || [];
    
    // Calculate historical average for similar FOMC timing
    const relevantHistory = historicalData.filter(d => 
      this.getDaysToFOMC(d.date) >= daysToFOMC - 2 && 
      this.getDaysToFOMC(d.date) <= daysToFOMC + 2
    );
    
    const historicalAverage = relevantHistory.length > 0 
      ? relevantHistory.reduce((sum, d) => sum + d.skew, 0) / relevantHistory.length
      : 0;

    // Calculate percentile rank
    const allSkews = historicalData.map(d => d.skew).sort((a, b) => a - b);
    const rank = allSkews.findIndex(s => s >= currentSkew);
    const skewPercentile = (rank / allSkews.length) * 100;

    // Generate interpretation
    let interpretation = '';
    let tradingImplication = '';

    if (currentSkew > historicalAverage + 0.5) {
      interpretation = 'Elevated put skew indicates heightened hedging demand and downside protection buying';
      tradingImplication = 'Consider selling put spreads or buying call spreads to fade excessive bearishness';
    } else if (currentSkew < historicalAverage - 0.5) {
      interpretation = 'Compressed put skew suggests complacency and reduced hedging activity';
      tradingImplication = 'Consider buying protective puts or put spreads ahead of potential volatility';
    } else {
      interpretation = 'Skew levels are near historical norms for this FOMC timing';
      tradingImplication = 'Neutral skew suggests balanced positioning, focus on directional strategies';
    }

    return {
      asset,
      daysToFOMC,
      currentSkew,
      historicalAverage,
      skewPercentile,
      interpretation,
      tradingImplication
    };
  }

  /**
   * Track open interest flow and concentrations
   */
  trackOpenInterestFlow(asset: string, strikeRange: number[]): OIAnalysis {
    const optionsFlow = this.currentPositions.get(asset);
    if (!optionsFlow) {
      throw new Error(`No options flow data available for ${asset}`);
    }

    // Aggregate open interest by strikes
    const callOI = optionsFlow.largePositions
      .filter(p => p.type === 'CALL' && strikeRange.includes(p.strike))
      .reduce((sum, p) => sum + p.openInterest, 0);

    const putOI = optionsFlow.largePositions
      .filter(p => p.type === 'PUT' && strikeRange.includes(p.strike))
      .reduce((sum, p) => sum + p.openInterest, 0);

    const putCallOIRatio = callOI > 0 ? putOI / callOI : 0;

    // Calculate max pain (price with maximum open interest)
    const maxPainLevel = this.calculateMaxPain(optionsFlow.largePositions, strikeRange);

    // Find gamma wall (major gamma concentration)
    const gammaWall = this.findGammaWall(optionsFlow.largePositions, strikeRange);

    // Identify significant strikes
    const significantStrikes = this.identifySignificantStrikes(
      optionsFlow.largePositions, 
      strikeRange
    );

    return {
      asset,
      totalCallOI: callOI,
      totalPutOI: putOI,
      putCallOIRatio,
      maxPainLevel,
      gammaWall,
      significantStrikes
    };
  }

  /**
   * Calculate dealer gamma exposure and hedging requirements
   */
  calculateDealerGamma(asset: string, spotPrice: number): GammaExposure {
    const optionsFlow = this.currentPositions.get(asset);
    if (!optionsFlow) {
      throw new Error(`No dealer positioning data available for ${asset}`);
    }

    const dealerPos = optionsFlow.dealerPositioning;
    
    // Estimate gamma flip level (where dealer gamma changes sign)
    const gammaFlipLevel = this.estimateGammaFlip(optionsFlow.largePositions, spotPrice);
    
    // Determine hedging pressure based on spot vs gamma flip
    let hedgingPressure: 'BUYING' | 'SELLING' | 'NEUTRAL';
    if (spotPrice > gammaFlipLevel + (spotPrice * 0.02)) {
      hedgingPressure = 'SELLING'; // Dealers sell as price rises (negative gamma)
    } else if (spotPrice < gammaFlipLevel - (spotPrice * 0.02)) {
      hedgingPressure = 'BUYING'; // Dealers buy as price falls (positive gamma)
    } else {
      hedgingPressure = 'NEUTRAL';
    }

    // Estimate daily hedging flow
    const estimatedDailyFlow = this.calculateDailyHedgingFlow(
      dealerPos.totalGamma, 
      spotPrice, 
      asset
    );

    // Calculate volatility impact from hedging
    const volatilityImpact = this.calculateVolatilityImpact(
      estimatedDailyFlow, 
      asset, 
      hedgingPressure
    );

    return {
      asset,
      spotPrice,
      totalGamma: dealerPos.totalGamma,
      gammaFlipLevel,
      hedgingPressure,
      estimatedDailyFlow,
      volatilityImpact
    };
  }

  /**
   * Monitor unusual options activity around FOMC
   */
  detectUnusualActivity(asset: string, fomcEvent: FOMCEvent): UnusualOptionsActivity[] {
    const optionsFlow = this.currentPositions.get(asset);
    if (!optionsFlow) return [];

    // Filter for unusual activity in the week leading to FOMC
    const unusualTrades = optionsFlow.unusualActivity.filter(activity => {
      const daysSinceActivity = this.daysBetween(activity.volume.toString(), fomcEvent.date);
      return daysSinceActivity <= 7; // Activity within 1 week of FOMC
    });

    // Sort by significance and volume
    return unusualTrades
      .sort((a, b) => {
        const significanceWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const aScore = significanceWeight[a.significance] * a.volume;
        const bScore = significanceWeight[b.significance] * b.volume;
        return bScore - aScore;
      })
      .slice(0, 10); // Top 10 most significant activities
  }

  /**
   * Analyze dealer hedging flow patterns
   */
  analyzeDealerFlow(asset: string, timeWindow: number): {
    avgDailyFlow: number;
    flowDirection: 'BUYING' | 'SELLING' | 'MIXED';
    volatilityImpact: number;
    predictedFlow: number; // Next day predicted flow
  } {
    const optionsFlow = this.currentPositions.get(asset);
    if (!optionsFlow) {
      throw new Error(`No dealer flow data available for ${asset}`);
    }

    // Mock analysis of dealer flow patterns
    const avgDailyFlow = optionsFlow.dealerPositioning.estimatedFlow / timeWindow;
    
    const flowDirection: 'BUYING' | 'SELLING' | 'MIXED' = 
      avgDailyFlow > 50 ? 'BUYING' :
      avgDailyFlow < -50 ? 'SELLING' : 'MIXED';

    const volatilityImpact = Math.abs(avgDailyFlow) * 0.001; // Simplified vol impact

    // Predict next day flow based on current gamma exposure
    const predictedFlow = this.predictNextDayFlow(optionsFlow.dealerPositioning);

    return {
      avgDailyFlow,
      flowDirection,
      volatilityImpact,
      predictedFlow
    };
  }

  /**
   * Helper methods
   */
  private generateHistoricalSkew(asset: string): Array<{ date: string; skew: number }> {
    const skewData: Array<{ date: string; skew: number }> = [];
    const baseSkew = asset === 'SPY' ? -0.15 : asset === 'TLT' ? -0.08 : -0.12;
    
    // Generate 2 years of daily skew data
    for (let i = 0; i < 730; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add noise and FOMC effects
      const fomcEffect = this.getDaysToFOMC(date.toISOString().split('T')[0]) < 5 ? -0.03 : 0;
      const randomNoise = (Math.random() - 0.5) * 0.02;
      
      skewData.push({
        date: date.toISOString().split('T')[0],
        skew: baseSkew + fomcEffect + randomNoise
      });
    }
    
    return skewData;
  }

  private generateCurrentOptionsFlow(asset: string): OptionsFlow {
    const baseRatio = asset === 'SPY' ? 1.25 : asset === 'TLT' ? 0.95 : 1.15;
    
    const unusualActivity: UnusualOptionsActivity[] = [
      {
        asset,
        strike: asset === 'SPY' ? 440 : asset === 'TLT' ? 95 : 350,
        expiration: '2024-12-20',
        type: 'PUT',
        volume: 15000,
        openInterest: 45000,
        impliedVol: 22.5,
        significance: 'HIGH'
      },
      {
        asset,
        strike: asset === 'SPY' ? 450 : asset === 'TLT' ? 100 : 360,
        expiration: '2024-12-20',
        type: 'CALL',
        volume: 8000,
        openInterest: 28000,
        impliedVol: 19.8,
        significance: 'MEDIUM'
      }
    ];

    const dealerPositioning: DealerPositioning = {
      totalGamma: asset === 'SPY' ? -125000 : -85000,
      gammaFlipLevel: asset === 'SPY' ? 442 : asset === 'TLT' ? 97 : 355,
      hedgingPressure: 'SELLING',
      estimatedFlow: -85 // Million dollars
    };

    const largePositions: LargePosition[] = [
      {
        asset,
        strike: asset === 'SPY' ? 445 : asset === 'TLT' ? 98 : 358,
        expiration: '2024-12-20',
        type: 'PUT',
        openInterest: 65000,
        estimatedNotional: 290000000,
        significance: 'Major downside protection'
      },
      {
        asset,
        strike: asset === 'SPY' ? 455 : asset === 'TLT' ? 102 : 365,
        expiration: '2025-01-17',
        type: 'CALL',
        openInterest: 42000,
        estimatedNotional: 190000000,
        significance: 'Large bullish bet'
      }
    ];

    return {
      putCallRatio: baseRatio,
      unusualActivity,
      dealerPositioning,
      largePositions
    };
  }

  private getCurrentSkew(asset: string): number {
    const skewData = this.historicalSkewData.get(asset);
    return skewData?.[0]?.skew || 0; // Most recent skew
  }

  private getDaysToFOMC(date: string): number {
    // Mock calculation - in production, use actual FOMC calendar
    const fomcDate = new Date('2024-12-18');
    const targetDate = new Date(date);
    const diffTime = fomcDate.getTime() - targetDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateMaxPain(positions: LargePosition[], strikeRange: number[]): number {
    // Calculate the strike with maximum total open interest
    const strikePain = new Map<number, number>();
    
    for (const position of positions) {
      if (strikeRange.includes(position.strike)) {
        const currentPain = strikePain.get(position.strike) || 0;
        strikePain.set(position.strike, currentPain + position.openInterest);
      }
    }

    let maxPain = 0;
    let maxPainStrike = strikeRange[0];
    
    strikePain.forEach((pain, strike) => {
      if (pain > maxPain) {
        maxPain = pain;
        maxPainStrike = strike;
      }
    });

    return maxPainStrike;
  }

  private findGammaWall(positions: LargePosition[], strikeRange: number[]): number {
    // Find strike with highest gamma concentration
    // Simplified: assume calls have positive gamma, puts negative
    const gammaByStrike = new Map<number, number>();
    
    for (const position of positions) {
      if (strikeRange.includes(position.strike)) {
        const gamma = position.type === 'CALL' ? position.openInterest : -position.openInterest;
        const currentGamma = gammaByStrike.get(position.strike) || 0;
        gammaByStrike.set(position.strike, currentGamma + gamma);
      }
    }

    let maxGamma = 0;
    let gammaWallStrike = strikeRange[0];
    
    gammaByStrike.forEach((gamma, strike) => {
      if (Math.abs(gamma) > Math.abs(maxGamma)) {
        maxGamma = gamma;
        gammaWallStrike = strike;
      }
    });

    return gammaWallStrike;
  }

  private identifySignificantStrikes(
    positions: LargePosition[], 
    strikeRange: number[]
  ): OIAnalysis['significantStrikes'] {
    const significantStrikes: OIAnalysis['significantStrikes'] = [];
    
    // Group by strike
    const strikeMap = new Map<number, { callOI: number; putOI: number }>();
    
    for (const position of positions) {
      if (strikeRange.includes(position.strike)) {
        const current = strikeMap.get(position.strike) || { callOI: 0, putOI: 0 };
        if (position.type === 'CALL') {
          current.callOI += position.openInterest;
        } else {
          current.putOI += position.openInterest;
        }
        strikeMap.set(position.strike, current);
      }
    }

    // Convert to array and determine significance
    strikeMap.forEach((oi, strike) => {
      const totalOI = oi.callOI + oi.putOI;
      const netGamma = oi.callOI - oi.putOI; // Simplified gamma calculation
      
      let significance: 'CRITICAL' | 'HIGH' | 'MEDIUM';
      if (totalOI > 50000) significance = 'CRITICAL';
      else if (totalOI > 25000) significance = 'HIGH';
      else significance = 'MEDIUM';

      significantStrikes.push({
        strike,
        callOI: oi.callOI,
        putOI: oi.putOI,
        netGamma,
        significance
      });
    });

    return significantStrikes.sort((a, b) => (b.callOI + b.putOI) - (a.callOI + a.putOI));
  }

  private estimateGammaFlip(positions: LargePosition[], spotPrice: number): number {
    // Simplified gamma flip calculation
    // In practice, this would require actual option Greeks
    const nearSpotStrikes = positions
      .map(p => p.strike)
      .filter(strike => Math.abs(strike - spotPrice) / spotPrice < 0.1)
      .sort((a, b) => Math.abs(a - spotPrice) - Math.abs(b - spotPrice));

    return nearSpotStrikes[0] || spotPrice;
  }

  private calculateDailyHedgingFlow(totalGamma: number, spotPrice: number, asset: string): number {
    // Estimate daily hedging flow based on gamma exposure
    // Higher absolute gamma = more hedging required
    const avgDailyMove = asset === 'SPY' ? 10 : asset === 'TLT' ? 0.5 : 8; // Typical daily move
    const hedgingFlow = Math.abs(totalGamma) * avgDailyMove * 0.01; // Convert to millions
    
    return hedgingFlow;
  }

  private calculateVolatilityImpact(hedgingFlow: number, asset: string, pressure: string): number {
    // Estimate vol impact from hedging flow
    const baseImpact = Math.abs(hedgingFlow) / 1000; // Basis points
    const directionMultiplier = pressure === 'NEUTRAL' ? 0.5 : 1.0;
    
    return baseImpact * directionMultiplier;
  }

  private predictNextDayFlow(dealerPos: DealerPositioning): number {
    // Simple prediction based on current positioning
    const momentum = dealerPos.hedgingPressure === 'BUYING' ? 0.8 : 
                    dealerPos.hedgingPressure === 'SELLING' ? -0.8 : 0;
    
    return dealerPos.estimatedFlow * momentum;
  }

  private daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}